'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaTicketAlt, FaLayerGroup, FaTags } from 'react-icons/fa';

// 1. DEFINISI MAPPING KATEGORI -> SUB KATEGORI
const CATEGORY_MAPPING = {
    'SQUAT': ['TSEL', 'OLO'],
    'MTEL': ['FIBERISASI', 'TIS', 'MMP'],
    'CENTRATAMA': ['FSI']
};

export default function TicketFormModal({ isOpen, onClose, ticketToEdit }) {
    const [formData, setFormData] = useState({
        category: '',
        subcategory: '',
        id_tiket: '',
        deskripsi: '',
        technician_nik: ''
    });
    
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(false);

    // Ambil data teknisi untuk dropdown
    useEffect(() => {
        if (isOpen) {
            fetch('/api/technicians')
                .then(res => res.json())
                .then(data => setTechnicians(Array.isArray(data) ? data : []))
                .catch(err => console.error('Gagal load teknisi:', err));
        }
    }, [isOpen]);

    // Set Form Data saat Edit atau Reset saat Baru
    useEffect(() => {
        if (ticketToEdit) {
            setFormData({
                category: ticketToEdit.category || '',
                subcategory: ticketToEdit.subcategory || '',
                id_tiket: ticketToEdit.id_tiket || '',
                deskripsi: ticketToEdit.deskripsi || '',
                technician_nik: ticketToEdit.technician_nik || ''
            });
        } else {
            setFormData({
                category: '',
                subcategory: '',
                id_tiket: '',
                deskripsi: '',
                technician_nik: ''
            });
        }
    }, [ticketToEdit, isOpen]);

    // 2. HANDLE PERUBAHAN KATEGORI
    const handleCategoryChange = (e) => {
        const newCategory = e.target.value;
        setFormData(prev => ({
            ...prev,
            category: newCategory,
            subcategory: '' // Reset sub kategori saat kategori induk berubah
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = ticketToEdit ? `/api/tickets/${ticketToEdit.id}` : '/api/tickets';
            const method = ticketToEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Gagal menyimpan tiket');
            
            onClose(true); // Tutup dan refresh data
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Ambil list sub kategori berdasarkan kategori yang dipilih saat ini
    const currentSubCategories = CATEGORY_MAPPING[formData.category] || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FaTicketAlt className="text-blue-400" />
                        {ticketToEdit ? 'Edit Tiket' : 'Buat Tiket Baru'}
                    </h3>
                    <button onClick={() => onClose(false)} className="text-slate-400 hover:text-white transition">
                        <FaTimes size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* INPUT KATEGORI */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <FaLayerGroup /> Kategori
                            </label>
                            <select 
                                className="w-full rounded-xl border-slate-300 p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-slate-50 transition-all"
                                value={formData.category}
                                onChange={handleCategoryChange}
                                required
                            >
                                <option value="">- Pilih Kategori -</option>
                                <option value="SQUAT">SQUAT</option>
                                <option value="MTEL">MTEL</option>
                                <option value="CENTRATAMA">CENTRATAMA</option>
                            </select>
                        </div>

                        {/* INPUT SUB KATEGORI (DINAMIS) */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <FaTags /> Sub Kategori
                            </label>
                            <select 
                                className="w-full rounded-xl border-slate-300 p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                value={formData.subcategory}
                                onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                                required
                                disabled={!formData.category} // Disable jika kategori belum dipilih
                            >
                                <option value="">- Pilih Sub -</option>
                                {currentSubCategories.map((sub) => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* ID TIKET */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ID Tiket</label>
                        <input 
                            type="text" 
                            placeholder="Contoh: IN12345678"
                            className="w-full rounded-xl border-slate-300 p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none font-mono"
                            value={formData.id_tiket}
                            onChange={(e) => setFormData({...formData, id_tiket: e.target.value})}
                            required
                        />
                    </div>

                    {/* DESKRIPSI */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deskripsi</label>
                        <textarea 
                            rows="3"
                            placeholder="Deskripsi masalah..."
                            className="w-full rounded-xl border-slate-300 p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                            value={formData.deskripsi}
                            onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                        ></textarea>
                    </div>

                    {/* PILIH TEKNISI */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teknisi (Sesuai dengan Lensa)</label>
                        <select 
                            className="w-full rounded-xl border-slate-300 p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-slate-50"
                            value={formData.technician_nik}
                            onChange={(e) => setFormData({...formData, technician_nik: e.target.value})}
                        >
                            <option value="">- Pilih Teknisi -</option>
                            {technicians.filter(t => t.is_active).map((tech) => (
                                <option key={tech.nik} value={tech.nik}>
                                    {tech.name} {tech.position_name ? `(${tech.position_name})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* FOOTER BUTTONS */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
                        <button 
                            type="button" 
                            onClick={() => onClose(false)} 
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {loading ? 'Menyimpan...' : <><FaSave /> {ticketToEdit ? 'Simpan Perubahan' : 'Buat Tiket'}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}