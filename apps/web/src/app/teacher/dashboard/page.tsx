"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      let u = stored ? JSON.parse(stored) : null;
      setUser(u);

      const token = localStorage.getItem("token") || "";
      const teacherId = u?.id || "b2c3d4e5-0002-0000-0000-000000000000";

      fetch(`http://localhost:3001/api/v1/timetable/teacher/${teacherId}`, {
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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="TEACHER" />
      
      <main className="flex-1 p-8 overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />
        
        <header className="mb-8 z-10 relative">
          <h1 className="text-3xl font-bold text-white">Welcome, {user?.name || "Demo Faculty"}</h1>
          <p className="text-gray-400 mt-1">Overview of your synchronized assigned classes and student engagement today.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 z-10 relative">
          <div className="glass-panel p-6">
            <h3 className="text-gray-400 text-sm font-medium">Assigned Classes Today</h3>
            <p className="text-4xl font-bold text-white mt-2">{slots.length}</p>
            <div className="mt-3 flex gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-400">Live Synced</span>
            </div>
          </div>
          
          <div className="glass-panel p-6">
            <h3 className="text-gray-400 text-sm font-medium">Average Attendance</h3>
            <p className="text-4xl font-bold text-white mt-2">94<span className="text-2xl text-gray-400">%</span></p>
            <div className="w-full bg-white/10 h-2 rounded-full mt-4">
              <div className="bg-primary h-2 rounded-full" style={{ width: '94%' }} />
            </div>
          </div>
          
          <div className="glass-panel p-6 border-accent/30 bg-accent/5">
            <h3 className="text-accent text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Live Attendance Node
            </h3>
            <p className="text-lg font-bold text-white mt-2">Classroom Node Active</p>
            <p className="text-white/60 text-sm mt-1">RTSP Camera & Hotspot Handshake Online</p>
            <Link href="/teacher/live" className="mt-4 block text-center px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg text-sm font-medium text-white transition-colors w-full">
              Launch Live Camera Node
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 z-10 relative">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4">Assigned Timetable Schedule</h3>
            {loading ? (
              <p className="text-gray-400 text-sm">Loading schedule...</p>
            ) : slots.length === 0 ? (
              <p className="text-gray-400 text-sm">No classes assigned for today.</p>
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
                      <h4 className="font-medium text-white">{slot.subject?.name || "Subject Period"}</h4>
                      <p className="text-sm text-gray-400">
                        {slot.classroom?.name || "Classroom"} • Semester {slot.semester} (Sec {slot.section || "A"})
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className="px-2 py-1 text-xs font-semibold bg-primary/20 text-primary border border-primary/30 rounded-md">
                        {slot.day}
                      </span>
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
