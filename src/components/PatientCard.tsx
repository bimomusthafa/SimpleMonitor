"use client";

import { Activity, AlertTriangle, Droplet, CheckCircle2 } from "lucide-react";

interface PatientCardProps {
  deviceId: string;
  patientName: string;
  room: string;
  flowRate: number;
  dropsCount: number;
  status: "normal" | "warning-fast" | "warning-slow";
}

export default function PatientCard({
  deviceId,
  patientName,
  room,
  flowRate,
  dropsCount,
  status
}: PatientCardProps) {
  
  const isWarning = status !== "normal";
  
  // Dynamic Styles based on status
  const cardBorder = isWarning 
    ? "border-alert-500 shadow-alert-500/20" 
    : "border-medical-200 shadow-medical-900/5";
    
  const statusBg = isWarning ? "bg-alert-50 text-alert-600" : "bg-safe-50 text-safe-500";
  const glowEffect = isWarning ? "animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "";

  return (
    <div className={`bg-white rounded-3xl border-2 p-6 transition-all duration-500 hover:shadow-xl ${cardBorder} ${glowEffect}`}>
      {/* Card Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{patientName}</h2>
          <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-medical-500"></span>
            Kamar: {room}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${statusBg}`}>
          {status === "normal" && <CheckCircle2 size={14} />}
          {isWarning && <AlertTriangle size={14} className={isWarning ? "animate-bounce" : ""} />}
          {status === "warning-fast" ? "Terlalu Cepat" : status === "warning-slow" ? "Tersumbat / Habis" : "Aman"}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Flow Rate */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className={`absolute inset-0 opacity-10 transition-opacity ${isWarning ? 'bg-alert-500' : 'bg-medical-500 group-hover:opacity-20'}`}></div>
          <Activity className={`mb-2 ${isWarning ? 'text-alert-500' : 'text-medical-500'}`} size={24} />
          <div className="text-sm text-gray-500 font-medium mb-1">Kecepatan Tetes</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-black ${isWarning ? 'text-alert-600' : 'text-medical-900'}`}>
              {flowRate}
            </span>
            <span className="text-sm font-semibold text-gray-400">/mnt</span>
          </div>
        </div>

        {/* Total Drops */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col items-center justify-center">
          <Droplet className="text-medical-400 mb-2" size={24} />
          <div className="text-sm text-gray-500 font-medium mb-1">Total Tetesan</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-800">
              {dropsCount.toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">ID: {deviceId}</div>
        </div>
      </div>
    </div>
  );
}
