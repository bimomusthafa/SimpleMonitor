import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const patients = await prisma.patient.findMany({
    orderBy: {
      createdAt: 'asc',
    },
  });
  return NextResponse.json(patients);
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
