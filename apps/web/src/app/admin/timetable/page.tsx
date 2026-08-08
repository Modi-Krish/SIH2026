"use client";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";

export default function AdminTimetablePage() {
  const [statusMsg, setStatusMsg] = useState("");
  const [formData, setFormData] = useState({
    subjectId: "a1b2c3d4-0001-0000-0000-000000000000",
    teacherId: "b2c3d4e5-0002-0000-0000-000000000000",
    classroomId: "c3d4e5f6-0003-0000-0000-000000000000",
    departmentId: "d67e8105-88a4-4a49-a292-97b77ad9f086",
    semester: 5,
    section: "A",
    day: "MONDAY",
    startTime: "09:00",
    endTime: "10:00",
  });

  const ensureAdminToken = async () => {
    let token = localStorage.getItem("token");
    let userStr = localStorage.getItem("user");
    let user = userStr ? JSON.parse(userStr) : null;

    if (!token || user?.role !== "ADMIN") {
      try {
        const res = await fetch("http://localhost:3001/api/v1/auth/dev-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN" }),
        });
        const data = await res.json();
        if (data.access_token) {
          token = data.access_token;
          localStorage.setItem("token", data.access_token);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return token || "";
  };

  const handleAssignSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatusMsg("Assigning timetable slot & syncing with faculty and student dashboards...");
      const token = await ensureAdminToken();
      const res = await fetch("http://localhost:3001/api/v1/timetable/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg("✅ Slot assigned & synced across Faculty & Student portals!");
      } else {
        setStatusMsg(`❌ Error: ${data.message || "Assignment failed"}`);
      }
    } catch (e: any) {
      setStatusMsg(`❌ Error: ${e.message}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-white">
      <Sidebar role="ADMIN" />

      <main className="flex-1 p-8 overflow-y-auto relative">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Timetable Assignment Engine</h1>
          <p className="text-gray-400 text-sm mt-1">Assign subject periods to faculty members and sync them instantly with matching student class sections.</p>
        </div>

        {statusMsg && (
          <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20 text-sm">
            {statusMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assignment Form */}
          <div className="glass-panel p-6 lg:col-span-2">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🗓️</span> Assign Class Period
            </h3>

            <form onSubmit={handleAssignSlot} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">Day of Week</label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm bg-surface text-white"
                  >
                    <option value="MONDAY">Monday</option>
                    <option value="TUESDAY">Tuesday</option>
                    <option value="WEDNESDAY">Wednesday</option>
                    <option value="THURSDAY">Thursday</option>
                    <option value="FRIDAY">Friday</option>
                    <option value="SATURDAY">Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Section</label>
                  <input
                    type="text"
                    required
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">Start Time</label>
                  <input
                    type="text"
                    required
                    placeholder="09:00"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">End Time</label>
                  <input
                    type="text"
                    required
                    placeholder="10:00"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs text-gray-400">Subject ID (UUID)</label>
                  <input
                    type="text"
                    required
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Assigned Faculty / Teacher ID (UUID)</label>
                  <input
                    type="text"
                    required
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Classroom ID (UUID)</label>
                  <input
                    type="text"
                    required
                    value={formData.classroomId}
                    onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold text-white transition"
              >
                ⚡ Assign & Sync Timetable
              </button>
            </form>
          </div>

          {/* Sync Information Panel */}
          <div className="glass-panel p-6 border-emerald-500/30 bg-emerald-500/5">
            <h4 className="text-lg font-bold text-emerald-400 mb-2">🔄 Auto-Sync Guarantee</h4>
            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              When an Administrator submits a slot assignment, SAPLS binds the slot to both the assigned faculty member (<code className="text-emerald-300">teacherId</code>) and the entire student cohort matching the <code className="text-emerald-300">departmentId</code>, <code className="text-emerald-300">semester</code>, and <code className="text-emerald-300">section</code>.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="font-bold text-white block">👩‍🏫 Faculty Sync:</span>
                Reflected in <code className="text-blue-300">GET /v1/timetable/teacher/:id</code>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="font-bold text-white block">🎓 Student Sync:</span>
                Reflected in <code className="text-emerald-300">GET /v1/timetable/student/:id</code>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
