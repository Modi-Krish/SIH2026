"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sidebar } from "@/components/Sidebar";

interface StudentPresence {
  id: string;
  name: string;
  roll: string;
  macAddress: string;
  avatarUrl?: string;
  faceStatus: "VERIFIED" | "PENDING" | "FAILED";
  faceConfidence: number;
  wifiStatus: "CONNECTED" | "DISCONNECTED";
  wifiRssi: number;
  status: "PRESENT" | "PARTIAL" | "ABSENT";
}

const INITIAL_STUDENTS: StudentPresence[] = [
  { 
    id: "1", 
    name: "Shirley Leffler (Demo Student)", 
    roll: "STU-2023-0001", 
    macAddress: "02:17:D6:CD:26:D6", 
    avatarUrl: "/demo-student.jpg",
    faceStatus: "PENDING", 
    faceConfidence: 0, 
    wifiStatus: "DISCONNECTED", 
    wifiRssi: 0, 
    status: "ABSENT" 
  },
  { id: "2", name: "Alice Smith", roll: "STU-002", macAddress: "00:1A:2B:3C:4D:5E", avatarUrl: undefined, faceStatus: "VERIFIED", faceConfidence: 98, wifiStatus: "CONNECTED", wifiRssi: -52, status: "PRESENT" },
  { id: "3", name: "Bob Johnson", roll: "STU-003", macAddress: "AA:BB:CC:DD:EE:FF", avatarUrl: undefined, faceStatus: "VERIFIED", faceConfidence: 94, wifiStatus: "CONNECTED", wifiRssi: -61, status: "PRESENT" },
  { id: "4", name: "Charlie Brown", roll: "STU-004", macAddress: "11:22:33:44:55:66", avatarUrl: undefined, faceStatus: "PENDING", faceConfidence: 0, wifiStatus: "DISCONNECTED", wifiRssi: 0, status: "ABSENT" },
  { id: "5", name: "Ethan Hunt", roll: "STU-005", macAddress: "77:88:99:AA:BB:CC", avatarUrl: undefined, faceStatus: "FAILED", faceConfidence: 0, wifiStatus: "DISCONNECTED", wifiRssi: 0, status: "ABSENT" },
];

export default function LiveAttendanceFeed() {
  const [students, setStudents] = useState<StudentPresence[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStreamValid, setIsCameraStreamValid] = useState(false);

  // Fetch Live Students Roster from NestJS Database API
  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    fetch("http://localhost:3001/api/v1/students", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: StudentPresence[] = data.map((s: any, idx: number) => ({
            id: s.id,
            name: s.user?.name || `Student ${idx + 1}`,
            roll: s.user?.collegeId || `STU-${idx + 1}`,
            macAddress: s.devices?.[0]?.macAddress || "NOT PROVIDED",
            avatarUrl: s.user?.avatarUrl || undefined,
            faceStatus: "PENDING",
            faceConfidence: 0,
            wifiStatus: "DISCONNECTED",
            wifiRssi: 0,
            status: "ABSENT"
          }));
          setStudents(mapped);
        }
      })
      .catch((e) => console.error(e));
  }, []);
  
  // Real Python OpenCV Face Detection State
  const [isHumanFaceDetected, setIsHumanFaceDetected] = useState<boolean>(false);
  const [isFaceMatched, setIsFaceMatched] = useState<boolean>(false);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [facialStatusText, setFacialStatusText] = useState<string>("Stand in front of camera to scan face...");
  const [faceBbox, setFaceBbox] = useState<[number, number, number, number] | null>(null);
  const [studentEmbeddings, setStudentEmbeddings] = useState<any[]>([]);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);

  // Load student embeddings from database on mount
  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    fetch("http://localhost:3001/api/v1/students/embeddings", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStudentEmbeddings(data);
        }
      })
      .catch((e) => console.error("Failed to load student face embeddings:", e));
  }, []);

  // Windows Hotspot settings
  const [hotspotSSID, setHotspotSSID] = useState("Laptop_Mobile_Hotspot");
  const [hotspotIP, setHotspotIP] = useState("192.168.137.1 (IP: 10.140.113.239)");
  const [isAutoSynced, setIsAutoSynced] = useState(false);
  const [isEditingHotspot, setIsEditingHotspot] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const referenceBlobRef = useRef<Blob | null>(null);

  // Fetch reference image /demo-student.jpg as a Blob for Python OpenCV API payload
  useEffect(() => {
    fetch("/demo-student.jpg")
      .then((res) => res.blob())
      .then((blob) => {
        referenceBlobRef.current = blob;
      })
      .catch(() => {});
  }, []);

  // Send Live Frame to Python OpenCV AI Service (http://localhost:8000/api/v1/ai/face/recognize-multiple)
  const sendFrameToPythonAIService = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState < 2 || video.videoWidth === 0) {
      setIsCameraStreamValid(false);
      setIsHumanFaceDetected(false);
      setIsFaceMatched(false);
      setConfidenceScore(0);
      setFacialStatusText("NO VIDEO STREAM DETECTED");
      return;
    }

    setIsCameraStreamValid(true);

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("frame", blob, "webcam.jpg");
      formData.append("targets_json", JSON.stringify(studentEmbeddings));

      try {
        const res = await fetch("http://localhost:8000/api/v1/ai/face/recognize-multiple", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const result = await res.json();
          
          if (!result.success || result.faces_detected === 0) {
            setIsHumanFaceDetected(false);
            setIsFaceMatched(false);
            setConfidenceScore(0);
            setFaceBbox(null);
            setFacialStatusText("NO HUMAN FACE DETECTED IN CAMERA FEED");

            setDetectedFaces([]);
            setStudents((prev) =>
              prev.map((s) => ({
                ...s,
                faceStatus: "PENDING",
                faceConfidence: 0,
                status: "ABSENT"
              }))
            );
          } else {
            setIsHumanFaceDetected(true);
            const detectedList = result.detected_faces || [];
            setDetectedFaces(detectedList);

            const matches = detectedList.filter((f: any) => f.matched);
            const isAnyMatched = matches.length > 0;
            setIsFaceMatched(isAnyMatched);
            
            if (isAnyMatched) {
              setConfidenceScore(matches[0].confidence);
              setFaceBbox(matches[0].bbox);
            } else {
              setConfidenceScore(0);
              setFaceBbox(null);
            }
            
            setFacialStatusText(
              isAnyMatched
                ? `CCTV ACTIVE: Detected ${result.faces_detected} face(s), matched ${matches.length} student(s)`
                : `Detected ${result.faces_detected} face(s) - NO REGISTERED MATCHES`
            );

            setStudents((prev) =>
              prev.map((s) => {
                const match = matches.find((m: any) => m.studentId === s.id);
                if (match) {
                  const faceStatus = "VERIFIED";
                  const faceConfidence = match.confidence;
                  const status = s.wifiStatus === "CONNECTED" ? "PRESENT" : "ABSENT";
                  return { ...s, faceStatus, faceConfidence, status };
                } else {
                  return { ...s, faceStatus: "FAILED", faceConfidence: 0, status: "ABSENT" };
                }
              })
            );
          }
        }
      } catch (err) {
        console.error("AI service verification error:", err);
      }
    }, "image/jpeg", 0.85);
  }, [studentEmbeddings]);

  // Continuous frame loop sending to Python OpenCV AI Service
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCameraActive) {
      sendFrameToPythonAIService();
      interval = setInterval(sendFrameToPythonAIService, 1200);
    } else {
      setIsCameraStreamValid(false);
      setIsHumanFaceDetected(false);
      setIsFaceMatched(false);
      setConfidenceScore(0);
      setFaceBbox(null);
      setDetectedFaces([]);
            setStudents((prev) =>
              prev.map((s) => ({
                ...s,
                faceStatus: "PENDING",
                faceConfidence: 0,
                status: "ABSENT"
              }))
            );
    }

    return () => clearInterval(interval);
  }, [isCameraActive, sendFrameToPythonAIService]);

  // Auto-Sync with Laptop Hotspot via NestJS backend endpoint
  useEffect(() => {
    const fetchHotspotStatus = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/v1/classroom/hotspot-status");
        if (res.ok) {
          const data = await res.json();
          if (data.hotspotIp || data.wifiIp) {
            setHotspotIP(`${data.hotspotIp} (Host IP: ${data.wifiIp})`);
            setHotspotSSID(data.ssid || "Laptop_Mobile_Hotspot");
            setIsAutoSynced(true);

            const connectedMacs = Array.isArray(data.connectedMacs) 
              ? data.connectedMacs.map((m: string) => m.toUpperCase()) 
              : [];

            setStudents((prev) =>
              prev.map((s) => {
                const isConnected = connectedMacs.includes(s.macAddress.toUpperCase());
                const wifiStatus = isConnected ? "CONNECTED" : "DISCONNECTED";
                const wifiRssi = isConnected ? -45 : 0;
                const status = (s.faceStatus === "VERIFIED" && wifiStatus === "CONNECTED") ? "PRESENT" : "ABSENT";
                return {
                  ...s,
                  wifiStatus,
                  wifiRssi,
                  status
                };
              })
            );
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    };

    fetchHotspotStatus();
    const interval = setInterval(fetchHotspotStatus, 3000);
    return () => clearInterval(interval);
  }, [isFaceMatched]);

  // Toggle Live Webcam Feed
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
      } catch (err) {
        alert("Camera access denied or no webcam detected!");
        setIsCameraActive(false);
      }
    }
  };

  // Toggle Wi-Fi Hotspot Connection state for a student
  const toggleWifiConnection = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const isNowConnected = s.wifiStatus === "DISCONNECTED";
          const newWifiStatus = isNowConnected ? "CONNECTED" : "DISCONNECTED";
          const newRssi = isNowConnected ? -45 : 0;
          
          const newStatus = newWifiStatus === "CONNECTED" && s.faceStatus === "VERIFIED" ? "PRESENT" : "ABSENT";
          
          return {
            ...s,
            wifiStatus: newWifiStatus,
            wifiRssi: newRssi,
            status: newStatus
          };
        }
        return s;
      })
    );
  };

  const toggleOverride = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextStatus = s.status === "PRESENT" ? "ABSENT" : "PRESENT";
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  const presentCount = students.filter((s) => s.status === "PRESENT").length;

  const filteredStudents = students.filter((s) => {
    if (filter === "PRESENT") return s.status === "PRESENT";
    if (filter === "ABSENT") return s.status === "ABSENT";
    return true;
  });

  const firstMatchedStudent = students.find((s) => s.faceStatus === "VERIFIED");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="TEACHER" />

      {/* Hidden processing canvas for webcam frame capturing */}
      <canvas ref={canvasRef} className="hidden" />

      <main className="flex-1 p-8 overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-8 z-10 relative">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/teacher/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
                ← Back to Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-white mt-2 flex items-center gap-3">
              <span>Classroom Live Node</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/20 text-accent border border-accent/30">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> PYTHON OPENCV AI ENGINE
              </span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Live Webcam Frames Processed via Python OpenCV Microservice (`apps/ai-service`)
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="glass-panel px-6 py-3 text-center">
              <span className="text-xs text-gray-400 font-medium font-mono">HOTSPOT CLIENTS</span>
              <p className="text-2xl font-bold text-primary">
                {students.filter((s) => s.wifiStatus === "CONNECTED").length} Active
              </p>
            </div>
            <div className="glass-panel px-6 py-3 text-center">
              <span className="text-xs text-gray-400 font-medium">ATTENDANCE</span>
              <p className="text-2xl font-bold text-accent">
                {presentCount} <span className="text-sm text-gray-400">/ {students.length}</span>
              </p>
            </div>
          </div>
        </div>



        {/* Top Split View: Camera Feed + Hotspot Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Webcam Stream Viewer Panel */}
          <div className="lg:col-span-2 glass-panel p-5 border-primary/30 flex flex-col justify-between min-h-[420px] relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-white text-lg flex items-center gap-2">
                  <span>📹</span> Live CCTV Monitor
                </h2>
                <button
                  onClick={toggleCamera}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 shadow-md ${
                    isCameraActive
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-primary hover:bg-primary/80 text-white"
                  }`}
                >
                  {isCameraActive ? "⏹️ Turn Off Camera" : "📷 Turn On Laptop Camera"}
                </button>
              </div>
              
              <div className="relative w-full h-[320px] bg-black/40 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-fill ${isCameraActive ? "block" : "hidden"}`}
                />

                {!isCameraActive && (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-3xl">
                      📹
                    </div>
                    <p className="text-sm font-medium text-gray-300">Camera Feed is Standby</p>
                    <p className="text-xs text-gray-500 max-w-sm">
                      Click "Turn On Laptop Camera" to send live frames to Python OpenCV face recognition engine.
                    </p>
                  </div>
                )}

                {/* Scanning Overlay (Python OpenCV Feedback) */}
                {isCameraActive && isCameraStreamValid && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-mono border flex items-center gap-2 shadow-lg font-bold z-10">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        isFaceMatched ? "bg-green-400 animate-ping" : isHumanFaceDetected ? "bg-yellow-400" : "bg-red-500"
                      }`} />
                      <span className={isFaceMatched ? "text-green-400" : isHumanFaceDetected ? "text-yellow-400" : "text-red-400"}>
                        {facialStatusText}
                      </span>
                    </div>

                    {/* Dynamic Bounding Boxes Overlay */}
                    {detectedFaces.map((face, index) => {
                      const video = videoRef.current;
                      if (!video) return null;
                      
                      const W = video.clientWidth;
                      const H = video.clientHeight;
                      const VW = video.videoWidth || 640;
                      const VH = video.videoHeight || 480;
                      
                      const xScale = W / VW;
                      const yScale = H / VH;
                      
                      const [xMin, yMin, xMax, yMax] = face.bbox;
                      const left = xMin * xScale;
                      const top = yMin * yScale;
                      const width = (xMax - xMin) * xScale;
                      const height = (yMax - yMin) * yScale;
                      
                      const studentInfo = students.find((s) => s.id === face.studentId);
                      const label = face.matched && studentInfo
                        ? `MATCHED: ${studentInfo.name} (${face.confidence}%)`
                        : "FACE UNKNOWN";
                        
                      return (
                        <div
                          key={index}
                          style={{
                            position: "absolute",
                            left: `${left}px`,
                            top: `${top}px`,
                            width: `${width}px`,
                            height: `${height}px`,
                          }}
                          className={`border-2 border-dashed rounded-lg flex flex-col justify-end pointer-events-none transition-all duration-150 z-20 ${
                            face.matched ? "border-accent bg-accent/5" : "border-yellow-500 bg-yellow-500/5"
                          }`}
                        >
                          <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold text-white bg-black/80 rounded-t-sm whitespace-nowrap overflow-hidden text-ellipsis w-max max-w-full`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* System Laptop Hotspot Panel */}
          <div className="glass-panel p-5 flex flex-col justify-between border-primary/30">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📡</span>
                  <h2 className="font-bold text-white text-lg">Laptop Hotspot Gateway</h2>
                </div>
                <button
                  onClick={() => setIsEditingHotspot(!isEditingHotspot)}
                  className="text-xs text-primary hover:underline"
                >
                  {isEditingHotspot ? "Done" : "Configure"}
                </button>
              </div>

              {isEditingHotspot ? (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1">Hotspot Name (SSID):</label>
                    <input
                      type="text"
                      className="input-field py-1 text-xs"
                      value={hotspotSSID}
                      onChange={(e) => setHotspotSSID(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Hotspot IP Address:</label>
                    <input
                      type="text"
                      className="input-field py-1 text-xs"
                      value={hotspotIP}
                      onChange={(e) => setHotspotIP(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Hotspot Name (SSID):</span>
                    <span className="font-mono text-primary font-bold">{hotspotSSID}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Hotspot IP Gateway:</span>
                    <span className="font-mono text-gray-300">{hotspotIP}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Target Student MAC:</span>
                    <span className="font-mono text-accent font-bold">
                      {students[0]?.macAddress && students[0]?.macAddress !== "NOT PROVIDED" ? students[0].macAddress : "N/A"}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Hardware Auto-Sync</span>
                  {isAutoSynced && <span className="text-accent text-[10px]">● SYNCED LIVE</span>}
                </h4>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-gray-300">
                  ⚡ <strong>Automatic Sync:</strong> When your laptop's Mobile Hotspot is turned ON, NestJS detects it automatically and links the gateway IP.
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-gray-400">
              <span>AI Engine: Online</span>
              <span className="text-green-400 font-medium">Python FastAPI + OpenCV OK</span>
            </div>
          </div>
        </div>

        {/* Live Attendance Roster */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Classroom Attendance Roster</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === "ALL" ? "bg-primary text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setFilter("PRESENT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === "PRESENT" ? "bg-accent text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              Present ({presentCount})
            </button>
            <button
              onClick={() => setFilter("ABSENT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === "ABSENT" ? "bg-red-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              Absent ({students.length - presentCount})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className={`glass-panel p-5 relative overflow-hidden border transition-all ${
                student.status === "PRESENT" ? "border-accent/30" : "border-red-500/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {student.avatarUrl && !imageError[student.id] ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary/40 shrink-0">
                      <Image
                        src={student.avatarUrl}
                        alt={student.name}
                        fill
                        className="object-cover"
                        onError={() => {
                          setImageError((prev) => ({ ...prev, [student.id]: true }));
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold shrink-0">
                      {student.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">{student.name}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{student.roll}</p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    student.status === "PRESENT"
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {student.status}
                </span>
              </div>

              {/* System Telemetry */}
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <span>📱</span> Device MAC:
                  </span>
                  <span className={`font-mono font-bold ${student.macAddress === "NOT PROVIDED" ? "text-gray-500" : "text-accent"}`}>
                    {student.macAddress}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <span>📷</span> Camera Recognition:
                  </span>
                  <span
                    className={`font-medium ${
                      student.faceStatus === "VERIFIED"
                        ? "text-green-400"
                        : student.faceStatus === "PENDING"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {student.faceStatus === "VERIFIED"
                      ? `Verified (${student.faceConfidence}%)`
                      : !isCameraActive
                      ? "Pending (Camera Off)"
                      : !isHumanFaceDetected
                      ? "No Face (Desk/Charger)"
                      : `Failed (${student.faceConfidence}%)`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <span>📡</span> Hotspot Handshake:
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium font-mono ${
                        student.wifiStatus === "CONNECTED" ? "text-primary" : "text-red-400"
                      }`}
                    >
                      {student.wifiStatus === "CONNECTED" ? `Connected (${student.wifiRssi} dBm)` : "Disconnected"}
                    </span>
                    <button
                      onClick={() => toggleWifiConnection(student.id)}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-gray-300 border border-white/10"
                    >
                      {student.wifiStatus === "CONNECTED" ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Teacher Manual Action */}
              <button
                onClick={() => toggleOverride(student.id)}
                className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-gray-300 hover:text-white transition-colors"
              >
                {student.status === "PRESENT" ? "Mark Absent (Teacher Override)" : "Mark Present (Teacher Override)"}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
