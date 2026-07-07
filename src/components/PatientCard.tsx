"use client";

import { useState, useEffect } from "react";
import { 
  Activity, 
  AlertTriangle, 
  Droplet, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Heart, 
  Maximize2, 
  X 
} from "lucide-react";

interface PatientCardProps {
  deviceId: string;
  patientName: string;
  room: string;
  flowRate: number;
  dropsCount: number;
  status: "normal" | "warning-fast" | "warning-slow";
  illness?: string;
  condition?: string;
  createdAt: string;
}

export default function PatientCard({
  deviceId,
  patientName,
  room,
  flowRate,
  dropsCount,
  status,
  illness = "Tidak ditentukan",
  condition = "Stabil",
  createdAt
}: PatientCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time for elapsed calculation every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const isWarning = status !== "normal";

  // Dynamic Styles based on status
  const cardBorder = isWarning 
    ? "border-alert-500 shadow-alert-500/20 hover:shadow-alert-500/30" 
    : "border-medical-200 shadow-medical-900/5 hover:shadow-medical-900/10";
    
  const statusBg = isWarning ? "bg-alert-50 text-alert-600" : "bg-safe-50 text-safe-500";
  const glowEffect = isWarning ? "animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "";

  // 1 infusion = 1000ml. Standard macro factor = 20 drops/mL.
  // Total drops in a bag = 1000 * 20 = 20,000 drops.
  const totalVolume = 1000; // mL
  const dropFactor = 20; // drops/mL
  
  // Volume infused
  const infusedVolume = dropsCount / dropFactor;
  // Remaining volume
  const remainingVolume = Math.max(0, totalVolume - infusedVolume);
  // Remaining percentage
  const remainingPercentage = (remainingVolume / totalVolume) * 100;

  // Time remaining calculation
  let remainingHours = 0;
  let remainingMinutes = 0;
  let hasInfusionStopped = flowRate <= 0;

  if (flowRate > 0) {
    const totalRemainingMins = remainingVolume / (flowRate / dropFactor);
    remainingHours = Math.floor(totalRemainingMins / 60);
    remainingMinutes = Math.floor(totalRemainingMins % 60);
  }

  // Elapsed time calculation
  const elapsedMs = Math.max(0, currentTime - new Date(createdAt).getTime());
  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const elapsedMinutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <>
      {/* Small Card (Interactive) */}
      <div 
        onClick={() => setIsOpen(true)}
        className={`bg-white rounded-3xl border-2 p-6 transition-all duration-500 hover:scale-[1.02] cursor-pointer relative overflow-hidden group ${cardBorder} ${glowEffect}`}
      >
        {/* Hover info badge overlay */}
        <div className="absolute bottom-4 right-4 text-gray-400 group-hover:text-medical-600 transition-colors">
          <Maximize2 size={16} />
        </div>

        {/* Card Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{patientName}</h2>
            <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-medical-500"></span>
              Kamar: {room}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${statusBg} shrink-0`}>
            {status === "normal" && <CheckCircle2 size={14} />}
            {isWarning && <AlertTriangle size={14} className="animate-bounce" />}
            {status === "warning-fast" ? "Terlalu Cepat" : status === "warning-slow" ? "Tersumbat / Habis" : "Aman"}
          </div>
        </div>

        {/* Short Patient Info */}
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <FileText size={12} className="text-gray-400" />
            {illness}
          </span>
          <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Heart size={12} className="text-amber-500 animate-pulse" />
            {condition}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Flow Rate */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className={`absolute inset-0 opacity-10 transition-opacity ${isWarning ? 'bg-alert-500' : 'bg-medical-500 group-hover:opacity-20'}`}></div>
            <Activity className={`mb-2 ${isWarning ? 'text-alert-500' : 'text-medical-500'}`} size={24} />
            <div className="text-xs text-gray-500 font-bold mb-1">Kecepatan Tetes</div>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-black ${isWarning ? 'text-alert-600' : 'text-medical-900'}`}>
                {flowRate}
              </span>
              <span className="text-xs font-bold text-gray-400">/mnt</span>
            </div>
          </div>

          {/* Liquid level preview */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 opacity-10 bg-blue-500 group-hover:opacity-20 transition-opacity"></div>
            <Droplet className="text-blue-500 mb-2" size={24} />
            <div className="text-xs text-gray-500 font-bold mb-1">Sisa Infus</div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-blue-900">
                {Math.round(remainingPercentage)}%
              </span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">{Math.round(remainingVolume)} mL</div>
          </div>
        </div>
      </div>

      {/* POP-UP DETAIL MODAL (Glassmorphic) */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal Content */}
          <div 
            className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl relative overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Accent Gradients */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-medical-100 rounded-full blur-3xl opacity-50 -z-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10"></div>

            {/* Close Button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="mb-6">
              <span className="bg-medical-100 text-medical-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Detail Infus Pasien
              </span>
              <h3 className="text-3xl font-black text-gray-900 mt-2">{patientName}</h3>
              <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-medical-500"></span>
                Kamar: {room} | ID Alat: <span className="font-bold text-gray-700">{deviceId}</span>
              </p>
            </div>

            {/* Row 1: IV Bag Visual & Remaining Volume */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center bg-gray-50 rounded-3xl p-6 border border-gray-100 mb-6">
              {/* Infusion Bag SVG */}
              <div className="sm:col-span-4 flex justify-center">
                <div className="relative">
                  <svg viewBox="0 0 100 150" className="w-24 h-36 drop-shadow-md">
                    {/* Hook top */}
                    <circle cx="50" cy="12" r="5" fill="none" stroke="#D1D5DB" strokeWidth="2.5" />
                    
                    {/* Connection tube */}
                    <rect x="47" y="130" width="6" height="15" fill="#E5E7EB" rx="1" />
                    <line x1="50" y1="145" x2="50" y2="150" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="3,3" />

                    {/* Outer Bag Body */}
                    <path 
                      d="M 25,25 Q 50,20 75,25 L 75,110 Q 50,130 25,110 Z" 
                      fill="none" 
                      stroke="#E5E7EB" 
                      strokeWidth="3.5" 
                    />
                    
                    {/* Liquid fill masked with inset clip path */}
                    <path 
                      d="M 25,25 Q 50,20 75,25 L 75,110 Q 50,130 25,110 Z" 
                      fill="url(#liquid-grad)" 
                      style={{ clipPath: `inset(${(100 - remainingPercentage).toFixed(2)}% 0px 0px 0px)` }}
                      className="transition-all duration-1000 ease-out"
                    />

                    {/* Percentage Text overlay */}
                    <text x="50" y="72" textAnchor="middle" fill="#1E3A8A" className="text-[13px] font-black tracking-tight select-none">
                      {Math.round(remainingPercentage)}%
                    </text>
                    
                    <defs>
                      <linearGradient id="liquid-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Volume stats */}
              <div className="sm:col-span-8 space-y-4 text-center sm:text-left">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sisa Cairan Infus</div>
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="text-4xl font-black text-blue-600">{Math.round(remainingVolume)}</span>
                    <span className="text-lg font-bold text-gray-500">/ 1000 mL</span>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" 
                    style={{ width: `${remainingPercentage}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="bg-white p-2 rounded-xl border border-gray-100 text-center">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Tetesan Terbaca</div>
                    <div className="text-sm font-extrabold text-gray-800 mt-0.5">{dropsCount.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-100 text-center">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Kecepatan</div>
                    <div className="text-sm font-extrabold text-gray-800 mt-0.5">{flowRate} /mnt</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Duration Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Duration Elapsed */}
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 flex flex-col items-center justify-center text-center">
                <Clock size={20} className="text-blue-500 mb-1.5" />
                <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Durasi Berjalan</div>
                <div className="text-lg font-extrabold text-blue-900 mt-1">
                  {elapsedHours}j {elapsedMinutes}m
                </div>
                <div className="text-[9px] text-blue-400 mt-0.5">Sejak pasien dipasang</div>
              </div>

              {/* Time Remaining Estimation */}
              <div className="bg-medical-50/50 rounded-2xl p-4 border border-medical-100/50 flex flex-col items-center justify-center text-center">
                <Activity size={20} className="text-medical-600 mb-1.5" />
                <div className="text-[10px] font-bold text-medical-800 uppercase tracking-wider">Estimasi Sisa Waktu</div>
                <div className="text-lg font-extrabold text-medical-900 mt-1">
                  {hasInfusionStopped ? (
                    <span className="text-xs text-red-500 font-extrabold">Terhenti / Tersumbat</span>
                  ) : (
                    `${remainingHours}j ${remainingMinutes}m`
                  )}
                </div>
                <div className="text-[9px] text-medical-400 mt-0.5">Sampai cairan habis</div>
              </div>
            </div>

            {/* Row 3: Medical Profile */}
            <div className="bg-amber-50/30 rounded-3xl p-5 border border-amber-200/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-amber-100 p-1.5 rounded-lg">
                  <Heart size={16} className="text-amber-600" />
                </div>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Status Medis Pasien</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Nama Penyakit / Diagnosa</div>
                  <div className="text-sm font-bold text-gray-800 mt-0.5">{illness}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Kondisi Klinis</div>
                  <div className="text-sm font-bold text-amber-800 mt-0.5">{condition}</div>
                </div>
              </div>
            </div>

            {/* Alert Indicator */}
            {isWarning && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <div className="text-xs font-bold text-red-800">
                    Peringatan: Aliran Infus {status === "warning-fast" ? "Terlalu Cepat" : "Tersumbat / Habis"}!
                  </div>
                  <p className="text-[10px] text-red-600 mt-0.5 leading-relaxed">
                    Segera lakukan pemeriksaan klinis dan sesuaikan kembali katup aliran infus pasien.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
