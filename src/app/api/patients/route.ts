import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  return NextResponse.json(db.patients);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const db = await getDb();
    
    const newPatient = {
      id: "pat-" + Date.now().toString(),
      name: data.name,
      room: data.room,
      deviceId: data.deviceId,
      createdAt: new Date().toISOString()
    };
    
    db.patients.push(newPatient);
    await saveDb(db);
    
    return NextResponse.json({ success: true, data: newPatient }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}
