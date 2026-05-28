'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaGlobe } from 'react-icons/fa';

export default function MtelSiteFormModal({ isOpen, onClose, onSuccess, initialData }) {
    const [formData, setFormData] = useState({
        site_id: '',
        site_name: '',
        latitude: '',
        longitude: '',
        sto: '',
        keterangan: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    site_id: initialData.site_id || '',
                    site_name: initialData.site_name || '',
                    latitude: initialData.latitude || '',
                    longitude: initialData.longitude || '',
                    sto: initialData.sto || '',
                    keterangan: initialData.keterangan || ''
                });
            } else {
                setFormData({
                    site_id: '',
                    site_name: '',
                    latitude: '',
                    longitude: '',
                    sto: '',
                    keterangan: ''
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const url = initialData ? `/api/mtel-sites/${initialData.id}` : '/api/mtel-sites';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan data');

            alert(initialData ? 'Data site berhasil diperbarui' : 'Site berhasil ditambahkan');
            onSuccess();
            onClose();
        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto relative border border-[var(--border-color)] animate-[fadeIn_0.2s_ease_forwards]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface-2)]">
                    <div>
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">
                            {initialData ? `Edit Site MTEL: ${formData.site_id}` : 'Tambah Site MTEL Baru'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-red-500 transition p-1.5 rounded-full hover:bg-[var(--bg-base)]">
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-4">
                        
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-blue-500 uppercase tracking-wide flex items-center gap-1"><FaGlobe /> Informasi General & GPS</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Site ID <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.site_id}
                                        onChange={e => setFormData({ ...formData, site_id: e.target.value })}
                                        placeholder="Contoh: MTEL001"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Nama Site</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.site_name}
                                        onChange={e => setFormData({ ...formData, site_name: e.target.value })}
                                        placeholder="Contoh: Site Sudirman"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">STO</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.sto}
                                    onChange={e => setFormData({ ...formData, sto: e.target.value })}
                                    placeholder="Contoh: CBR"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Latitude (Koordinat)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.latitude}
                                        onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                        placeholder="-6.234900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Longitude (Koordinat)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.longitude}
                                        onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                        placeholder="106.989200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Keterangan / Notes</label>
                                <textarea
                                    rows="3"
                                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.keterangan}
                                    onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                                    placeholder="Keterangan tambahan..."
                                />
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-[var(--bg-surface-2)] border-t border-[var(--border-color)] flex justify-end items-center sticky bottom-0 z-10 gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-base)] transition"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg text-xs font-black text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/25 transition disabled:opacity-75 flex items-center gap-1.5"
                        >
                            {isSubmitting ? <FaSpinner className="animate-spin" /> : null}
                            {initialData ? 'Simpan Perubahan' : 'Buat Site'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
