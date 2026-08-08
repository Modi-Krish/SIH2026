from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import random
import time
import insightface
from insightface.app import FaceAnalysis

app = FastAPI(title="SAPLS AI Face Recognition Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize InsightFace model
# This will download the models to ~/.insightface/models/ on first run if not present
# buffalo_l includes SCRFD (detection) and ArcFace (recognition)
face_app = FaceAnalysis(name='buffalo_l', root='./models', providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))

class RecommendationRequest(BaseModel):
    student_id: str
    career_goal: str
    skills: list[str]
    interests: list[str]
    free_period_duration: int = 60

RESOURCE_DB = {
    "Software Engineer": [
        {"title": "System Design: Client Server Architecture", "category": "YOUTUBE", "url": "https://youtube.com/watch?v=example", "duration": 20, "difficulty": "INTERMEDIATE"},
        {"title": "Two Sum - LeetCode", "category": "CODING_PRACTICE", "url": "https://leetcode.com/problems/two-sum/", "duration": 45, "difficulty": "EASY"},
        {"title": "React Hooks In Depth", "category": "COURSE", "url": "https://coursera.org", "duration": 60, "difficulty": "INTERMEDIATE"},
    ]
}

def compute_cosine_similarity(emb1, emb2):
    dot_product = np.dot(emb1, emb2)
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    return float(dot_product / (norm1 * norm2))

@app.get("/")
def read_root():
    return {"status": "ok", "service": "SAPLS Python InsightFace Recognition Engine"}

@app.post("/api/v1/ai/face/match")
async def match_face(
    frame: UploadFile = File(...),
    reference: UploadFile = File(...)
):
    try:
        frame_bytes = await frame.read()
        ref_bytes = await reference.read()

        frame_img = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)
        ref_img = cv2.imdecode(np.frombuffer(ref_bytes, np.uint8), cv2.IMREAD_COLOR)

        if frame_img is None or ref_img is None:
            return {"face_detected": False, "matched": False, "confidence": 0, "message": "Invalid image payload"}

        # Detect faces in the reference image
        ref_faces = face_app.get(ref_img)
        if len(ref_faces) == 0:
            return {"face_detected": False, "matched": False, "confidence": 0, "message": "No human face detected in reference image"}
        
        # Take the largest face in the reference image (assuming it's the person of interest)
        ref_face = max(ref_faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))

        # Detect faces in the camera frame
        frame_faces = face_app.get(frame_img)
        if len(frame_faces) == 0:
            return {
                "face_detected": False,
                "matched": False,
                "confidence": 0,
                "bbox": None,
                "message": "No human face detected in camera feed"
            }

        # Take the largest face in the camera frame for matching against reference
        frame_face = max(frame_faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))

        # Check for minimum face size and quality (example thresholds)
        face_width = frame_face.bbox[2] - frame_face.bbox[0]
        face_height = frame_face.bbox[3] - frame_face.bbox[1]
        if face_width < 80 or face_height < 80:
            return {
                "face_detected": True,
                "matched": False,
                "confidence": 0,
                "bbox": frame_face.bbox.astype(int).tolist(),
                "message": "FACE_TOO_SMALL"
            }

        if frame_face.det_score < 0.5:
            return {
                "face_detected": True,
                "matched": False,
                "confidence": 0,
                "bbox": frame_face.bbox.astype(int).tolist(),
                "message": "LOW_CONFIDENCE"
            }

        # Calculate Cosine Similarity
        similarity = compute_cosine_similarity(frame_face.normed_embedding, ref_face.normed_embedding)
        
        # Threshold for ArcFace (typically ~0.45 for a match)
        match_threshold = 0.45
        
        is_match = similarity >= match_threshold
        
        # Map similarity to a confidence percentage
        if is_match:
            confidence_pct = 80.0 + ((similarity - match_threshold) / (1.0 - match_threshold)) * 20.0
        else:
            confidence_pct = max(0.0, (similarity / match_threshold) * 80.0)

        confidence_pct = round(confidence_pct, 1)
        
        # InsightFace bbox format is [x1, y1, x2, y2]
        bbox = frame_face.bbox.astype(int).tolist()

        return {
            "face_detected": True,
            "matched": is_match,
            "confidence": confidence_pct,
            "similarity": float(similarity),
            "bbox": bbox,
            "message": "Human face verified against registered photo" if is_match else "Face detected but does not match registered photo"
        }

    except Exception as e:
        return {"face_detected": False, "matched": False, "confidence": 0, "message": str(e)}

@app.post("/api/v1/ai/face/enroll")
async def enroll_face(
    image: UploadFile = File(...)
):
    try:
        image_bytes = await image.read()
        img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)

        if img is None:
            return {"success": False, "message": "Invalid image payload"}

        faces = face_app.get(img)
        if len(faces) == 0:
            return {"success": False, "message": "No human face detected"}
            
        # Select the largest face for enrollment
        face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))
        
        # Quality checks
        face_width = face.bbox[2] - face.bbox[0]
        face_height = face.bbox[3] - face.bbox[1]
        
        if face_width < 100 or face_height < 100:
            return {"success": False, "message": "FACE_TOO_SMALL", "embedding": None}
            
        if face.det_score < 0.6:
            return {"success": False, "message": "LOW_CONFIDENCE", "embedding": None}
            
        embedding = face.normed_embedding.tolist()
        
        return {
            "success": True,
            "message": "Face embedding generated successfully",
            "embedding": embedding
        }

    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/api/v1/ai/face/recognize-multiple")
async def recognize_multiple(
    frame: UploadFile = File(...),
    targets_json: str = Form(...)
):
    try:
        import json
        targets = json.loads(targets_json)
        
        frame_bytes = await frame.read()
        frame_img = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame_img is None:
            return {"success": False, "message": "Invalid frame image", "faces_detected": 0, "matches": []}

        frame_faces = face_app.get(frame_img)
        if len(frame_faces) == 0:
            return {"success": True, "faces_detected": 0, "matches": []}

        matches = []
        
        # Loop through all detected faces in the camera frame
        for face in frame_faces:
            face_emb = face.normed_embedding
            best_match_id = None
            best_similarity = -1.0
            
            # Compare this face with all target embeddings
            for target in targets:
                target_emb = np.array(target["embedding"])
                similarity = compute_cosine_similarity(face_emb, target_emb)
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match_id = target["studentId"] # Match key with NestJS model
            
            # If the best match is above threshold, record it
            match_threshold = 0.45
            if best_similarity >= match_threshold:
                confidence_pct = 80.0 + ((best_similarity - match_threshold) / (1.0 - match_threshold)) * 20.0
                matches.append({
                    "studentId": best_match_id,
                    "confidence": round(confidence_pct, 1),
                    "similarity": best_similarity,
                    "bbox": face.bbox.astype(int).tolist()
                })
                
        return {
            "success": True,
            "faces_detected": len(frame_faces),
            "matches": matches
        }
    except Exception as e:
        return {"success": False, "message": str(e), "faces_detected": 0, "matches": []}

@app.post("/api/v1/ai/recommendations")
async def generate_recommendations(req: RecommendationRequest):
    resources = RESOURCE_DB.get(req.career_goal, RESOURCE_DB["Software Engineer"])
    viable_resources = [r for r in resources if r["duration"] <= req.free_period_duration]
    if not viable_resources:
        viable_resources = [resources[0]]
    random.shuffle(viable_resources)
    return {
        "student_id": req.student_id,
        "timestamp": int(time.time()),
        "context_duration": req.free_period_duration,
        "recommendations": viable_resources[:2]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
