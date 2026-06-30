import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    
    // Filter out the patient to delete
    db.patients = db.patients.filter((p: any) => p.id !== id);
    await saveDb(db);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const db = await getDb();
    
    const index = db.patients.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    db.patients[index] = {
      ...db.patients[index],
      name: data.name !== undefined ? data.name : db.patients[index].name,
      room: data.room !== undefined ? data.room : db.patients[index].room,
      deviceId: data.deviceId !== undefined ? data.deviceId : db.patients[index].deviceId,
    };
    
    await saveDb(db);
    
    return NextResponse.json({ success: true, data: db.patients[index] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
  }
}

