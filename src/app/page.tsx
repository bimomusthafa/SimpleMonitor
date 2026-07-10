"use client";

import { useEffect, useState, useRef } from "react";
import Header from "@/components/Header";
import PatientCard from "@/components/PatientCard";
import { RefreshCw, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import type { MqttClient } from "mqtt";

interface Patient {
  id: string;
  name: string;
  room: string;
  deviceId: string;
  illness?: string;
  condition?: string;
  createdAt: string;
}

interface InfusionData {
  deviceId: string;
  dropsCount: number;
  flowRate: number;
  status: "normal" | "warning-fast" | "warning-slow";
  lastUpdated: string;
}

interface AlertData {
  id: string;
  patientName: string;
  room: string;
  percentage: number;
  level: number;
}

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [ivData, setIvData] = useState<Record<string, InfusionData>>({});
  const [isFetching, setIsFetching] = useState(true);
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  const clientRef = useRef<MqttClient | null>(null);
  const simIntervalsRef = useRef<Record<string, any>>({});
  const simDropsCountRef = useRef<Record<string, number>>({});

  // Fetch patients from DB
  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/patients");
      if (res.ok) setPatients(await res.json());
    } catch (e) { console.error(e); }
    setIsFetching(false);
  };

  // MQTT Connection and Subscription
  useEffect(() => {
    fetchPatients();

    let activeClient: MqttClient | null = null;

    // Connect to HiveMQ Public WebSocket broker dynamically
    import("mqtt").then((mqttModule) => {
      const mqtt = mqttModule.default || mqttModule;
      const client = mqtt.connect("ws://broker.hivemq.com:8000/mqtt");
      activeClient = client;
      clientRef.current = client;

      client.on("error", (err) => {
        console.error("MQTT Connection Error:", err);
      });

      client.on("connect", () => {
        console.log("Connected to HiveMQ MQTT Broker via WebSockets");
        client.subscribe("iv-monitor/device/+/data", (err) => {
          if (err) {
            console.error("MQTT Subscription failed:", err);
          } else {
            console.log("Subscribed to iv-monitor/device/+/data");
          }
        });
      });

      client.on("message", (topic, message) => {
        try {
          const parts = topic.split("/");
          const deviceId = parts[2];
          if (deviceId) {
            const payload = JSON.parse(message.toString());
            const flowRate = payload.flowRate || 0;
            const dropsCount = payload.dropsCount || 0;
            
            let status: "normal" | "warning-fast" | "warning-slow" = "normal";
            if (flowRate > 120) {
              status = "warning-fast";
            } else if (flowRate < 10) {
              status = "warning-slow";
            }

            setIvData(prev => ({
              ...prev,
              [deviceId]: {
                deviceId,
                dropsCount,
                flowRate,
                status,
                lastUpdated: new Date().toISOString()
              }
            }));
          }
        } catch (err) {
          console.error("Error parsing MQTT message payload:", err);
        }
      });
    }).catch(err => {
      console.error("Failed to load MQTT library dynamically:", err);
    });

    return () => {
      if (activeClient) {
        activeClient.end();
      }
      // Clear any active simulation loops on unmount
      Object.values(simIntervalsRef.current).forEach(clearInterval);
    };
  }, []);

  // Compute alerts dynamically
  useEffect(() => {
    const activeAlerts: AlertData[] = [];
    patients.forEach(p => {
      const data = Object.values(ivData).find(
        d => d.deviceId.toLowerCase() === p.deviceId.toLowerCase()
      );
      if (data) {
        const remainingVolume = Math.max(0, 555 - (data.dropsCount / 20));
        const pct = (remainingVolume / 555) * 100;
        
        let threshold = 100;
        if (pct <= 15) {
          threshold = 15;
        } else if (pct <= 20) {
          threshold = 20;
        } else if (pct <= 25) {
          threshold = 25;
        } else if (pct <= 30) {
          threshold = 30;
        }
        
        if (threshold <= 30) {
          activeAlerts.push({
            id: p.id,
            patientName: p.name,
            room: p.room,
            percentage: Math.round(pct),
            level: threshold
          });
        }
      }
    });
    setAlerts(activeAlerts);
  }, [patients, ivData]);

  // Simulate ESP32 telemetry by publishing simulated values directly to HiveMQ MQTT Broker
  const simulateESP32Data = (rate: number, targetDeviceId: string) => {
    if (simIntervalsRef.current[targetDeviceId]) {
      clearInterval(simIntervalsRef.current[targetDeviceId]);
    }

    const currentDeviceData = Object.values(ivData).find(
      d => d.deviceId.toLowerCase() === targetDeviceId.toLowerCase()
    );
    let currentDrops = currentDeviceData?.dropsCount || 1000;
    simDropsCountRef.current[targetDeviceId] = currentDrops;

    const interval = setInterval(() => {
      if (clientRef.current && clientRef.current.connected) {
        let addedDrops = Math.round((rate / 60) * 2);
        
        // Demo acceleration: speed up drop accumulation in warning mode so volume drains visibly
        if (rate > 120) {
          addedDrops = addedDrops * 25;
        }

        simDropsCountRef.current[targetDeviceId] += addedDrops;

        const payload = {
          flowRate: rate,
          dropsCount: simDropsCountRef.current[targetDeviceId]
        };

        clientRef.current.publish(
          `iv-monitor/device/${targetDeviceId}/data`,
          JSON.stringify(payload)
        );
      }
    }, 2000);

    simIntervalsRef.current[targetDeviceId] = interval;
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

        {/* Real-time Infusion Alert Center */}
        {alerts.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-[24px] p-6 shadow-md shadow-red-100/30 animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
              </span>
              <h3 className="text-sm font-black text-red-800 uppercase tracking-wider">
                Pusat Peringatan Sisa Cairan Infus ({alerts.length} Pasien)
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {alerts.map(alert => {
                const isCritical = alert.percentage <= 15;
                const badgeColor = isCritical 
                  ? "bg-red-100 text-red-800 border-red-200" 
                  : "bg-orange-100 text-orange-800 border-orange-200";
                
                return (
                  <div key={alert.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start gap-3">
                    <div className="text-xl mt-0.5">⚠️</div>
                    <div>
                      <div className="font-bold text-gray-800 text-sm">{alert.patientName}</div>
                      <div className="text-xs text-gray-500 font-medium">Kamar: {alert.room}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          Sisa: {alert.percentage}%
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                          ({Math.round(alert.percentage * 5.55)} mL)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                     illness={p.illness}
                     condition={p.condition}
                     createdAt={p.createdAt}
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
