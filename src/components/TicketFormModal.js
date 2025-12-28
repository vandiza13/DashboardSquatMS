'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaHardHat, FaUserPlus } from 'react-icons/fa';

// --- KONFIGURASI KATEGORI ---
const SUB_CATEGORIES = {
    SQUAT: ['TSEL', 'OLO'],
    MTEL: ['TIS', 'MMP', 'FIBERISASI'],
    UMT: ['UMT'],
    CENTRATAMA: ['FSI'],
};

// --- DATA STO (URUT ABJAD) ---
const STO_LIST = [
    'BBL', 'BEK', 'BGG', 'CBG', 'CBR', 'CIB', 'CIK', 
    'DNI', 'EJI', 'GDM', 'JBB', 'KLB', 'KRA', 'LMA', 
    'MGB', 'PBY', 'PDE', 'PKY', 'SMH', 'STN', 'SUE', 
    'TAR', 'TBL'
].sort();

export default function TicketFormModal({ isOpen, onClose, onSuccess, initialData }) {
    // State Form Utama
    const [formData, setFormData] = useState({
        category: 'SQUAT', 
        subcategory: '',
        id_tiket: '',
        sto: '', // State untuk STO
        tiket_time: '',
        deskripsi: '',
        status: 'OPEN',
        update_progres: '',
        technician_nik: '', // PIC Utama (NIK) - OPTIONAL
    });

    // State Khusus Partner
    const [partnerNiks, setPartnerNiks] = useState([]); 
    const [tempPartner, setTempPartner] = useState('');

    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userRole, setUserRole] = useState('');

    // Helper: Format Tanggal WIB
    const formatDateTimeLocal = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 16);
    };

    // --- LOGIC PARTNER ---
    const handleAddPartner = () => {
        if (!tempPartner) return;
        if (partnerNiks.length >= 4) {
            alert("Maksimal 4 teknisi partner.");
            return;
        }
        if (partnerNiks.includes(tempPartner)) {
            alert("Teknisi ini sudah dipilih.");
            return;
        }
        if (tempPartner === formData.technician_nik) {
            alert("Teknisi ini sudah menjadi PIC Utama.");
            return;
        }

        setPartnerNiks([...partnerNiks, tempPartner]);
        setTempPartner(''); 
    };

    const handleRemovePartner = (nikToRemove) => {
        setPartnerNiks(partnerNiks.filter(nik => nik !== nikToRemove));
    };

    // 1. Fetch Data
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
                .catch(err => console.error("Error loading data:", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    // 2. SET DATA UNTUK EDIT
    useEffect(() => {
        if (initialData && technicians.length > 0) {
            let selectedTech = '';
            // Logika ambil PIC lama
            if (initialData.assigned_technician_niks) {
                if (Array.isArray(initialData.assigned_technician_niks)) {
                    selectedTech = initialData.assigned_technician_niks[0];
                } else {
                    selectedTech = String(initialData.assigned_technician_niks).split(',')[0].trim();
                }
            } else if (initialData.technician_nik) {
                selectedTech = String(initialData.technician_nik).trim();
            }
            if (!selectedTech || selectedTech === 'null') selectedTech = '';

            // Logika ambil Partner lama (Parse String -> NIK)
            let loadedPartners = [];
            if (initialData.partner_technicians) {
                const rawStrings = initialData.partner_technicians.split(',');
                rawStrings.forEach(rawStr => {
                    const fullStr = rawStr.trim(); 
                    const nameOnly = fullStr.split('(')[0].trim();
                    const tech = technicians.find(t => t.name.toLowerCase() === nameOnly.toLowerCase());
                    if (tech) loadedPartners.push(String(tech.nik));
                });
            }

            setPartnerNiks(loadedPartners);

            setFormData({
                category: initialData.category || 'SQUAT',
                subcategory: initialData.subcategory || '',
                id_tiket: initialData.id_tiket || '',
                sto: initialData.sto || '', // Load STO
                tiket_time: formatDateTimeLocal(initialData.tiket_time),
                deskripsi: initialData.deskripsi || '',
                status: initialData.status || 'OPEN',
                update_progres: initialData.update_progres || '',
                technician_nik: selectedTech,
            });
        } else {
            // Reset Form Baru
            setFormData({
                category: 'SQUAT',
                subcategory: '',
                id_tiket: '',
                sto: '', // Reset STO
                tiket_time: '',
                deskripsi: '',
                status: 'OPEN',
                update_progres: '',
                technician_nik: '',
            });
            setPartnerNiks([]);
            setTempPartner('');
        }
    }, [initialData, isOpen, technicians]);

    if (!isOpen) return null;

    const isRestrictedEdit = userRole === 'User' && !!initialData;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Format Partner jadi String
        const partnerNames = partnerNiks.map(nik => {
            const t = technicians.find(tech => String(tech.nik) === String(nik));
            return t ? `${t.name} (${t.phone_number || '-'})` : '';
        }).filter(n => n).join(', ');

        try {
            const url = initialData ? `/api/tickets/${initialData.id}` : '/api/tickets';
            const method = initialData ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                tiket_time: formData.tiket_time ? new Date(formData.tiket_time).toISOString() : null,
                // Jika PIC kosong, kirim array kosong (Backend akan handle agar tidak error)
                technician_niks: formData.technician_nik ? [formData.technician_nik] : [],
                partner_technicians: partnerNames 
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
                    
                    {/* Baris 1: Kategori */}
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

                    {/* --- INPUT STO (DROPDOWN KHUSUS SQUAT) --- */}
                    {formData.category === 'SQUAT' && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <label className="block text-xs font-bold text-blue-800 uppercase mb-1">
                                Pilih STO (SQUAT Only)
                            </label>
                            <select 
                                className="w-full rounded-lg border-blue-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700"
                                value={formData.sto} 
                                onChange={e => setFormData({...formData, sto: e.target.value})}
                            >
                                <option value="">- Pilih Kode STO -</option>
                                {STO_LIST.map((sto) => (
                                    <option key={sto} value={sto}>{sto}</option>
                                ))}
                            </select>
                        </div>
                    )}

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
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deskripsi Tiket</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                            value={formData.deskripsi} 
                            onChange={e => setFormData({...formData, deskripsi: e.target.value})} 
                            required 
                            disabled={isRestrictedEdit} 
                            placeholder="Deskripsi Tiket..."
                        />
                    </div>

                    <hr className="border-slate-100" />

                    {/* --- AREA STATUS & UPDATE (HANYA SAAT EDIT) --- */}
                    {initialData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-yellow-800 uppercase mb-1">Status Tiket</label>
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
                                <label className="block text-xs font-bold text-yellow-800 uppercase mb-1">Update Progress / RCA</label>
                                <textarea 
                                    rows="3"
                                    className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                    value={formData.update_progres} 
                                    onChange={e => setFormData({...formData, update_progres: e.target.value})}
                                    placeholder="Tulis update terbaru / Root Cause..."
                                ></textarea>
                            </div>
                        </div>
                    )}

                    {/* --- AREA TEKNISI (PIC & PARTNER) --- */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                        
                        {/* 1. PIC UTAMA (OPTIONAL) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                Teknisi Utama (LENSA)
                            </label>
                            <div className="relative">
                                <select 
                                    className="w-full rounded-lg border-slate-300 p-2.5 pl-10 text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white font-semibold text-slate-700"
                                    value={String(formData.technician_nik)} 
                                    onChange={e => setFormData({...formData, technician_nik: e.target.value})}
                                >
                                    <option value="">- Pilih Sesuai Assign Lensa -</option>
                                    {technicians.map(t => (
                                        <option key={t.nik} value={String(t.nik)}>
                                            {t.name} {t.phone_number ? `(${t.phone_number})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <FaHardHat className="absolute left-3 top-3 text-blue-500 pointer-events-none" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 ml-1">*Poin produktivitas masuk ke teknisi ini. Boleh dikosongkan jika belum assign.</p>
                        </div>

                        {/* 2. PARTNER (MULTI SELECT) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                Partner / Support (Max 4)
                            </label>
                            
                            {/* Input Dropdown + Tombol Add */}
                            <div className="flex gap-2 mb-2">
                                <div className="relative flex-1">
                                    <select 
                                        className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                                        value={tempPartner}
                                        onChange={e => setTempPartner(e.target.value)}
                                        disabled={partnerNiks.length >= 4}
                                    >
                                        <option value="">- Tambah Partner -</option>
                                        {technicians.map(t => (
                                            (String(t.nik) !== String(formData.technician_nik) && !partnerNiks.includes(String(t.nik))) && (
                                                <option key={t.nik} value={String(t.nik)}>
                                                    {t.name} {t.phone_number ? `(${t.phone_number})` : ''}
                                                </option>
                                            )
                                        ))}
                                    </select>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleAddPartner}
                                    disabled={!tempPartner || partnerNiks.length >= 4}
                                    className="px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
                                >
                                    <FaUserPlus />
                                </button>
                            </div>

                            {/* List Partner Terpilih */}
                            {partnerNiks.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {partnerNiks.map(nik => {
                                        const tech = technicians.find(t => String(t.nik) === String(nik));
                                        return (
                                            <span key={nik} className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 shadow-sm">
                                                {tech ? `${tech.name} (${tech.phone_number || '-'})` : nik}
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemovePartner(nik)}
                                                    className="ml-1 text-slate-400 hover:text-red-500"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic ml-1">Tidak ada partner.</p>
                            )}
                        </div>
                    </div>

                    {/* Tombol Simpan */}
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
                            Batal
                        </button>
                        <button type="submit" disabled={isSubmitting || loading} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition disabled:opacity-70 flex items-center gap-2">
                            {(isSubmitting || loading) && <FaSpinner className="animate-spin" />}
                            {initialData ? 'Simpan Perubahan' : 'Buat Tiket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}