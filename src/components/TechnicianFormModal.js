'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaUserTie } from 'react-icons/fa';

export default function TechnicianFormModal({ isOpen, onClose, technicianToEdit }) {
    const [formData, setFormData] = useState({
        nik: '',
        name: '',
        position_name: '',
        phone_number: '',
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
                // FIX: Pastikan status is_active lama terbawa
                is_active: technicianToEdit.is_active !== undefined ? technicianToEdit.is_active : 1
            });
        } else {
            setFormData({ 
                nik: '', 
                name: '', 
                position_name: '', 
                phone_number: '',
                is_active: 1 
            });
        }
    }, [technicianToEdit, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = technicianToEdit 
                ? `/api/technicians/${technicianToEdit.nik}` 
                : '/api/technicians';
            
            const method = technicianToEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Gagal menyimpan data');
            
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
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">
                        {technicianToEdit ? 'Edit Teknisi' : 'Tambah Teknisi Baru'}
                    </h3>
                    <button onClick={() => onClose(false)} className="text-slate-400 hover:text-white">
                        <FaTimes />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* NIK & Nama */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NIK</label>
                            <input 
                                type="text" 
                                required 
                                disabled={!!technicianToEdit} 
                                className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                                value={formData.nik}
                                onChange={(e) => setFormData({...formData, nik: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                            <input 
                                type="text" 
                                required 
                                className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Jabatan */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jabatan / Posisi</label>
                        <div className="relative">
                            <FaUserTie className="absolute left-3 top-3 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Contoh: Helpdesk, Teknisi Lapangan"
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                                value={formData.position_name}
                                onChange={(e) => setFormData({...formData, position_name: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* No HP */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nomor HP / WhatsApp</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                            value={formData.phone_number}
                            onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                        />
                    </div>

                    {/* FIELD BARU: STATUS AKTIF (Optional: Bisa dimatikan jika teknisi resign) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Keaktifan</label>
                        <select 
                            className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                            value={formData.is_active}
                            onChange={(e) => setFormData({...formData, is_active: parseInt(e.target.value)})}
                        >
                            <option value={1}>Aktif</option>
                            <option value={0}>Non-Aktif (Resign/Cuti)</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => onClose(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            <FaSave /> Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}