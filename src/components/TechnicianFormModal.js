'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaUserTie } from 'react-icons/fa';

export default function TechnicianFormModal({ isOpen, onClose, technicianToEdit, activeDivision }) {
    const [formData, setFormData] = useState({
        nik: '',
        name: '',
        position_name: '',
        phone_number: '',
        division: activeDivision || 'SQUAT',
        is_active: 1 // Default Active
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (technicianToEdit) {
            setFormData({
                nik: technicianToEdit.nik || '',
                name: technicianToEdit.name || '',
                position_name: technicianToEdit.position_name || '',
                phone_number: technicianToEdit.phone_number || '',
                division: technicianToEdit.division || activeDivision || 'SQUAT',
                // FIX: Pastikan status is_active lama terbawa
                is_active: technicianToEdit.is_active !== undefined ? technicianToEdit.is_active : 1
            });
        } else {
            setFormData({
                nik: '',
                name: '',
                position_name: '',
                phone_number: '',
                division: activeDivision || 'SQUAT',
                is_active: 1
            });
        }
    }, [technicianToEdit, isOpen, activeDivision]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const oldNik = technicianToEdit ? technicianToEdit.nik : null;
            const url = technicianToEdit
                ? `/api/technicians/${oldNik}`
                : '/api/technicians';

            const method = technicianToEdit ? 'PUT' : 'POST';

            const payload = technicianToEdit
                ? { ...formData, new_nik: formData.nik }
                : formData;

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Gagal menyimpan data');
            }

            onClose(true);
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold text-lg">
                        {technicianToEdit ? 'Edit Teknisi' : 'Tambah Teknisi Baru'}
                    </h3>
                    <button onClick={() => onClose(false)} className="text-slate-400 hover:text-white transition">
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    {/* NIK & Nama */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">NIK</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                value={formData.nik}
                                onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Nama Lengkap</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Divisi & Jabatan */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Divisi</label>
                            <select
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                value={formData.division}
                                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                required
                            >
                                <option value="SQUAT">SQUAT</option>
                                <option value="MS">MS</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Jabatan / Posisi</label>
                            <div className="relative">
                                <FaUserTie className="absolute left-3 top-3 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    placeholder="Contoh: Helpdesk"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-blue-500"
                                    value={formData.position_name}
                                    onChange={(e) => setFormData({ ...formData, position_name: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* No HP & Status Aktif */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Nomor HP / WA</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Status Keaktifan</label>
                            <select
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                value={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}
                            >
                                <option value={1}>Aktif</option>
                                <option value={0}>Non-Aktif</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => onClose(false)} className="px-4 py-2 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-base)] rounded-lg">Batal</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            <FaSave /> Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}