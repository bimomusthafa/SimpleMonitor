import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  try {
    const dataPath = path.join(process.cwd(), "data.json");
    
    // Check if data.json exists
    try {
      await fs.access(dataPath);
    } catch {
      console.log("File data.json tidak ditemukan. Tidak ada data yang diimpor.");
      return;
    }

    const dataStr = await fs.readFile(dataPath, "utf-8");
    const data = JSON.parse(dataStr);
    
    console.log(`Menemukan ${data.patients?.length || 0} pasien di data.json.`);
    
    if (data.patients && Array.isArray(data.patients)) {
      for (const p of data.patients) {
        console.log(`Mengimpor ${p.name}...`);
        await prisma.patient.upsert({
          where: { id: p.id },
          update: {},
          create: {
            id: p.id,
            name: p.name,
            room: p.room,
            deviceId: p.deviceId,
            illness: p.illness || "",
            condition: p.condition || "",
            createdAt: new Date(p.createdAt || Date.now())
          }
        });
      }
      console.log("Semua data pasien berhasil diimpor ke MySQL!");
    }
  } catch (error) {
    console.error("Gagal mengimpor data awal:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
