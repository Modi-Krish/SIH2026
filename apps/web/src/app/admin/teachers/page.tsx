"use client";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    collegeId: "",
    departmentId: "d67e8105-88a4-4a49-a292-97b77ad9f086", // fallback default
    designation: "Assistant Professor",
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

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const token = await ensureAdminToken();
      const res = await fetch("http://localhost:3001/api/v1/teachers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleEditClick = (teacher: any) => {
    setEditingTeacherId(teacher.id);
    setFormData({
      name: teacher.user?.name || "",
      email: teacher.user?.email || "",
      collegeId: teacher.user?.collegeId || "",
      departmentId: teacher.departmentId || "d67e8105-88a4-4a49-a292-97b77ad9f086",
      designation: teacher.designation || "Assistant Professor",
    });
    setShowAddModal(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatusMsg(editingTeacherId ? "Updating faculty member profile..." : "Creating faculty member profile...");
      const token = await ensureAdminToken();

      const url = editingTeacherId 
        ? `http://localhost:3001/api/v1/teachers/${editingTeacherId}`
        : "http://localhost:3001/api/v1/teachers";

      const method = editingTeacherId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatusMsg(editingTeacherId ? "Faculty member profile updated successfully!" : "Faculty member created successfully!");
        setShowAddModal(false);
        setEditingTeacherId(null);
        setFormData({
          name: "",
          email: "",
          collegeId: "",
          departmentId: "d67e8105-88a4-4a49-a292-97b77ad9f086",
          designation: "Assistant Professor",
        });
        fetchTeachers();
      } else {
        const err = await res.json();
        setStatusMsg(`Error: ${err.message || "Failed to save teacher"}`);
      }
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTeacherIds(teachers.map((t) => t.id));
    } else {
      setSelectedTeacherIds([]);
    }
  };

  const handleSelectTeacher = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTeacherIds((prev) => [...prev, id]);
    } else {
      setSelectedTeacherIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete these ${selectedTeacherIds.length} faculty members?`)) return;
    try {
      setStatusMsg("Deleting selected faculty member profiles...");
      const token = await ensureAdminToken();
      const res = await fetch("http://localhost:3001/api/v1/teachers/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedTeacherIds }),
      });
      if (res.ok) {
        setStatusMsg(`✅ Successfully deleted ${selectedTeacherIds.length} faculty members!`);
        setSelectedTeacherIds([]);
        fetchTeachers();
      } else {
        const err = await res.json();
        setStatusMsg(`❌ Bulk Delete Failed: ${err.message || "Failed to delete"}`);
      }
    } catch (e: any) {
      setStatusMsg(`❌ Network Error: ${e.message}`);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("Are you sure you want to delete this faculty member?")) return;
    try {
      const token = await ensureAdminToken();
      const res = await fetch(`http://localhost:3001/api/v1/teachers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSelectedTeacherIds((prev) => prev.filter((item) => item !== id));
        fetchTeachers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-white">
      <Sidebar role="ADMIN" />

      <main className="flex-1 p-8 overflow-y-auto relative">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Faculty Management</h1>
            <p className="text-gray-400 text-sm mt-1">Manage teaching staff profiles, department assignments, and timetable allocations.</p>
          </div>
          <button
            onClick={() => {
              setEditingTeacherId(null);
              setFormData({
                name: "",
                email: "",
                collegeId: "",
                departmentId: "d67e8105-88a4-4a49-a292-97b77ad9f086",
                designation: "Assistant Professor",
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition"
          >
            + Register Faculty Member
          </button>
        </div>

        {statusMsg && (
          <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20 text-sm">
            {statusMsg}
          </div>
        )}

        {selectedTeacherIds.length > 0 && (
          <div className="mb-6">
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              🗑️ Delete Selected ({selectedTeacherIds.length})
            </button>
          </div>
        )}

        {/* Faculty Roster Table */}
        <div className="glass-panel overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading faculty staff...</div>
          ) : teachers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No faculty members found.</div>
          ) : (
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/5 border-b border-white/10 uppercase text-xs text-gray-400">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={teachers.length > 0 && selectedTeacherIds.length === teachers.length}
                      onChange={handleSelectAll}
                      className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0 focus:ring-1"
                    />
                  </th>
                  <th className="px-6 py-4">Name & Email</th>
                  <th className="px-6 py-4">College ID</th>
                  <th className="px-6 py-4">Department & Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedTeacherIds.includes(teacher.id)}
                        onChange={(e) => handleSelectTeacher(teacher.id, e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0 focus:ring-1"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{teacher.user?.name || "N/A"}</div>
                      <div className="text-xs text-gray-400">{teacher.user?.email || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{teacher.user?.collegeId || "N/A"}</td>
                    <td className="px-6 py-4">
                      <div>{teacher.department?.name || "Computer Science"}</div>
                      <div className="text-xs text-blue-400 font-medium">{teacher.designation || "Assistant Professor"}</div>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(teacher)}
                        className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-500/30 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(teacher.id)}
                        className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/30 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add/Edit Teacher Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-panel max-w-md w-full p-6 relative">
              <h3 className="text-xl font-bold mb-4">{editingTeacherId ? "Edit Faculty Details" : "Register Faculty Member"}</h3>
              <form onSubmit={handleSaveTeacher} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                    placeholder="e.g. Prof. Alan Turing"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">College ID</label>
                  <input
                    type="text"
                    required
                    value={formData.collegeId}
                    onChange={(e) => setFormData({ ...formData, collegeId: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                    placeholder="e.g. TCH-2024-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-500"
                  >
                    Save Faculty
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
