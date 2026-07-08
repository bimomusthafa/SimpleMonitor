"use client";

import { useState, useEffect } from "react";
import { Trash2, UserPlus, Save, X, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

interface Patient {
  id: string;
  name: string;
  room: string;
  deviceId: string;
  illness?: string;
  condition?: string;
}

export default function PatientsDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Form State
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [illness, setIllness] = useState("");
  const [condition, setCondition] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editDeviceId, setEditDeviceId] = useState("");
  const [editIllness, setEditIllness] = useState("");
  const [editCondition, setEditCondition] = useState("");

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        setPatients(await res.json());
      }
    } catch (error) {
      console.error("Gagal memuat data pasien:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, room, deviceId, illness, condition })
    });

    if (res.ok) {
      setIsAdding(false);
      setName(""); setRoom(""); setDeviceId(""); setIllness(""); setCondition("");
      fetchPatients();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Pasien ${name} sudah sembuh/pulang? Data akan dihapus.`)) {
      await fetch(`/api/patients/${id}`, { method: "DELETE" });
      fetchPatients();
    }
  };

  const startEditing = (p: Patient) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditRoom(p.room);
    setEditDeviceId(p.deviceId);
    setEditIllness(p.illness || "");
    setEditCondition(p.condition || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditRoom("");
    setEditDeviceId("");
    setEditIllness("");
    setEditCondition("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const res = await fetch(`/api/patients/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: editName, 
        room: editRoom, 
        deviceId: editDeviceId,
        illness: editIllness,
        condition: editCondition
      })
    });

    if (res.ok) {
      cancelEditing();
      fetchPatients();
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Data Pasien Infus</h1>
          <p className="text-gray-500 mt-1 font-medium">Kelola pasien yang terhubung dengan alat ESP32</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-medical-600 hover:bg-medical-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          {isAdding ? <X size={18} /> : <UserPlus size={18} />}
          {isAdding ? "Batal" : "Pasien Baru"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-3xl border border-medical-100 shadow-xl shadow-medical-100/50 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Pasien</label>
            <input required value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-medical-500 outline-none text-sm text-gray-900" placeholder="Cth: Bpk. Budi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nomor Kamar</label>
            <input required value={room} onChange={e => setRoom(e.target.value)} type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-medical-500 outline-none text-sm text-gray-900" placeholder="Cth: Melati 03" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ID Alat (ESP32)</label>
            <input required value={deviceId} onChange={e => setDeviceId(e.target.value)} type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-medical-500 outline-none text-sm text-gray-900" placeholder="Cth: ESP32-01" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Penyakit</label>
            <input required value={illness} onChange={e => setIllness(e.target.value)} type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-medical-500 outline-none text-sm text-gray-900" placeholder="Cth: Demam Berdarah" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Kondisi Pasien</label>
            <input required value={condition} onChange={e => setCondition(e.target.value)} type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-medical-500 outline-none text-sm text-gray-900" placeholder="Cth: Lemah, butuh pemantauan" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-medical-900 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-sm cursor-pointer">
              <Save size={18} /> Simpan Pasien Baru
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-5">Nama Pasien</th>
                <th className="p-5">Kamar</th>
                <th className="p-5">Penyakit</th>
                <th className="p-5">Kondisi</th>
                <th className="p-5">ID Alat Infus</th>
                <th className="p-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium">Memuat data...</td></tr>}
              {!loading && patients.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center text-gray-400 font-medium text-lg">Belum ada pasien yang dipantau</td></tr>
              )}
              {!loading && patients.map(p => {
                const isEditing = editingId === p.id;
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {isEditing ? (
                      <>
                        <td className="p-4">
                          <input 
                            type="text" 
                            value={editName} 
                            onChange={e => setEditName(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-medical-500 outline-none text-sm font-bold text-gray-900"
                          />
                        </td>
                        <td className="p-4">
                          <input 
                            type="text" 
                            value={editRoom} 
                            onChange={e => setEditRoom(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-medical-500 outline-none text-sm font-medium text-gray-500"
                          />
                        </td>
                        <td className="p-4">
                          <input 
                            type="text" 
                            value={editIllness} 
                            onChange={e => setEditIllness(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-medical-500 outline-none text-sm font-medium text-gray-700"
                          />
                        </td>
                        <td className="p-4">
                          <input 
                            type="text" 
                            value={editCondition} 
                            onChange={e => setEditCondition(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-medical-500 outline-none text-sm font-medium text-gray-700"
                          />
                        </td>
                        <td className="p-4">
                          <input 
                            type="text" 
                            value={editDeviceId} 
                            onChange={e => setEditDeviceId(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-medical-500 outline-none text-sm font-bold text-medical-800"
                          />
                        </td>
                        <td className="p-4 text-right space-x-1">
                          <button 
                            onClick={handleEdit}
                            className="text-medical-600 hover:text-medical-800 hover:bg-medical-50 p-2 rounded-lg transition-colors inline-flex"
                            title="Simpan Perubahan"
                          >
                            <Save size={20} />
                          </button>
                          <button 
                            onClick={cancelEditing}
                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors inline-flex"
                            title="Batal"
                          >
                            <X size={20} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-5 font-bold text-gray-900">{p.name}</td>
                        <td className="p-5 text-gray-500 font-medium">{p.room}</td>
                        <td className="p-5 text-gray-700 font-medium">{p.illness || "-"}</td>
                        <td className="p-5">
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold">
                            {p.condition || "-"}
                          </span>
                        </td>
                        <td className="p-5">
                          <span className="bg-medical-100 text-medical-800 px-3 py-1 rounded-full text-sm font-bold">{p.deviceId}</span>
                        </td>
                        <td className="p-5 text-right space-x-1">
                          <button 
                            onClick={() => startEditing(p)}
                            className="text-gray-400 hover:text-medical-600 hover:bg-medical-50 p-2 rounded-lg transition-colors inline-flex"
                            title="Edit Pasien"
                          >
                            <Pencil size={20} />
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id, p.name)}
                            className="text-gray-400 hover:text-alert-600 hover:bg-alert-50 p-2 rounded-lg transition-colors inline-flex"
                            title="Pasien Sembuh / Hapus"
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
