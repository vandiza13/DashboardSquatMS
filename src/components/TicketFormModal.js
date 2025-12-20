'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaHardHat } from 'react-icons/fa';

export default function TicketFormModal({ isOpen, onClose, onSuccess, initialData }) {
    const [formData, setFormData] = useState({
        category: 'MTEL',
        subcategory: '',
        id_tiket: '',
        tiket_time: '',
        deskripsi: '',
        status: 'OPEN',
        update_progres: '',
        technician_nik: ''
    });

    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(false);
    // STATE BARU: Menyimpan role user yang login
    const [userRole, setUserRole] = useState('');

    const SUB_CATEGORIES = {
        MTEL: ['TIS', 'FSI', 'MMP', 'FIBERISASI', 'BATERAI', 'RECTIFIER', 'GENSET', 'AC'],
        SQUAT: ['SQUAT'],
        UMT: ['UMT'],
        CENTRATAMA: ['CENTRATAMA']
    };

    // Load Data Teknisi Aktif DAN Cek Role User saat modal dibuka
    useEffect(() => {
        if (isOpen) {
            // 1. Ambil data teknisi
            fetch('/api/technicians/active')
                .then(res => res.json())
                .then(data => setTechnicians(data))
                .catch(err => console.error(err));

            // 2. Ambil data role user saat ini (/api/me sudah kita buat sebelumnya)
            fetch('/api/me')
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error('Gagal mengambil data user');
                })
                .then(userData => {
                    setUserRole(userData.role);
                })
                .catch(err => console.error(err));
        }
    }, [isOpen]);

    // LOGIKA RESTRIKSI:
    // Jika Role adalah 'User' DAN sedang mengedit data lama (initialData ada),
    // maka mode restriksi aktif.
    // (Admin tetap bisa edit semua).
    const isRestrictedEdit = userRole === 'User' && !!initialData;

    // Set Form Data saat Mode Edit
    useEffect(() => {
        if (initialData) {
            const techNik = initialData.assigned_technician_niks 
                ? initialData.assigned_technician_niks.split(',')[0] 
                : '';
            
            const formattedDate = initialData.tiket_time 
                ? new Date(initialData.tiket_time).toISOString().slice(0, 16) 
                : '';

            setFormData({
                category: initialData.category,
                subcategory: initialData.subcategory,
                id_tiket: initialData.id_tiket,
                tiket_time: formattedDate,
                deskripsi: initialData.deskripsi,
                status: initialData.status,
                update_progres: initialData.update_progres || '',
                technician_nik: techNik 
            });
        } else {
            // Reset Form untuk data baru
            setFormData({
                category: 'MTEL',
                subcategory: '',
                id_tiket: '',
                tiket_time: '',
                deskripsi: '',
                status: 'OPEN',
                update_progres: '',
                technician_nik: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = initialData ? `/api/tickets/${initialData.id}` : '/api/tickets';
            const method = initialData ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                technician_niks: formData.technician_nik ? [formData.technician_nik] : []
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan tiket');
            
            onSuccess();
            onClose();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">
                        {initialData ? 'Edit Tiket' : 'Buat Tiket Baru'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition">
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                    {/* Baris 1: Kategori & Sub (DISABLED JIKA RESTRICTED) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori</label>
                            <select 
                                className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value, subcategory: ''})}
                                disabled={isRestrictedEdit}
                            >
                                {Object.keys(SUB_CATEGORIES).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sub Kategori</label>
                            <select 
                                className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                value={formData.subcategory}
                                onChange={e => setFormData({...formData, subcategory: e.target.value})}
                                required
                                disabled={isRestrictedEdit}
                            >
                                <option value="">- Pilih Sub -</option>
                                {SUB_CATEGORIES[formData.category]?.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Baris 2: ID & Waktu (DISABLED JIKA RESTRICTED) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Tiket</label>
                            <input type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                value={formData.id_tiket} onChange={e => setFormData({...formData, id_tiket: e.target.value})} required disabled={isRestrictedEdit} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Waktu Tiket</label>
                            <input type="datetime-local" className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                value={formData.tiket_time} onChange={e => setFormData({...formData, tiket_time: e.target.value})} required disabled={isRestrictedEdit} />
                        </div>
                    </div>

                    {/* Deskripsi (UBAH JADI INPUT TEXT BIASA & DISABLED JIKA RESTRICTED) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deskripsi</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                            value={formData.deskripsi} 
                            onChange={e => setFormData({...formData, deskripsi: e.target.value})} 
                            required 
                            disabled={isRestrictedEdit} // User tidak bisa edit deskripsi saat mode edit
                            placeholder="Deskripsi Tiket"
                        />
                    </div>

                    {/* Teknisi (SELALU BISA DIEDIT) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teknisi (Sesuai dengan Lensa)</label>
                        <div className="relative">
                            <select className="w-full rounded-lg border-slate-300 p-2.5 pl-10 text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                value={formData.technician_nik} onChange={e => setFormData({...formData, technician_nik: e.target.value})}>
                                <option value="">- Pilih Teknisi -</option>
                                {technicians.map(t => (
                                    <option key={t.nik} value={t.nik}>{t.name} ({t.phone_number || 'No HP'})</option>
                                ))}
                            </select>
                            <FaHardHat className="absolute left-3 top-3 text-slate-400" />
                        </div>
                    </div>

                    {/* Status & Update Progress (SELALU BISA DIEDIT SAAT MODE EDIT) */}
                    {initialData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                <select className={`w-full rounded-lg border-slate-300 p-2.5 text-sm font-bold ${formData.status === 'OPEN' ? 'text-red-600 bg-red-50' : formData.status === 'SC' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'}`}
                                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                    <option value="OPEN">OPEN</option>
                                    <option value="SC">SC (Pending)</option>
                                    <option value="CLOSED">CLOSED</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Update Progress</label>
                                {/* UBAH JADI TEXTAREA */}
                                <textarea 
                                    rows="3"
                                    className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                    value={formData.update_progres} 
                                    onChange={e => setFormData({...formData, update_progres: e.target.value})}
                                    placeholder="Tulis update pengerjaan terbaru..."
                                ></textarea>
                            </div>
                        </div>
                    )}

                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 -mx-6 -mb-6">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition" type="button">Batal</button>
                        <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition disabled:opacity-50 flex items-center gap-2">
                            {loading && <FaSpinner className="animate-spin" />}{initialData ? 'Simpan Perubahan' : 'Buat Tiket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}