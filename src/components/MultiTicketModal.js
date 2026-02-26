// src/components/MultiTicketModal.js
'use client';

import { useState } from 'react';
import { FaTimes, FaPlus, FaTrash, FaSave, FaSpinner, FaCopy, FaExclamationTriangle, FaTag } from 'react-icons/fa';

// --- KONFIGURASI DATA ---
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

// Data Priority
const TSEL_PRIORITIES = ['PREMIUM', 'CRITICAL', 'MAJOR', 'MINOR', 'LOW', 'CNQ'];
const OLO_PRIORITIES = ['NON-GAMAS', 'GAMAS', 'QUALITY'];

export default function MultiTicketModal({ isOpen, onClose, onSuccess }) {
    // Inisialisasi state
    const [rows, setRows] = useState([
        { id_tiket: '', category: 'SQUAT', subcategory: '', sto: '', priority: '', id_tiket_tacc: '', deskripsi: '', tiket_time: '' },
        { id_tiket: '', category: 'SQUAT', subcategory: '', sto: '', priority: '', id_tiket_tacc: '', deskripsi: '', tiket_time: '' },
        { id_tiket: '', category: 'SQUAT', subcategory: '', sto: '', priority: '', id_tiket_tacc: '', deskripsi: '', tiket_time: '' }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    // --- LOGIKA FORM ---

    const handleAddRow = () => {
        setRows([...rows, { id_tiket: '', category: 'SQUAT', subcategory: '', sto: '', priority: '', id_tiket_tacc: '', deskripsi: '', tiket_time: '' }]);
    };

    const handleRemoveRow = (index) => {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
    };

    const handleChange = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;

        // Reset subkategori & field khusus jika kategori berubah
        if (field === 'category') {
            newRows[index]['subcategory'] = '';
            newRows[index]['priority'] = '';
            newRows[index]['id_tiket_tacc'] = '';

            if (value !== 'SQUAT') newRows[index]['sto'] = '';
        }

        // Reset Priority jika Subcategory berubah
        if (field === 'subcategory') {
            newRows[index]['priority'] = '';
        }

        setRows(newRows);
    };

    const handleDuplicateRow = (index) => {
        const rowToCopy = { ...rows[index], id_tiket: '' };
        const newRows = [...rows];
        newRows.splice(index + 1, 0, rowToCopy);
        setRows(newRows);
    };

    const handleSubmit = async () => {
        const validRows = rows.filter(r => r.id_tiket.trim() !== '');

        if (validRows.length === 0) {
            alert("Mohon isi minimal satu ID Tiket.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = validRows.map(r => ({
                ...r,
                priority: r.priority || null,
                id_tiket_tacc: r.id_tiket_tacc || null,
                tiket_time: r.tiket_time ? new Date(r.tiket_time).toISOString() : new Date().toISOString()
            }));

            const res = await fetch('/api/tickets/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickets: payload })
            });

            const result = await res.json();

            if (res.ok) {
                alert(result.message);
                if (result.details?.failed === 0) {
                    onSuccess();
                    onClose();
                    setRows([{ id_tiket: '', category: 'SQUAT', subcategory: '', sto: '', priority: '', id_tiket_tacc: '', deskripsi: '', tiket_time: '' }]);
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
            <div className="w-full max-w-7xl bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">

                <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface-2)] shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">Input Tiket Massal (Multi-Row)</h3>
                        <p className="text-xs text-[var(--text-muted)]">Input banyak data sekaligus. Kolom Priority/TACC menyesuaikan kategori.</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-red-500 transition">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 bg-[var(--bg-base)]">
                    <table className="w-full text-sm border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-[var(--text-muted)] text-xs uppercase font-bold text-left">
                                <th className="px-2 w-16 text-center">Aksi</th>
                                <th className="px-2 w-32">ID Tiket*</th>
                                <th className="px-2 w-28">Kategori</th>
                                <th className="px-2 w-28">Sub</th>
                                <th className="px-2 w-36">Priority / TACC</th>
                                <th className="px-2 w-24">STO</th>
                                <th className="px-2 w-40">Waktu</th>
                                <th className="px-2">Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => {
                                const isSquat = row.category === 'SQUAT';
                                const isTsel = row.subcategory === 'TSEL';
                                const isOlo = row.subcategory === 'OLO';
                                const showPriority = isSquat && (isTsel || isOlo);
                                const isTaccCategory = ['MTEL', 'UMT', 'CENTRATAMA'].includes(row.category);

                                return (
                                    <tr key={index} className="bg-[var(--bg-surface)] shadow-sm rounded-lg hover:shadow-md transition group">
                                        <td className="p-2 rounded-l-lg text-center flex gap-1 justify-center items-center h-full mt-1.5">
                                            <button onClick={() => handleDuplicateRow(index)} className="p-2 text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="Duplikat">
                                                <FaCopy />
                                            </button>
                                            <button onClick={() => handleRemoveRow(index)} className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Hapus" disabled={rows.length === 1}>
                                                <FaTrash />
                                            </button>
                                        </td>

                                        <td className="p-2">
                                            <input type="text" className="w-full border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs font-bold" placeholder="ID..." value={row.id_tiket} onChange={(e) => handleChange(index, 'id_tiket', e.target.value)} />
                                        </td>

                                        <td className="p-2">
                                            <select className="w-full border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs" value={row.category} onChange={(e) => handleChange(index, 'category', e.target.value)}>
                                                {Object.keys(SUB_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </td>

                                        <td className="p-2">
                                            <select className="w-full border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs" value={row.subcategory} onChange={(e) => handleChange(index, 'subcategory', e.target.value)}>
                                                <option value="">- Sub -</option>
                                                {SUB_CATEGORIES[row.category]?.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>

                                        <td className="p-2">
                                            {showPriority ? (
                                                <select
                                                    className="w-full border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded p-1.5 focus:ring-2 focus:ring-red-500 text-xs font-bold"
                                                    value={row.priority}
                                                    onChange={(e) => handleChange(index, 'priority', e.target.value)}
                                                >
                                                    <option value="">- SLA -</option>
                                                    {(isTsel ? TSEL_PRIORITIES : OLO_PRIORITIES).map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                            ) : isTaccCategory ? (
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        className="w-full border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded p-1.5 pl-6 focus:ring-2 focus:ring-purple-500 text-xs font-bold"
                                                        placeholder="ID TACC"
                                                        value={row.id_tiket_tacc}
                                                        onChange={(e) => handleChange(index, 'id_tiket_tacc', e.target.value)}
                                                    />
                                                    <FaTag className="absolute left-1.5 top-2 text-purple-400 text-[10px]" />
                                                </div>
                                            ) : (
                                                <input disabled className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded p-1.5 text-xs" placeholder="-" />
                                            )}
                                        </td>

                                        <td className="p-2">
                                            <select className="w-full border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs disabled:opacity-60" value={row.sto} onChange={(e) => handleChange(index, 'sto', e.target.value)} disabled={row.category !== 'SQUAT'}>
                                                <option value="">-</option>
                                                {STO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>

                                        <td className="p-2">
                                            <input type="datetime-local" className="w-full border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs" value={row.tiket_time} onChange={(e) => handleChange(index, 'tiket_time', e.target.value)} />
                                        </td>

                                        <td className="p-2 rounded-r-lg">
                                            <input type="text" className="w-full border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] rounded p-1.5 focus:ring-2 focus:ring-blue-500 text-xs" placeholder="Deskripsi..." value={row.deskripsi} onChange={(e) => handleChange(index, 'deskripsi', e.target.value)} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <button onClick={handleAddRow} className="mt-4 w-full py-2 border-2 border-dashed border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex justify-center items-center gap-2 text-sm font-bold">
                        <FaPlus /> Tambah Baris Kosong
                    </button>
                </div>

                <div className="px-6 py-4 bg-[var(--bg-surface-2)] border-t border-[var(--border-color)] flex justify-between items-center shrink-0">
                    <div className="text-xs text-[var(--text-muted)]">
                        Total: <b>{rows.length}</b> | Valid: <b>{rows.filter(r => r.id_tiket).length}</b>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-base)] transition">Batal</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition disabled:opacity-70 flex items-center gap-2">
                            {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSave />} Simpan Semua
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}