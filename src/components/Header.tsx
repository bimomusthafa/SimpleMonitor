"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CloudRain, Sun, ThermometerSun } from "lucide-react";

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        
        {/* Logo / Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-medical-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-medical-500/30">
            +
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">RS Bakti Jaya</h1>
            <p className="text-sm text-gray-500 font-medium">IV Monitoring System</p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="hidden md:flex flex-col items-center">
          <div className="text-2xl font-bold text-gray-800 tracking-wider">
            {format(time, "HH:mm:ss")}
          </div>
          <div className="text-sm text-gray-500 font-medium">
            {format(time, "EEEE, dd MMMM yyyy", { locale: id })}
          </div>
        </div>

        {/* Weather Mock */}
        <div className="flex items-center gap-3 bg-medical-50 px-4 py-2 rounded-2xl border border-medical-100">
          <div className="p-2 bg-white rounded-xl shadow-sm text-warning-500">
            <Sun size={24} />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-800">32°C</div>
            <div className="text-xs text-gray-500 font-medium">Cerah Sebagian</div>
          </div>
        </div>
      </div>
    </header>
  );
}
