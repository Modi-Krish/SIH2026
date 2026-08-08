import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
      
      <div className="max-w-3xl text-center space-y-8 z-10">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          Welcome to <span className="gradient-text">SAPLS</span>
        </h1>
        <p className="text-xl text-gray-400">
          Smart Attendance & Personalized Learning System. Automate your classroom with AI and focus on what matters most — education.
        </p>
        
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link href="/login" className="btn-primary">
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
