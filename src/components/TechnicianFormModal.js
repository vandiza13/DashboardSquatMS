'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaSave, FaUser, FaIdCard, FaPhone } from 'react-icons/fa';

export default function TechnicianFormModal({ isOpen, onClose, onSuccess, initialData }) {
    const [formData, setFormData] = useState({
        nik: '',
        name: '',
        phone_number: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reset form atau isi data saat modal dibuka
    useEffect(() => {
        if (isOpen) {
            setError('');
            if (initialData) {
                setFormData({
                    nik: initialData.nik,
                    name: initialData.name,
                    phone_number: initialData.phone_number || ''
                });
            } else {
                setFormData({
                    nik: '',
                    name: '',
                    phone_number: ''
                });
            }
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Tentukan URL dan Method (POST untuk baru, PUT untuk edit)
            const url = initialData 
                ? `/api/technicians/${initialData.nik}` 
                : '/api/technicians';
            
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Gagal menyimpan data teknisi');
            }

            onSuccess(); // Refresh data di halaman induk
            onClose();   // Tutup modal
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">
                        {initialData ? 'Edit Teknisi' : 'Tambah Teknisi Baru'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Input NIK */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NIK</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                placeholder="Nomor Induk Karyawan"
                                value={formData.nik}
                                onChange={(e) => setFormData({...formData, nik: e.target.value})}
                                required
                                disabled={!!initialData} // NIK tidak bisa diedit
                            />
                            <FaIdCard className="absolute left-3 top-3 text-slate-400" />
                        </div>
                        {initialData && <p className="text-[10px] text-slate-400 mt-1">*NIK tidak dapat diubah</p>}
                    </div>

                    {/* Input Nama */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Nama Teknisi"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                            <FaUser className="absolute left-3 top-3 text-slate-400" />
                        </div>
                    </div>

                    {/* Input No HP */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nomor HP / WhatsApp</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="08xxxxxxxxxx"
                                value={formData.phone_number}
                                onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                            />
                            <FaPhone className="absolute left-3 top-3 text-slate-400" />
                        </div>
                    </div>

                    {/* Footer / Buttons */}
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
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}