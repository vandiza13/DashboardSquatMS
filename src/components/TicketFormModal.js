'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaHardHat, FaUserPlus, FaExclamationTriangle } from 'react-icons/fa';

// --- KONFIGURASI KATEGORI ---
const SUB_CATEGORIES = {
    SQUAT: ['TSEL', 'OLO'],
    MTEL: ['TIS', 'MMP', 'FIBERISASI'],
    UMT: ['UMT'],
    CENTRATAMA: ['FSI'],
};

// --- DATA STO (URUT ABJAD) ---
// Now fetched dynamically from mappings

// --- [UPDATE] KONFIGURASI PRIORITY (SLA) ---
// 1. TSEL (Ditambah CNQ)
const TSEL_PRIORITIES = [
    { label: 'PREMIUM (2 Jam)', value: 'PREMIUM' },
    { label: 'CRITICAL (4 Jam)', value: 'CRITICAL' },
    { label: 'MAJOR (8 Jam)', value: 'MAJOR' },
    { label: 'MINOR (16 Jam)', value: 'MINOR' },
    { label: 'LOW (24 Jam)', value: 'LOW' },
    { label: 'CNQ (24 Jam)', value: 'CNQ' }, // <--- [BARU]
];

// 2. OLO (Baru)
const OLO_PRIORITIES = [
    { label: 'NON-GAMAS (4 Jam)', value: 'NON-GAMAS' },
    { label: 'GAMAS (7 Jam)', value: 'GAMAS' },
    { label: 'QUALITY (7 Jam)', value: 'QUALITY' },
];

export default function TicketFormModal({ isOpen, onClose, onSuccess, initialData }) {
    // State Form Utama
    const [formData, setFormData] = useState({
        category: 'SQUAT',
        subcategory: '',
        priority: '',
        id_tiket: '',
        id_tiket_tacc: '',
        sto: '',
        branch: '',
        tiket_time: '',
        deskripsi: '',
        status: 'OPEN',
        update_progres: '',
        technician_nik: '',
    });

    // State Khusus Partner
    const [partnerNiks, setPartnerNiks] = useState([]);
    const [tempPartner, setTempPartner] = useState('');

    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [userDivision, setUserDivision] = useState('SQUAT');
    const [stoMappings, setStoMappings] = useState([]);

    const [isWarningOpen, setIsWarningOpen] = useState(false);

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
            const fetchMappings = fetch('/api/admin/sto-mappings').then(res => res.json());

            Promise.all([fetchTechs, fetchMe, fetchMappings])
                .then(([techData, userData, mappingsData]) => {
                    setTechnicians(techData || []);
                    setStoMappings(Array.isArray(mappingsData) ? mappingsData : []);
                    setUserRole(userData.role);
                    const div = userData.division || 'SQUAT';
                    setUserDivision(div);
                    if (!initialData) {
                        setFormData(prev => ({
                            ...prev,
                            category: div === 'MS' ? 'MTEL' : 'SQUAT'
                        }));
                    }
                })
                .catch(err => console.error("Error loading data:", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, initialData]);

    // 2. SET DATA UNTUK EDIT
    useEffect(() => {
        if (initialData && technicians.length > 0) {
            let selectedTech = '';
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
                priority: initialData.priority || '',
                id_tiket: initialData.id_tiket || '',
                id_tiket_tacc: initialData.id_tiket_tacc || '',
                sto: initialData.sto || '',
                branch: initialData.branch || '',
                tiket_time: formatDateTimeLocal(initialData.tiket_time),
                deskripsi: initialData.deskripsi || '',
                status: initialData.status || 'OPEN',
                update_progres: initialData.update_progres || '',
                technician_nik: selectedTech,
            });
        } else if (!initialData && !isOpen) {
            // Reset Form Baru
            setFormData({
                category: 'SQUAT',
                subcategory: '',
                priority: '',
                id_tiket: '',
                id_tiket_tacc: '',
                sto: '',
                branch: '',
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

    // Menentukan kategori mana saja yang boleh dipilih berdasarkan Divisi User
    const allowedCategories = Object.keys(SUB_CATEGORIES).filter(cat => {
        if (userDivision === 'ALL') return true;
        if (userDivision === 'SQUAT') return cat === 'SQUAT';
        if (userDivision === 'MS') return ['MTEL', 'UMT', 'CENTRATAMA'].includes(cat);
        return false;
    });

    // --- LOGIKA SUBMIT ---
    const executeSubmit = async () => {
        setIsSubmitting(true);
        setIsWarningOpen(false);

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

    const handlePreSubmit = (e) => {
        e.preventDefault();
        if (formData.status === 'CLOSED') {
            setIsWarningOpen(true);
        } else {
            executeSubmit();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
            <div className="w-full max-w-2xl bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto relative">

                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface-2)] sticky top-0 z-10">
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">
                        {initialData ? 'Edit Tiket' : 'Buat Tiket Baru'}
                    </h3>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-red-500 transition p-1 rounded-full hover:bg-[var(--bg-base)]">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handlePreSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-5 max-h-[80vh]">

                    {/* Baris 1: Kategori */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Kategori</label>
                            <select
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value, subcategory: '', priority: '', sto: '', branch: '' })}
                                disabled={isRestrictedEdit}
                            >
                                {allowedCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Sub Kategori</label>
                            <select
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                value={formData.subcategory}
                                onChange={e => setFormData({ ...formData, subcategory: e.target.value, priority: '' })}
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

                    {/* --- [2] INPUT PRIORITY (SQUAT TSEL & OLO) --- */}
                    {formData.category === 'SQUAT' && (formData.subcategory === 'TSEL' || formData.subcategory === 'OLO') && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 animate-fadeIn">
                            <label className="block text-xs font-bold text-red-800 dark:text-red-300 uppercase mb-1">
                                Priority Tiket ({formData.subcategory} SLA) <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full rounded-lg border border-red-200 dark:border-red-700 p-2.5 text-sm focus:ring-2 focus:ring-red-500 bg-[var(--bg-surface)] font-bold text-[var(--text-primary)]"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                required
                            >
                                <option value="">- Pilih Priority -</option>
                                {(formData.subcategory === 'TSEL' ? TSEL_PRIORITIES : OLO_PRIORITIES).map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* --- INPUT STO (ALL CATEGORIES) --- */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                        <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-1">
                            Pilih STO
                        </label>
                        <select
                            className="w-full rounded-lg border border-blue-200 dark:border-blue-700 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-[var(--bg-surface)] font-medium text-[var(--text-primary)]"
                            value={formData.sto}
                            onChange={e => {
                                const selectedSto = e.target.value;
                                const mapping = stoMappings.find(m => m.sto === selectedSto);
                                setFormData({ ...formData, sto: selectedSto, branch: mapping ? mapping.branch : '' });
                            }}
                        >
                            <option value="">- Pilih Kode STO -</option>
                            {stoMappings.map((m) => (
                                <option key={m.id} value={m.sto}>{m.sto}</option>
                            ))}
                        </select>
                    </div>

                    {/* --- INPUT BRANCH (AUTO FILLED) --- */}
                    <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg border border-teal-100 dark:border-teal-800">
                        <label className="block text-xs font-bold text-teal-800 dark:text-teal-300 uppercase mb-1">
                            Branch (Otomatis)
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-lg border border-teal-200 dark:border-teal-700 p-2.5 text-sm focus:ring-2 focus:ring-teal-500 bg-[var(--bg-base)] font-medium text-[var(--text-primary)] opacity-70"
                            value={formData.branch}
                            readOnly
                            placeholder="Terisi otomatis dari STO"
                        />
                    </div>

                    {/* Baris 2: ID & Waktu */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">ID Tiket</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                value={formData.id_tiket}
                                onChange={e => setFormData({ ...formData, id_tiket: e.target.value })}
                                required
                                disabled={isRestrictedEdit}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Waktu Tiket</label>
                            <input
                                type="datetime-local"
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                value={formData.tiket_time}
                                onChange={e => setFormData({ ...formData, tiket_time: e.target.value })}
                                required
                                disabled={isRestrictedEdit}
                            />
                        </div>
                    </div>

                    {/* --- INPUT ID TIKET TACC (WAJIB UTK UMT, MTEL, CENTRATAMA) --- */}
                    {['UMT', 'MTEL', 'CENTRATAMA'].includes(formData.category) && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800 animate-fadeIn">
                            <label className="block text-xs font-bold text-purple-800 dark:text-purple-300 uppercase mb-1">
                                ID Tiket TACC <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-purple-200 dark:border-purple-700 p-2.5 text-sm focus:ring-2 focus:ring-purple-500 bg-[var(--bg-surface)] text-[var(--text-primary)]"
                                value={formData.id_tiket_tacc}
                                onChange={e => setFormData({ ...formData, id_tiket_tacc: e.target.value })}
                                placeholder="Masukkan ID TACC (Wajib)..."
                                required
                            />
                        </div>
                    )}

                    {/* Deskripsi */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Deskripsi Tiket</label>
                        <input
                            type="text"
                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                            value={formData.deskripsi}
                            onChange={e => setFormData({ ...formData, deskripsi: e.target.value })}
                            required
                            disabled={isRestrictedEdit}
                            placeholder="Deskripsi Tiket..."
                        />
                    </div>

                    <hr className="border-[var(--border-color)]" />

                    {/* --- STATUS & UPDATE (EDIT ONLY) --- */}
                    {initialData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-yellow-800 dark:text-yellow-300 uppercase mb-1">Status Tiket</label>
                                <select
                                    className={`w-full rounded-lg border border-[var(--border-color)] p-2.5 text-sm font-bold bg-[var(--bg-surface)]
                                        ${formData.status === 'OPEN' ? 'text-red-600 dark:text-red-400' :
                                            formData.status === 'SC' ? 'text-yellow-600 dark:text-yellow-400' :
                                                'text-green-600 dark:text-green-400'}`}
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="OPEN">OPEN</option>
                                    <option value="SC">SC (Pending)</option>
                                    <option value="CLOSED">CLOSED</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-yellow-800 dark:text-yellow-300 uppercase mb-1">Update Progress / RCA</label>
                                <textarea
                                    rows="3"
                                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                    value={formData.update_progres}
                                    onChange={e => setFormData({ ...formData, update_progres: e.target.value })}
                                    placeholder="Tulis update terbaru / Root Cause..."
                                ></textarea>
                            </div>
                        </div>
                    )}

                    {/* --- AREA TEKNISI --- */}
                    <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] space-y-4">
                        {/* PIC UTAMA */}
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">
                                Teknisi Utama (LENSA)
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full rounded-lg border border-[var(--border-color)] p-2.5 pl-10 text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)]"
                                    value={String(formData.technician_nik)}
                                    onChange={e => setFormData({ ...formData, technician_nik: e.target.value })}
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
                            <p className="text-[10px] text-[var(--text-muted)] mt-1 ml-1">*Poin produktivitas masuk ke teknisi ini. Boleh dikosongkan jika belum assign.</p>
                        </div>

                        {/* PARTNER */}
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">
                                Partner / Support (Max 4)
                            </label>
                            <div className="flex gap-2 mb-2 flex-col md:flex-row">
                                <div className="relative flex-1">
                                    <select
                                        className="w-full rounded-lg border border-[var(--border-color)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-[var(--bg-surface)] text-[var(--text-primary)]"
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
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                                >
                                    <FaUserPlus /> <span>Tambah</span>
                                </button>
                            </div>

                            {partnerNiks.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {partnerNiks.map(nik => {
                                        const tech = technicians.find(t => String(t.nik) === String(nik));
                                        return (
                                            <span key={nik} className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-full text-xs font-medium text-[var(--text-primary)] shadow-sm">
                                                {tech ? `${tech.name} (${tech.phone_number || '-'})` : nik}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePartner(nik)}
                                                    className="ml-1 text-[var(--text-muted)] hover:text-red-500"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-[var(--text-muted)] italic ml-1">Tidak ada partner.</p>
                            )}
                        </div>
                    </div>

                    {/* Tombol Simpan */}
                    <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-[var(--bg-surface)] py-2 border-t border-[var(--border-color)] md:static md:border-none md:py-0">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-base)] transition">
                            Batal
                        </button>
                        <button type="submit" disabled={isSubmitting || loading} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition disabled:opacity-70 flex items-center gap-2">
                            {(isSubmitting || loading) && <FaSpinner className="animate-spin" />}
                            {initialData ? 'Simpan' : 'Buat Tiket'}
                        </button>
                    </div>
                </form>

                {/* --- POPUP PERINGATAN CLOSE --- */}
                {isWarningOpen && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center border-2 border-red-500 transform scale-100 transition-transform">

                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <FaExclamationTriangle size={32} />
                            </div>

                            <h3 className="text-xl font-black text-[var(--text-primary)] mb-2 uppercase tracking-tight">
                                Konfirmasi Close
                            </h3>

                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-left">
                                <p className="text-red-600 dark:text-red-400 font-extrabold text-sm mb-2 flex items-start gap-2">
                                    <span>1.</span>
                                    MOHON PASTIKAN NAMA TEKNISI UTAMA SESUAI DENGAN CLOSE LENSA!
                                </p>
                                <p className="text-red-600 dark:text-red-400 font-extrabold text-sm flex items-start gap-2">
                                    <span>2.</span>
                                    MOHON PASTIKAN RCA SUDAH SESUAI.
                                </p>
                            </div>

                            <p className="text-xs text-[var(--text-muted)] mb-6">
                                Apakah Anda yakin data di atas sudah benar? <br />
                                Data yang sudah di-close tidak dapat diubah lagi oleh User biasa.
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsWarningOpen(false)}
                                    className="px-4 py-2.5 rounded-xl font-bold text-[var(--text-secondary)] bg-[var(--bg-base)] hover:opacity-80 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={executeSubmit}
                                    className="px-4 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 transition"
                                >
                                    Ya, Saya Yakin
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}