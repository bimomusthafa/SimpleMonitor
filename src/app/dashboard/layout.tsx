"use client";

import { useRouter } from "next/navigation";
import { LogOut, Users, Activity } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7fb]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-medical-600 text-white rounded-lg flex items-center justify-center font-bold shadow-md">
            +
          </div>
          <h2 className="font-bold text-gray-800 tracking-tight">RS Bakti Jaya</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <a href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-medical-600 transition-colors font-medium">
            <Activity size={18} /> Monitor Layar Besar
          </a>
          <a href="/dashboard/patients" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-medical-50 text-medical-700 font-bold">
            <Users size={18} /> Kelola Pasien
          </a>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-alert-600 font-bold hover:bg-alert-50 rounded-xl transition-colors"
          >
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
