"use client";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [selectedStudentForPhoto, setSelectedStudentForPhoto] = useState<any>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // New Student Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    collegeId: "",
    departmentId: "",
    semester: 5,
    rollNumber: "",
    section: "A",
    macAddress: "",
  });

  const [departments, setDepartments] = useState<any[]>([]);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState("");

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

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = await ensureAdminToken();
      const res = await fetch("http://localhost:3001/api/v1/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/v1/classroom/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
        if (data.length > 0 && !formData.departmentId) {
          setFormData((prev) => ({ ...prev, departmentId: data[0].id }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch departments", e);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchDepartments();
  }, []);

  const [newStudentPhoto, setNewStudentPhoto] = useState<File | null>(null);

  const handleEditClick = (student: any) => {
    setEditingStudentId(student.id);
    setFormData({
      name: student.user?.name || "",
      email: student.user?.email || "",
      collegeId: student.user?.collegeId || "",
      departmentId: student.departmentId || "",
      semester: student.semester || 5,
      rollNumber: student.rollNumber || "",
      section: student.section || "A",
      macAddress: student.devices?.[0]?.macAddress || "",
    });
    setShowAddModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatusMsg(editingStudentId ? "Updating student profile..." : "Creating student profile...");
      const token = await ensureAdminToken();

      const url = editingStudentId 
        ? `http://localhost:3001/api/v1/students/${editingStudentId}`
        : "http://localhost:3001/api/v1/students";

      const method = editingStudentId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const studentResult = await res.json();
        const targetId = editingStudentId || studentResult?.id;

        // If a photo was selected, upload it immediately
        if (newStudentPhoto && targetId) {
          setStatusMsg("Student profile saved! Extracting ArcFace 512D facial embedding...");
          const fd = new FormData();
          fd.append("photo", newStudentPhoto);

          const photoRes = await fetch(`http://localhost:3001/api/v1/students/${targetId}/photo`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });

          if (photoRes.ok) {
            setStatusMsg("✅ Student profile saved & biometric facial photo enrolled!");
          } else {
            setStatusMsg("⚠️ Student saved, but face photo processing failed.");
          }
        } else {
          setStatusMsg(editingStudentId ? "✅ Student profile updated successfully!" : "✅ Student profile created successfully!");
        }

        setShowAddModal(false);
        setEditingStudentId(null);
        setNewStudentPhoto(null);
        setFormData({
          name: "",
          email: "",
          collegeId: "",
          departmentId: departments[0]?.id || "",
          semester: 5,
          rollNumber: "",
          section: "A",
          macAddress: "",
        });
        fetchStudents();
      } else {
        const err = await res.json();
        setStatusMsg(`❌ Operation Failed: ${err.message || "Failed to save student"}`);
      }
    } catch (e: any) {
      setStatusMsg(`❌ Network Error: ${e.message}`);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectStudent = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds((prev) => [...prev, id]);
    } else {
      setSelectedStudentIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete these ${selectedStudentIds.length} students?`)) return;
    try {
      setStatusMsg("Deleting selected student profiles...");
      const token = await ensureAdminToken();
      const res = await fetch("http://localhost:3001/api/v1/students/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedStudentIds }),
      });
      if (res.ok) {
        setStatusMsg(`✅ Successfully deleted ${selectedStudentIds.length} student profiles!`);
        setSelectedStudentIds([]);
        fetchStudents();
      } else {
        const err = await res.json();
        setStatusMsg(`❌ Bulk Delete Failed: ${err.message || "Failed to delete"}`);
      }
    } catch (e: any) {
      setStatusMsg(`❌ Network Error: ${e.message}`);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student profile?")) return;
    try {
      const token = await ensureAdminToken();
      const res = await fetch(`http://localhost:3001/api/v1/students/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSelectedStudentIds((prev) => prev.filter((item) => item !== id));
        fetchStudents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedStudentForPhoto || !photoFile) return;
    try {
      setStatusMsg("Uploading photo & processing ArcFace 512D embedding...");
      const token = await ensureAdminToken();
      const fd = new FormData();
      fd.append("photo", photoFile);

      const res = await fetch(`http://localhost:3001/api/v1/students/${selectedStudentForPhoto.id}/photo`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg("✅ Photo uploaded & embedding saved successfully!");
        setSelectedStudentForPhoto(null);
        setPhotoFile(null);
      } else {
        setStatusMsg(`❌ Error: ${data.message || "Upload failed"}`);
      }
    } catch (e: any) {
      setStatusMsg(`❌ Error: ${e.message}`);
    }
  };

  const filteredStudents = students.filter(student => {
    const search = searchTerm.toLowerCase();
    return (
      student.user?.name?.toLowerCase().includes(search) ||
      student.user?.email?.toLowerCase().includes(search) ||
      student.user?.collegeId?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex min-h-screen bg-background text-white">
      <Sidebar role="ADMIN" />

      <main className="flex-1 p-8 overflow-y-auto relative">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Student Profile Management</h1>
            <p className="text-gray-400 text-sm mt-1">Manage active student rosters, registration, and biometric facial embeddings.</p>
          </div>
          <button
            onClick={() => {
              setEditingStudentId(null);
              setFormData({
                name: "",
                email: "",
                collegeId: "",
                departmentId: departments[0]?.id || "",
                semester: 5,
                rollNumber: "",
                section: "A",
                macAddress: "",
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-xl text-sm font-semibold transition"
          >
            + Register New Student
          </button>
        </div>

        {statusMsg && (
          <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20 text-sm">
            {statusMsg}
          </div>
        )}

        <div className="flex gap-4 items-center mb-6">
          <input
            type="text"
            placeholder="Search students by name, email, or College ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary transition text-white placeholder-gray-500"
          />
          {selectedStudentIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              🗑️ Delete Selected ({selectedStudentIds.length})
            </button>
          )}
        </div>

        {/* Student Roster Table */}
        <div className="glass-panel overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading student roster...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {searchTerm ? "No students found matching your search." : "No students found."}
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/5 border-b border-white/10 uppercase text-xs text-gray-400">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                      onChange={handleSelectAll}
                      className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0 focus:ring-1"
                    />
                  </th>
                  <th className="px-6 py-4">Name & Email</th>
                  <th className="px-6 py-4">College ID</th>
                  <th className="px-6 py-4">Department / Sem</th>
                  <th className="px-6 py-4">Biometric Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0 focus:ring-1"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{student.user?.name || "N/A"}</div>
                      <div className="text-xs text-gray-400">{student.user?.email || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{student.user?.collegeId || "N/A"}</td>
                    <td className="px-6 py-4">
                      <div>{student.department?.name || "CS"}</div>
                      <div className="text-xs text-gray-500">Semester {student.semester} (Sec {student.section || 'A'})</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedStudentForPhoto(student)}
                        className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs hover:bg-purple-500/30 transition"
                      >
                        📸 Upload Photo
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(student)}
                        className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-500/30 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
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

        {/* Add/Edit Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-panel max-w-md w-full p-6 relative">
              <h3 className="text-xl font-bold mb-4">{editingStudentId ? "Edit Student Details" : "Register New Student"}</h3>
              <form onSubmit={handleSaveStudent} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
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
                  <label className="text-xs text-gray-400">College ID / Roll Number</label>
                  <input
                    type="text"
                    required
                    value={formData.collegeId}
                    onChange={(e) => setFormData({ ...formData, collegeId: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                    placeholder="e.g. STU-2024-999"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Department</label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1e1b29] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="" disabled>Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">Semester</label>
                    <input
                      type="number"
                      required
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">Section</label>
                    <input
                      type="text"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Device MAC Address</label>
                  <input
                    type="text"
                    value={formData.macAddress}
                    onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                    placeholder="e.g. 02:17:06:CD:26:06"
                  />
                </div>

                <div>
                  <label className="text-xs text-purple-300 font-semibold block mb-1">
                    📸 Student Photo (Face Recognition Verification)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewStudentPhoto(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-purple-600/30 file:text-purple-200 border border-purple-500/30 rounded-lg p-1"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Extracts ArcFace 512D biometric embedding for CCTV attendance.
                  </p>
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
                    className="px-4 py-2 bg-primary rounded-lg text-sm font-semibold hover:bg-primary/80"
                  >
                    Save Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Photo Upload Modal */}
        {selectedStudentForPhoto && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-panel max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-2">Upload Biometric Photo</h3>
              <p className="text-xs text-gray-400 mb-4">
                Student: <span className="text-white font-semibold">{selectedStudentForPhoto.user?.name}</span>
              </p>
              
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="mb-4 text-xs text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:bg-primary file:text-white hover:file:bg-primary/80"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedStudentForPhoto(null)}
                  className="px-4 py-2 bg-white/10 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadPhoto}
                  disabled={!photoFile}
                  className="px-4 py-2 bg-purple-600 disabled:bg-gray-600 rounded-lg text-sm font-semibold"
                >
                  Process & Store Embedding
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
