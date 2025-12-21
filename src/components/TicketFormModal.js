'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaHardHat } from 'react-icons/fa';

// --- KONFIGURASI KATEGORI (SESUAIKAN DISINI) ---
// Silakan ubah daftar ini sesuai dengan yang sudah kita bahas
const SUB_CATEGORIES = {
    SQUAT: ['TSEL','OLO'],
    MTEL: ['TIS', 'MMP', 'FIBERISASI'],
    UMT: ['UMT'],
    CENTRATAMA: ['FSI'],
    // Tambahkan kategori lain jika diperlukan
};

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userRole, setUserRole] = useState('');

    // Helper: Mengubah string tanggal ISO dari database agar pas di input datetime-local (WIB)
    const formatDateTimeLocal = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Menggeser waktu agar sesuai zona lokal saat ditampilkan
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 16);
    };

    // 1. Load Data Teknisi & Role User secara bersamaan (Parallel Fetching)
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            
            const fetchTechs = fetch('/api/technicians/active').then(res => res.json());
            const fetchMe = fetch('/api/me').then(res => res.ok ? res.json() : Promise.reject('Auth Error'));

            Promise.all([fetchTechs, fetchMe])
                .then(([techData, userData]) => {
                    setTechnicians(techData || []);
                    setUserRole(userData.role);
                })
                .catch(err => console.error("Gagal memuat data modal:", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    // 2. Set Form Data (Untuk Mode Edit atau Baru)
    useEffect(() => {
        if (initialData) {
            // Safety check untuk teknisi (mengambil NIK pertama jika ada banyak)
            let techNik = '';
            if (initialData.assigned_technician_niks) {
                techNik = Array.isArray(initialData.assigned_technician_niks) 
                    ? initialData.assigned_technician_niks[0] 
                    : initialData.assigned_technician_niks.split(',')[0];
            }

            setFormData({
                category: initialData.category || 'MTEL',
                subcategory: initialData.subcategory || '',
                id_tiket: initialData.id_tiket || '',
                tiket_time: formatDateTimeLocal(initialData.tiket_time),
                deskripsi: initialData.deskripsi || '',
                status: initialData.status || 'OPEN',
                update_progres: initialData.update_progres || '',
                technician_nik: techNik
            });
        } else {
            // Reset Form untuk Tiket Baru
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

    // Logika Restriksi: User biasa tidak bisa edit data inti tiket lama
    const isRestrictedEdit = userRole === 'User' && !!initialData;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const url = initialData ? `/api/tickets/${initialData.id}` : '/api/tickets';
            const method = initialData ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                // Pastikan waktu dikirim dalam format ISO UTC ke database
                tiket_time: formData.tiket_time ? new Date(formData.tiket_time).toISOString() : null,
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
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">
                        {initialData ? 'Edit Tiket' : 'Buat Tiket Baru'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition p-1 rounded-full hover:bg-slate-100">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                    
                    {/* Baris 1: Kategori & Sub Kategori */}
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

                    {/* Baris 2: ID & Waktu */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Tiket</label>
                            <input 
                                type="text" 
                                className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                value={formData.id_tiket} 
                                onChange={e => setFormData({...formData, id_tiket: e.target.value})} 
                                required 
                                disabled={isRestrictedEdit} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Waktu Tiket</label>
                            <input 
                                type="datetime-local" 
                                className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                value={formData.tiket_time} 
                                onChange={e => setFormData({...formData, tiket_time: e.target.value})} 
                                required 
                                disabled={isRestrictedEdit} 
                            />
                        </div>
                    </div>

                    {/* Deskripsi */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deskripsi</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                            value={formData.deskripsi} 
                            onChange={e => setFormData({...formData, deskripsi: e.target.value})} 
                            required 
                            disabled={isRestrictedEdit} 
                            placeholder="Deskripsi singkat tiket"
                        />
                    </div>

                    <hr className="border-slate-100" />

                    {/* Teknisi (Assignment) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teknisi (Assignment)</label>
                        <div className="relative">
                            <select 
                                className="w-full rounded-lg border-slate-300 p-2.5 pl-10 text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                value={formData.technician_nik} 
                                onChange={e => setFormData({...formData, technician_nik: e.target.value})}
                            >
                                <option value="">- Pilih Teknisi -</option>
                                {technicians.map(t => (
                                    <option key={t.nik} value={t.nik}>
                                        {t.name} {t.phone_number ? `(${t.phone_number})` : ''}
                                    </option>
                                ))}
                            </select>
                            <FaHardHat className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Status & Update (Hanya Tampil di Mode Edit) */}
                    {initialData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                <select 
                                    className={`w-full rounded-lg border-slate-300 p-2.5 text-sm font-bold 
                                        ${formData.status === 'OPEN' ? 'text-red-600 bg-white' : 
                                          formData.status === 'SC' ? 'text-yellow-600 bg-white' : 
                                          'text-green-600 bg-white'}`}
                                    value={formData.status} 
                                    onChange={e => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="OPEN">OPEN</option>
                                    <option value="SC">SC (Pending)</option>
                                    <option value="CLOSED">CLOSED</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Update Progress</label>
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

                    {/* Footer / Tombol Aksi */}
                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                            Batal
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || loading} 
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {(isSubmitting || loading) && <FaSpinner className="animate-spin" />}
                            {initialData ? 'Simpan Perubahan' : 'Buat Tiket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}