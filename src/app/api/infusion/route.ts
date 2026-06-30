import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// In-memory store for prototype purposes.
// In a real app, this would be a database like PostgreSQL or InfluxDB.
interface InfusionData {
  deviceId: string;
  dropsCount: number;
  flowRate: number;
  status: "normal" | "warning-fast" | "warning-slow";
  lastUpdated: string;
}

let infusionsStore: Record<string, InfusionData> = {};

export async function GET() {
  try {
    const db = await getDb();
    const now = new Date();
    
    // Auto-simulate data for all registered patients if no active ESP32 is posting
    for (const patient of db.patients) {
      const deviceId = patient.deviceId;
      if (!deviceId) continue;
      
      const prev = infusionsStore[deviceId];
      
      // If no data exists, or data is older than 6 seconds (meaning ESP32 is offline)
      if (!prev || (now.getTime() - new Date(prev.lastUpdated).getTime() > 6000)) {
        const prevDrops = prev ? prev.dropsCount : (Math.floor(Math.random() * 1000) + 500);
        let flowRate = prev ? prev.flowRate : 0;
        
        if (!prev) {
          // Initialize random flow rate
          const rand = Math.random();
          if (rand < 0.7) {
            flowRate = Math.floor(Math.random() * 20) + 55; // 55-75 (normal)
          } else if (rand < 0.85) {
            flowRate = Math.floor(Math.random() * 20) + 125; // 125-145 (fast)
          } else {
            flowRate = Math.floor(Math.random() * 5) + 3; // 3-8 (slow)
          }
        } else {
          // Small fluctuations
          flowRate = flowRate + Math.floor(Math.random() * 5) - 2;
          if (flowRate < 0) flowRate = 0;
        }
        
        let status: "normal" | "warning-fast" | "warning-slow" = "normal";
        if (flowRate > 120) {
          status = "warning-fast";
        } else if (flowRate < 10) {
          status = "warning-slow";
        }
        
        // Accumulate drops based on flow rate (every 2 seconds)
        const addedDrops = Math.max(0, Math.round((flowRate / 60) * 2));
        
        infusionsStore[deviceId] = {
          deviceId: deviceId,
          dropsCount: prevDrops + (addedDrops || 1),
          flowRate: flowRate,
          status: status,
          lastUpdated: now.toISOString()
        };
      }
    }
  } catch (error) {
    console.error("Gagal melakukan simulasi otomatis data infus:", error);
  }

  return NextResponse.json(infusionsStore);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Support single object or array of objects
    const updates = Array.isArray(data) ? data : [data];
    const updatedDevices: InfusionData[] = [];
    
    for (const item of updates) {
      // Validate incoming data fields
      if (!item.deviceId || typeof item.flowRate !== 'number') {
        continue;
      }

      // Determine status based on flow rate
      let status: "normal" | "warning-fast" | "warning-slow" = "normal";
      if (item.flowRate > 120) {
        status = "warning-fast";
      } else if (item.flowRate < 10) {
        status = "warning-slow";
      }

      const prev = infusionsStore[item.deviceId] || { dropsCount: 0 };
      const updatedItem: InfusionData = {
        deviceId: item.deviceId,
        dropsCount: item.dropsCount !== undefined ? item.dropsCount : prev.dropsCount,
        flowRate: item.flowRate,
        status: status,
        lastUpdated: new Date().toISOString()
      };

      infusionsStore[item.deviceId] = updatedItem;
      updatedDevices.push(updatedItem);
    }

    if (updatedDevices.length === 0) {
      return NextResponse.json({ error: "Invalid data format or empty update" }, { status: 400 });
    }

    return NextResponse.json({ 
      message: "Data updated successfully", 
      data: Array.isArray(data) ? updatedDevices : updatedDevices[0] 
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
