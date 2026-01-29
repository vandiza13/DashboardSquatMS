'use client';

import { useState } from 'react';
import { FaTimes, FaPlus, FaTrash, FaSave, FaSpinner, FaCopy } from 'react-icons/fa';

// Copy konfigurasi kategori & STO dari TicketFormModal agar konsisten
const SUB_CATEGORIES = {
    SQUAT: ['TSEL', 'OLO'],
    MTEL: ['TIS', 'MMP', 'FIBERISASI'],
    UMT: ['UMT'],
    CENTRATAMA: ['FSI'],
};

const STO_LIST = [
    'BBL', 'BEK', 'BGG', 'CBG', 'CBR', 'CIB', 'CIK', 
    'DNI', 'EJI', 'GDM', 'JBB', 'KLB', 'KRA', 'LMA', 
    'MGB', 'PBY', 'PDE', 'PKY', 'SMH', 'STN', 'SUE', 
    'TAR', 'TBL'
].sort();

export default function MultiTicketModal({ isOpen, onClose, onSuccess }) {
    // Inisialisasi dengan 3 baris kosong agar user langsung bisa isi
    const [rows, setRows] = useState([
        { id_tiket: '', category: 'SQUAT', subcategory: '', sto: '', deskripsi: '', tiket_time: '' },
        { id_tiket: '', category: 'SQUAT', subcategory: '', sto: '', deskripsi: '', tiket_time: '' },
        { id_tiket: '', category: 'SQUAT', subcategory: '', sto: '', deskripsi: '', tiket_time: '' }
    ]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    // --- LOGIKA FORM ---
    
    const handleAddRow = () => {
        setRows([...rows, { id_tiket: '', category: 'SQUAT', subcategory: '', sto: '', deskripsi: '', tiket_time: '' }]);
    };

    const handleRemoveRow = (index) => {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
    };

    const handleChange = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        
        // Reset subkategori jika kategori berubah
        if (field === 'category') {
            newRows[index]['subcategory'] = '';
            // Reset STO jika bukan SQUAT (opsional, tergantung rule)
            if (value !== 'SQUAT') newRows[index]['sto'] = ''; 
        }
        setRows(newRows);
    };

    // Fitur UX: Duplikat baris (berguna jika kategori/deskripsi sama persis, cuma beda ID)
    const handleDuplicateRow = (index) => {
        const rowToCopy = { ...rows[index], id_tiket: '' }; // Copy data tapi kosongkan ID
        const newRows = [...rows];
        newRows.splice(index + 1, 0, rowToCopy); // Sisipkan di bawahnya
        setRows(newRows);
    };

    const handleSubmit = async () => {
        // Filter baris yang kosong ID-nya agar tidak dikirim
        const validRows = rows.filter(r => r.id_tiket.trim() !== '');
        
        if (validRows.length === 0) {
            alert("Mohon isi minimal satu ID Tiket.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Format data sesuai API bulk yang sudah kita buat sebelumnya
            const payload = validRows.map(r => ({
                ...r,
                tiket_time: r.tiket_time ? new Date(r.tiket_time).toISOString() : new Date().toISOString()
            }));

            const res = await fetch('/api/tickets/bulk', { // REUSE API BULK
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickets: payload })
            });

            const result = await res.json();
            
            if (res.ok) {
                alert(result.message); // Tampilkan hasil sukses/gagal partial
                if (result.details?.failed === 0) {
                    onSuccess();
                    onClose();
                    // Reset form
                    setRows([{ id_tiket: '', category: 'SQUAT', subcategory: '', sto: '', deskripsi: '', tiket_time: '' }]);
                }
            } else {
                throw new Error(result.error || 'Gagal menyimpan');
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Input Tiket Massal (Multi-Row)</h3>
                        <p className="text-xs text-slate-500">Input banyak data sekaligus tanpa Excel. Kosongkan ID Tiket pada baris yang tidak dipakai.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Table Body (Scrollable) */}
                <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
                    <table className="w-full text-sm border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-slate-500 text-xs uppercase font-bold text-left">
                                <th className="px-2">Action</th>
                                <th className="px-2 w-32">ID Tiket*</th>
                                <th className="px-2 w-28">Kategori</th>
                                <th className="px-2 w-28">Sub</th>
                                <th className="px-2 w-24">STO</th>
                                <th className="px-2 w-40">Waktu</th>
                                <th className="px-2">Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={index} className="bg-white shadow-sm rounded-lg hover:shadow-md transition group">
                                    <td className="p-2 rounded-l-lg text-center flex gap-1 justify-center items-center h-full mt-1">
                                        <button onClick={() => handleDuplicateRow(index)} className="p-2 text-blue-400 hover:bg-blue-50 rounded" title="Duplikat Baris Ini">
                                            <FaCopy />
                                        </button>
                                        <button onClick={() => handleRemoveRow(index)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded" title="Hapus Baris" disabled={rows.length === 1}>
                                            <FaTrash />
                                        </button>
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            type="text" 
                                            className="w-full border-slate-200 rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs font-bold"
                                            placeholder="ID..."
                                            value={row.id_tiket}
                                            onChange={(e) => handleChange(index, 'id_tiket', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select 
                                            className="w-full border-slate-200 rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs"
                                            value={row.category}
                                            onChange={(e) => handleChange(index, 'category', e.target.value)}
                                        >
                                            {Object.keys(SUB_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <select 
                                            className="w-full border-slate-200 rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs"
                                            value={row.subcategory}
                                            onChange={(e) => handleChange(index, 'subcategory', e.target.value)}
                                        >
                                            <option value="">- Sub -</option>
                                            {SUB_CATEGORIES[row.category]?.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <select 
                                            className="w-full border-slate-200 rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs disabled:bg-slate-100"
                                            value={row.sto}
                                            onChange={(e) => handleChange(index, 'sto', e.target.value)}
                                            disabled={row.category !== 'SQUAT'}
                                        >
                                            <option value="">-</option>
                                            {STO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            type="datetime-local" 
                                            className="w-full border-slate-200 rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs"
                                            value={row.tiket_time}
                                            onChange={(e) => handleChange(index, 'tiket_time', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 rounded-r-lg">
                                        <input 
                                            type="text" 
                                            className="w-full border-slate-200 rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs"
                                            placeholder="Deskripsi..."
                                            value={row.deskripsi}
                                            onChange={(e) => handleChange(index, 'deskripsi', e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <button 
                        onClick={handleAddRow}
                        className="mt-4 w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition flex justify-center items-center gap-2 text-sm font-bold"
                    >
                        <FaPlus /> Tambah Baris Kosong
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                    <div className="text-xs text-slate-500">
                        Total Baris: <b>{rows.length}</b> | Baris Terisi (Valid): <b>{rows.filter(r => r.id_tiket).length}</b>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
                            Batal
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition disabled:opacity-70 flex items-center gap-2"
                        >
                            {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            Simpan Semua
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}