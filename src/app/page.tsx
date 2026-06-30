"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import PatientCard from "@/components/PatientCard";
import { RefreshCw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

interface Patient {
  id: string;
  name: string;
  room: string;
  deviceId: string;
}

interface InfusionData {
  deviceId: string;
  dropsCount: number;
  flowRate: number;
  status: "normal" | "warning-fast" | "warning-slow";
  lastUpdated: string;
}

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [ivData, setIvData] = useState<Record<string, InfusionData>>({});
  const [isFetching, setIsFetching] = useState(true);

  // Fetch patients from DB
  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/patients");
      if (res.ok) setPatients(await res.json());
    } catch (e) { console.error(e); }
  };

  // Fetch real-time IV data for all devices
  const fetchInfusionData = async () => {
    try {
      const res = await fetch("/api/infusion");
      if (res.ok) {
        const json = await res.json();
        // The API now returns a dictionary of all devices
        setIvData(json);
      }
    } catch (error) {
      console.error("Failed to fetch IV data", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchInfusionData();
    const interval = setInterval(fetchInfusionData, 2000);
    return () => clearInterval(interval);
  }, []);

  const simulateESP32Data = async (rate: number, targetDeviceId: string) => {
    const currentDeviceData = Object.values(ivData).find(
      d => d.deviceId.toLowerCase() === targetDeviceId.toLowerCase()
    );
    await fetch("/api/infusion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: targetDeviceId,
        flowRate: rate,
        dropsCount: (currentDeviceData?.dropsCount || 1540) + Math.floor(Math.random() * 5),
      })
    });
    fetchInfusionData(); 
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] font-sans pb-20">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Monitor Bangsal</h2>
            <p className="text-gray-500 mt-1 font-medium">Pemantauan infus pasien secara real-time</p>
          </div>
          
          <div className="flex gap-2">
             <Link href="/login" className="px-5 py-2.5 text-sm font-bold bg-medical-900 text-white rounded-xl shadow-sm hover:bg-medical-800 flex items-center gap-2 transition-colors">
               <LayoutDashboard size={18} /> Kelola Data Pasien (Admin)
             </Link>
          </div>
        </div>

        {patients.length === 0 && !isFetching && (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
            <h3 className="text-xl font-bold mb-2">Belum ada pasien</h3>
            <p>Silakan masuk ke halaman Admin untuk menambahkan data pasien dan menghubungkannya dengan ID ESP32.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map(p => {
             const data = Object.values(ivData).find(
               d => d.deviceId.toLowerCase() === p.deviceId.toLowerCase()
             );
             return (
               <div key={p.id} className="flex flex-col gap-3">
                 {/* The Patient Card */}
                 {data && (new Date().getTime() - new Date(data.lastUpdated).getTime() < 7000) ? (
                   <PatientCard 
                     patientName={p.name}
                     room={p.room}
                     deviceId={p.deviceId}
                     flowRate={data.flowRate}
                     dropsCount={data.dropsCount}
                     status={data.status}
                   />
                 ) : (
                   <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-gray-400 h-[280px]">
                     <RefreshCw className="animate-spin mb-4" size={32} />
                     <p className="font-medium text-center">Menunggu data dari<br/>{p.deviceId}...</p>
                   </div>
                 )}
                 
                 {/* Simulation Controls per patient */}
                 <div className="flex gap-2 justify-center mt-2">
                    <button onClick={() => simulateESP32Data(65, p.deviceId)} className="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-safe-100 hover:text-safe-600 px-3 py-1.5 rounded-lg transition-colors">
                      Simulasi Normal
                    </button>
                    <button onClick={() => simulateESP32Data(150, p.deviceId)} className="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-alert-100 hover:text-alert-600 px-3 py-1.5 rounded-lg transition-colors">
                      Simulasi Bahaya
                    </button>
                 </div>
               </div>
             );
          })}
        </div>
      </main>
    </div>
  );
}
