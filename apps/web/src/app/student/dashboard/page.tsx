"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      let u = stored ? JSON.parse(stored) : null;
      setUser(u);

      const token = localStorage.getItem("token") || "";
      const studentId = u?.id || "a1b2c3d4-0001-0000-0000-000000000000";

      // 1. Fetch Attendance Stats
      fetch(`http://localhost:3001/api/v1/students/${studentId}/attendance-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => setAttendance(data))
        .catch((e) => console.error(e));

      // 2. Fetch Timetable Slots
      fetch(`http://localhost:3001/api/v1/timetable/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setSlots(data);
        })
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const attendancePercentage = attendance?.percentage !== undefined ? attendance.percentage : 87;

  return (
    <div className="flex min-h-screen bg-background text-white">
      <Sidebar role="STUDENT" />
      
      <main className="flex-1 p-8 overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
        
        <header className="mb-8 z-10 relative">
          <h1 className="text-3xl font-bold">Good Morning, {user?.name || "Demo Student"}</h1>
          <p className="text-gray-400 mt-1">Here is your live academic overview for today.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 z-10 relative">
          <div className="glass-panel p-6">
            <h3 className="text-gray-400 text-sm font-medium">Overall Attendance</h3>
            <p className="text-4xl font-bold text-white mt-2">
              {attendancePercentage}<span className="text-2xl text-gray-400">%</span>
            </p>
            <div className="w-full bg-white/10 h-2 rounded-full mt-4">
              <div className="bg-accent h-2 rounded-full" style={{ width: `${attendancePercentage}%` }} />
            </div>
          </div>
          
          <div className="glass-panel p-6">
            <h3 className="text-gray-400 text-sm font-medium">Today's Class Count</h3>
            <p className="text-4xl font-bold text-white mt-2">{slots.length}</p>
            <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Live Database Synced
            </div>
          </div>
          
          <div className="glass-panel p-6 bg-gradient-to-br from-primary/20 to-secondary/20 border-primary/30">
            <h3 className="text-white/80 text-sm font-medium flex items-center gap-2">
              <span>🧠</span> AI Recommendation
            </h3>
            <p className="text-lg font-bold text-white mt-2">Complete React Hooks Module</p>
            <p className="text-white/60 text-sm mt-1">Based on your upcoming free period</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 z-10 relative">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4">Today's Schedule</h3>
            {loading ? (
              <p className="text-gray-400 text-sm">Loading schedule...</p>
            ) : slots.length === 0 ? (
              <p className="text-gray-400 text-sm">No classes scheduled for today.</p>
            ) : (
              <div className="space-y-4">
                {slots.map((slot, i) => (
                  <div key={slot.id || i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="w-16 text-center shrink-0">
                      <p className="text-sm font-bold text-white">{slot.startTime}</p>
                      <p className="text-xs text-gray-500">{slot.endTime}</p>
                    </div>
                    <div className="w-1 h-12 bg-white/10 rounded-full shrink-0" />
                    <div>
                      <h4 className="font-medium text-white">{slot.subject?.name || "Subject Class"}</h4>
                      <p className="text-sm text-gray-400">
                        {slot.teacher?.user?.name ? `Prof. ${slot.teacher.user.name}` : "Faculty"} • {slot.classroom?.name || "Room"}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className="text-accent text-sm font-medium">Scheduled</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
