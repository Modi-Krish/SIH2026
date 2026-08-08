"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [role, setRole] = useState("STUDENT");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login delay
    setTimeout(() => {
      if (role === "TEACHER") router.push("/teacher/dashboard");
      else router.push("/student/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="glass-panel w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold gradient-text">Welcome Back</h2>
          <p className="text-gray-400 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">College ID</label>
            <input type="text" className="input-field" placeholder="e.g. STU-2023-001" required />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Password</label>
            <input type="password" className="input-field" placeholder="••••••••" required />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Login As</label>
            <select 
              className="input-field bg-surface text-gray-300"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn-primary w-full flex justify-center items-center h-12"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            ⚡ Quick Dev Login (Testing)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={async () => {
                setIsLoading(true);
                try {
                  const res = await fetch("http://localhost:3001/api/v1/auth/dev-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role: "ADMIN" }),
                  });
                  const data = await res.json();
                  if (data.access_token) {
                    localStorage.setItem("token", data.access_token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                  }
                } catch (e) {
                  console.error(e);
                }
                router.push("/admin/dashboard");
              }}
              className="py-2 px-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-md text-xs font-medium transition"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={async () => {
                setIsLoading(true);
                try {
                  const res = await fetch("http://localhost:3001/api/v1/auth/dev-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role: "TEACHER" }),
                  });
                  const data = await res.json();
                  if (data.access_token) {
                    localStorage.setItem("token", data.access_token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                  }
                } catch (e) {
                  console.error(e);
                }
                router.push("/teacher/dashboard");
              }}
              className="py-2 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-md text-xs font-medium transition"
            >
              Teacher
            </button>
            <button
              type="button"
              onClick={async () => {
                setIsLoading(true);
                try {
                  const res = await fetch("http://localhost:3001/api/v1/auth/dev-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role: "STUDENT" }),
                  });
                  const data = await res.json();
                  if (data.access_token) {
                    localStorage.setItem("token", data.access_token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                  }
                } catch (e) {
                  console.error(e);
                }
                router.push("/student/dashboard");
              }}
              className="py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-md text-xs font-medium transition"
            >
              Student
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
