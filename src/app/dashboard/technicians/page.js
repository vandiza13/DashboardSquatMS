'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaUserCog, FaTrash, FaEdit, FaPhone, FaIdCard } from 'react-icons/fa';
import TechnicianFormModal from '@/components/TechnicianFormModal';

export default function TechniciansPage() {
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTech, setEditingTech] = useState(null);
    
    // STATE BARU: Menyimpan Role User yang sedang login
    const [userRole, setUserRole] = useState(''); 

    const fetchTechnicians = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/technicians');
            const data = await res.json();
            if (Array.isArray(data)) {
                setTechnicians(data);
            } else {
                setTechnicians([]);
            }
        } catch (error) {
            console.error('Gagal mengambil data teknisi:', error);
        } finally {
            setLoading(false);
        }
    };

    // FETCH ROLE & DATA TEKNISI SAAT LOAD
    useEffect(() => {
        // 1. Ambil data User (untuk cek Role)
        fetch('/api/me')
            .then(res => res.json())
            .then(data => setUserRole(data.role || ''))
            .catch(err => console.error('Gagal ambil role:', err));

        // 2. Ambil data Teknisi
        fetchTechnicians();
    }, []);

    const handleSearch = (e) => {
        setSearch(e.target.value);
    };

    const handleDelete = async (nik) => {
        if (!confirm('Apakah Anda yakin ingin menghapus teknisi ini?')) return;
        try {
            const res = await fetch(`/api/technicians/${nik}`, { method: 'DELETE' });
            if (res.ok) {
                alert('Teknisi berhasil dihapus');
                fetchTechnicians();
            } else {
                alert('Gagal menghapus teknisi');
            }
        } catch (error) {
            alert('Terjadi kesalahan saat menghapus teknisi');
        }
    };

    const openAddModal = () => {
        setEditingTech(null);
        setIsModalOpen(true);
    };

    const openEditModal = (tech) => {
        setEditingTech(tech);
        setIsModalOpen(true);
    };

    const handleModalClose = (shouldRefresh) => {
        setIsModalOpen(false);
        setEditingTech(null);
        if (shouldRefresh) {
            fetchTechnicians();
        }
    };

    const filteredTechnicians = technicians.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.nik.includes(search) ||
        (t.position_name && t.position_name.toLowerCase().includes(search.toLowerCase()))
    );

    // --- KOMPONEN KARTU MOBILE (HANYA MUNCUL DI HP) ---
    const MobileTechnicianCard = ({ tech }) => (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 relative">
            {/* Header: Nama & Status */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                        <FaUserCog />
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 text-sm">{tech.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <FaIdCard className="text-slate-300"/> {tech.nik}
                        </div>
                    </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    tech.is_active 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                    {tech.is_active ? 'Aktif' : 'Non-Aktif'}
                </span>
            </div>
            
            {/* Detail Info */}
            <div className="flex flex-wrap gap-2 mt-1">
                {tech.position_name ? (
                    <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded text-[10px] font-bold border border-purple-100">
                        {tech.position_name}
                    </span>
                ) : (
                    <span className="text-slate-400 italic text-[10px]">- No Position -</span>
                )}
                
                {tech.phone_number && (
                    <a href={`https://wa.me/${tech.phone_number.replace(/^0/, '62')}`} target="_blank" className="bg-slate-50 text-slate-600 px-2 py-1 rounded text-[10px] flex items-center gap-1 border border-slate-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors">
                        <FaPhone size={10}/> {tech.phone_number}
                    </a>
                )}
            </div>

            {/* Actions (Admin Only) */}
            {userRole === 'Admin' && (
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-1">
                    <button onClick={() => openEditModal(tech)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1">
                        <FaEdit /> Edit
                    </button>
                    <button onClick={() => handleDelete(tech.nik)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-1">
                        <FaTrash /> Hapus
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800">Data Teknisi</h2>
                    <p className="text-sm text-slate-500">Kelola database teknisi lapangan</p>
                </div>

                {/* LOGIC TOMBOL TAMBAH: HANYA MUNCUL JIKA ADMIN */}
                {userRole === 'Admin' && (
                    <button 
                        onClick={openAddModal}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 w-full md:w-auto"
                    >
                        <FaPlus /> Tambah Teknisi
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-3 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Cari Nama, Jabatan, atau NIK..." 
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                        value={search}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            {/* --- CONTENT AREA --- */}

            {/* 1. TAMPILAN MOBILE (CARD VIEW) */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    <div className="text-center py-10 text-slate-500 text-sm">Memuat data teknisi...</div>
                ) : filteredTechnicians.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">Tidak ada data teknisi.</div>
                ) : (
                    filteredTechnicians.map((tech) => (
                        <MobileTechnicianCard key={tech.nik} tech={tech} />
                    ))
                )}
            </div>

            {/* 2. TAMPILAN DESKTOP (TABLE VIEW) */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold">Nama Teknisi</th>
                                <th className="px-6 py-4 font-bold">Jabatan</th> 
                                <th className="px-6 py-4 font-bold">NIK</th>
                                <th className="px-6 py-4 font-bold">No HP</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                
                                {/* LOGIC HEADER AKSI: HANYA MUNCUL JIKA ADMIN */}
                                {userRole === 'Admin' && (
                                    <th className="px-6 py-4 font-bold text-center">Aksi</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    {/* Sesuaikan colspan jika admin/bukan */}
                                    <td colSpan={userRole === 'Admin' ? 6 : 5} className="px-6 py-8 text-center text-slate-500">Memuat data teknisi...</td>
                                </tr>
                            ) : filteredTechnicians.length === 0 ? (
                                <tr>
                                    <td colSpan={userRole === 'Admin' ? 6 : 5} className="px-6 py-8 text-center text-slate-500">Tidak ada data teknisi.</td>
                                </tr>
                            ) : (
                                filteredTechnicians.map((tech) => (
                                    <tr key={tech.nik} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-semibold text-slate-700 flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                <FaUserCog />
                                            </div>
                                            {tech.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {tech.position_name ? (
                                                <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded-md text-xs font-bold border border-purple-100">
                                                    {tech.position_name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-500">{tech.nik}</td>
                                        <td className="px-6 py-4 text-slate-600 text-xs">{tech.phone_number || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                                tech.is_active 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-slate-100 text-slate-500 border-slate-200'
                                            }`}>
                                                {tech.is_active ? 'Aktif' : 'Non-Aktif'}
                                            </span>
                                        </td>
                                        
                                        {/* LOGIC KOLOM TOMBOL: HANYA MUNCUL JIKA ADMIN */}
                                        {userRole === 'Admin' && (
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEditModal(tech)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                                                        <FaEdit />
                                                    </button>
                                                    <button onClick={() => handleDelete(tech.nik)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Hapus">
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form hanya dirender, tapi logic di dalamnya sudah terlindungi API Backend */}
            <TechnicianFormModal 
                isOpen={isModalOpen} 
                onClose={handleModalClose} 
                technicianToEdit={editingTech} 
            />
        </div>
    );
}