import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
    return NextResponse.json(patients);
  } catch (error) {
    console.error("Gagal mengambil data pasien dari MySQL:", error);
    // Kembalikan array kosong agar halaman web tidak crash jika database belum di-setup
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const newPatient = await prisma.patient.create({
      data: {
        id: "pat-" + Date.now().toString(),
        name: data.name,
        room: data.room,
        deviceId: data.deviceId,
        illness: data.illness || "",
        condition: data.condition || "",
      },
    });
    
    return NextResponse.json({ success: true, data: newPatient }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}
