'use client';

import { useState, useEffect } from 'react';
import { 
    FaPlus, FaEdit, FaTrash, FaSpinner, FaUsers, FaUserCog, FaSearch 
} from 'react-icons/fa';
import TechnicianFormModal from '@/components/TechnicianFormModal';

export default function TechniciansPage() {
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [userRole, setUserRole] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTech, setEditingTech] = useState(null);

    // Fetch Role & Data
    useEffect(() => {
        // Ambil Role
        fetch('/api/me')
            .then(res => res.json())
            .then(data => setUserRole(data.role));

        // Ambil Data Teknisi
        fetchTechnicians();
    }, []);

    const fetchTechnicians = () => {
        setLoading(true);
        fetch('/api/technicians')
            .then(res => res.json())
            .then(data => {
                setTechnicians(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    // Filter Search
    const filteredTechnicians = technicians.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.nik.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = () => { setEditingTech(null); setIsModalOpen(true); };
    const handleEdit = (tech) => { setEditingTech(tech); setIsModalOpen(true); };
    
    const handleDelete = async (nik) => {
        if(!confirm(`Hapus teknisi ${nik}?`)) return;
        try {
            const res = await fetch(`/api/technicians/${nik}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus (Akses Ditolak)');
            fetchTechnicians();
        } catch (error) { alert(error.message); }
    };

    const toggleStatus = async (nik, currentStatus) => {
        if (userRole !== 'Admin') return; // Proteksi Frontend
        try {
            await fetch(`/api/technicians/status/${nik}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            fetchTechnicians();
        } catch (error) { alert('Gagal update status'); }
    };

    return (
        <div className="space-y-6">
            <TechnicianFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchTechnicians} initialData={editingTech} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Data Teknisi</h2>
                    <p className="text-sm text-slate-500">Kelola daftar teknisi lapangan</p>
                </div>
                
                {/* TOMBOL TAMBAH: Hanya Admin */}
                {userRole === 'Admin' && (
                    <button onClick={handleCreate} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition">
                        <FaPlus /> Tambah Teknisi
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-3 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Cari Nama / NIK..." 
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-10"><FaSpinner className="animate-spin text-3xl text-blue-600" /></div>
                ) : filteredTechnicians.map((tech) => (
                    <div key={tech.nik} className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${tech.is_active ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <FaUserCog />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{tech.name}</h3>
                                    <p className="text-xs text-slate-500 font-mono">{tech.nik}</p>
                                    <p className="text-xs text-slate-400 mt-1">{tech.phone_number || '-'}</p>
                                </div>
                            </div>
                            
                            {/* STATUS TOGGLE: Hanya Admin yang bisa klik */}
                            <button 
                                onClick={() => toggleStatus(tech.nik, tech.is_active)}
                                disabled={userRole !== 'Admin'}
                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                                    tech.is_active 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-slate-100 text-slate-500'
                                } ${userRole === 'Admin' ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                            >
                                {tech.is_active ? 'Aktif' : 'Non-Aktif'}
                            </button>
                        </div>

                        {/* AKSI EDIT/HAPUS: Hanya Admin */}
                        {userRole === 'Admin' && (
                            <div className="mt-6 flex gap-2 border-t border-slate-100 pt-4">
                                <button onClick={() => handleEdit(tech)} className="flex-1 rounded-lg bg-slate-50 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition">
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(tech.nik)} className="flex-1 rounded-lg bg-red-50 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition">
                                    Hapus
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}