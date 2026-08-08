"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ role }: { role: "STUDENT" | "TEACHER" | "ADMIN" }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);
  
  const studentLinks = [
    { name: "Dashboard", href: "/student/dashboard", icon: "📊" },
    { name: "Attendance", href: "/student/attendance", icon: "📅" },
    { name: "Routine", href: "/student/routine", icon: "📋" },
    { name: "Recommendations", href: "/student/recommendations", icon: "🧠" },
  ];
  
  const teacherLinks = [
    { name: "Dashboard", href: "/teacher/dashboard", icon: "📊" },
    { name: "Live Attendance", href: "/teacher/live", icon: "📡" },
    { name: "My Classes", href: "/teacher/classes", icon: "🏫" },
    { name: "Reports", href: "/teacher/reports", icon: "📈" },
  ];

  const adminLinks = [
    { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
    { name: "Students", href: "/admin/students", icon: "🎓" },
    { name: "Teachers", href: "/admin/teachers", icon: "👨‍🏫" },
    { name: "Timetable", href: "/admin/timetable", icon: "🗓️" },
  ];

  const links = role === "STUDENT" ? studentLinks : role === "TEACHER" ? teacherLinks : adminLinks;

  const displayName = user?.name || (role === "STUDENT" ? "Demo Student" : role === "TEACHER" ? "Demo Teacher" : "Demo Admin");
  const displayCollegeId = user?.collegeId || role;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <aside className="w-64 border-r border-white/10 bg-surface/50 backdrop-blur-xl h-screen sticky top-0 flex flex-col hidden md:flex">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold gradient-text">SAPLS</h2>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{role} PORTAL</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? "bg-primary/20 text-primary border border-primary/30" 
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              <span className="font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-[10px] text-gray-400 font-mono truncate">{displayCollegeId}</p>
            <Link href="/login" className="text-xs text-red-400 hover:text-red-300 block mt-0.5">Sign Out</Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
