import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const patients = await prisma.patient.findMany();
    const now = new Date();
    
    // Auto-simulate data for all registered patients if no active ESP32 is posting
    for (const patient of patients) {
      const deviceId = patient.deviceId;
      if (!deviceId) continue;
      
      const prev = infusionsStore[deviceId];
      
      if (!prev) {
        // Initialize new simulated device data
        const rand = Math.random();
        let flowRate = 60;
        if (rand < 0.7) {
          flowRate = Math.floor(Math.random() * 20) + 55; // 55-75 (normal)
        } else if (rand < 0.85) {
          flowRate = Math.floor(Math.random() * 20) + 125; // 125-145 (fast)
        } else {
          flowRate = Math.floor(Math.random() * 5) + 3; // 3-8 (slow)
        }
        
        let status: "normal" | "warning-fast" | "warning-slow" = "normal";
        if (flowRate > 120) {
          status = "warning-fast";
        } else if (flowRate < 10) {
          status = "warning-slow";
        }

        // Start with a small amount of drops (e.g. 500-1500)
        const initialDrops = Math.floor(Math.random() * 1000) + 500;

        infusionsStore[deviceId] = {
          deviceId: deviceId,
          dropsCount: initialDrops,
          flowRate: flowRate,
          status: status,
          lastUpdated: now.toISOString()
        };
      } else {
        // Device already exists. Accumulate drops based on elapsed time.
        const prevTime = new Date(prev.lastUpdated).getTime();
        const elapsedSeconds = Math.max(0, (now.getTime() - prevTime) / 1000);
        
        // Small fluctuation in flow rate (+/- 1) to make it look alive
        let flowRate = prev.flowRate;
        if (flowRate > 0) {
          flowRate = flowRate + Math.floor(Math.random() * 3) - 1;
          if (flowRate < 0) flowRate = 0;
        }

        let status: "normal" | "warning-fast" | "warning-slow" = "normal";
        if (flowRate > 120) {
          status = "warning-fast";
        } else if (flowRate < 10) {
          status = "warning-slow";
        }

        // 20 drops = 1 mL
        // Added drops = (flowRate / 60) * elapsedSeconds
        let addedDrops = Math.round((flowRate / 60) * elapsedSeconds);
        
        // Demo acceleration: speed up drop accumulation in warning-fast mode so volume drains visibly
        if (flowRate > 120) {
          addedDrops = addedDrops * 25;
        }
        
        infusionsStore[deviceId] = {
          deviceId: deviceId,
          dropsCount: prev.dropsCount + addedDrops,
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
