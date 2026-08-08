from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import random
import time

app = FastAPI(title="SAPLS AI Face Recognition Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_face_cascade():
    try:
        if hasattr(cv2, 'CascadeClassifier') and hasattr(cv2, 'data'):
            return cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    except Exception:
        pass
    return None

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

@app.get("/")
def read_root():
    return {"status": "ok", "service": "SAPLS Python OpenCV Face Recognition Engine"}

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

        gray_frame = cv2.cvtColor(frame_img, cv2.COLOR_BGR2GRAY)
        gray_ref = cv2.cvtColor(ref_img, cv2.COLOR_BGR2GRAY)

        cascade = get_face_cascade()
        faces = []
        if cascade is not None:
            # Relax parameters to detect faces more easily
            faces = cascade.detectMultiScale(gray_frame, scaleFactor=1.05, minNeighbors=3, minSize=(30, 30))

        # IF NO HUMAN FACE DETECTED (e.g. table, charger, empty room, black camera)
        if len(faces) == 0:
            return {
                "face_detected": False,
                "matched": False,
                "confidence": 0,
                "bbox": None,
                "message": "No human face detected in camera feed"
            }

        x, y, w, h = max(faces, key=lambda b: b[2] * b[3])
        face_roi = gray_frame[y:y+h, x:x+w]

        ref_faces = cascade.detectMultiScale(gray_ref, scaleFactor=1.05, minNeighbors=3, minSize=(30, 30)) if cascade else []
        if len(ref_faces) > 0:
            rx, ry, rw, rh = max(ref_faces, key=lambda b: b[2] * b[3])
            ref_roi = gray_ref[ry:ry+rh, rx:rx+rw]
        else:
            ref_roi = gray_ref

        face_roi_resized = cv2.resize(face_roi, (150, 150))
        ref_roi_resized = cv2.resize(ref_roi, (150, 150))

        # Use SIFT Feature Matching for Face Recognition (Much better than Histogram)
        sift = cv2.SIFT_create()
        kp_frame, des_frame = sift.detectAndCompute(face_roi_resized, None)
        kp_ref, des_ref = sift.detectAndCompute(ref_roi_resized, None)
        
        is_match = False
        confidence_pct = 0.0
        
        if des_frame is not None and des_ref is not None and len(des_frame) > 1 and len(des_ref) > 1:
            bf = cv2.BFMatcher()
            matches = bf.knnMatch(des_frame, des_ref, k=2)
            
            good_matches = []
            for match in matches:
                if len(match) == 2:
                    m, n = match
                    if m.distance < 0.75 * n.distance:
                        good_matches.append(m)
            
            match_score = len(good_matches)
            threshold = 12 # 12 good SIFT matches indicates high similarity on 150x150 face
            
            if match_score >= threshold:
                is_match = True
                confidence_pct = min(99.9, 80.0 + (match_score - threshold) * 2.0)
            else:
                is_match = False
                confidence_pct = max(0.0, (match_score / threshold) * 75.0)
        
        confidence_pct = round(confidence_pct, 1)

        return {
            "face_detected": True,
            "matched": is_match,
            "confidence": confidence_pct,
            "bbox": [int(x), int(y), int(w), int(h)],
            "message": "Human face verified against registered photo" if is_match else "Face detected but does not match registered photo"
        }

    except Exception as e:
        return {"face_detected": False, "matched": False, "confidence": 0, "message": str(e)}

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
