'use client';

import { useState, useEffect } from 'react';
import {
    FaPlus,
    FaTrash,
    FaEdit,
    FaSpinner,
    FaNetworkWired
} from 'react-icons/fa';

export default function StoMappingsPage() {
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(true);

    // State Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE', 'EDIT'
    const [selectedMapping, setSelectedMapping] = useState(null);
    const [formData, setFormData] = useState({ sto: '', branch: '' });
    
    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');

    // --- FETCH DATA ---
    const fetchMappings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/sto-mappings');
            if (res.ok) {
                const data = await res.json();
                setMappings(data);
            } else {
                const err = await res.json();
                alert('Gagal fetch mappings: ' + (err.error || err.details || 'Unknown'));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMappings();
    }, []);

    // --- HANDLER ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            let url = '/api/admin/sto-mappings';
            let method = 'POST';

            if (modalMode === 'EDIT') {
                url = `/api/admin/sto-mappings/${selectedMapping.id}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            alert(result.message);
            setIsModalOpen(false);
            fetchMappings();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus mapping ini?')) return;
        try {
            const res = await fetch(`/api/admin/sto-mappings/${id}`, { method: 'DELETE' });
            if (res.ok) fetchMappings();
            else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (error) {
            alert('Gagal hapus');
        }
    };

    // --- MODAL TRIGGERS ---
    const openCreateModal = () => {
        setModalMode('CREATE');
        setFormData({ sto: '', branch: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (mapping) => {
        setModalMode('EDIT');
        setSelectedMapping(mapping);
        setFormData({ sto: mapping.sto, branch: mapping.branch });
        setIsModalOpen(true);
    };

    const getModalTitle = () => {
        if (modalMode === 'CREATE') return 'Tambah Mapping STO Baru';
        return 'Edit Mapping STO';
    };

    // --- FILTER ---
    const filteredMappings = mappings.filter(m => 
        m.sto.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.branch.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-10 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-[var(--bg-surface)] p-6 rounded-2xl shadow-sm border border-[var(--border-color)]">
                <div>
                    <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
                            <FaNetworkWired size={24} />
                        </div>
                        Mapping STO - Branch
                    </h2>
                    <p className="text-[var(--text-muted)] mt-2 text-sm max-w-lg">
                        Kelola relasi STO dengan Branch secara terpusat. Data ini digunakan untuk otomatisasi pengisian form tiket berdasarkan input STO.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Cari STO atau Branch..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <button onClick={openCreateModal} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95">
                        <FaPlus /> Tambah Data
                    </button>
                </div>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm">
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Mapping</p>
                    <h3 className="text-3xl font-extrabold text-[var(--text-primary)]">{mappings.length}</h3>
                </div>
                <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm">
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Branch Unik</p>
                    <h3 className="text-3xl font-extrabold text-blue-600">{new Set(mappings.map(m => m.branch)).size}</h3>
                </div>
            </div>

            {/* Table Section */}
            <div className="rounded-2xl bg-[var(--bg-surface)] shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--bg-base)] border-b border-[var(--border-subtle)] text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">
                                <th className="px-6 py-4 w-16 text-center">#</th>
                                <th className="px-6 py-4">Kode STO</th>
                                <th className="px-6 py-4">Nama Branch</th>
                                <th className="px-6 py-4 w-32 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="py-16 text-center text-[var(--text-muted)]">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-8 w-8 rounded-full border-4 border-[var(--border-color)] border-t-blue-500 animate-spin"></div>
                                            <span className="font-medium animate-pulse">Memuat data STO...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredMappings.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="bg-[var(--bg-base)] p-4 rounded-full text-[var(--text-muted)] mb-2"><FaNetworkWired size={24} /></div>
                                            <p className="text-[var(--text-secondary)] font-medium">Tidak ada data STO.</p>
                                            <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">Klik tombol "Tambah Data" untuk mulai membuat mapping baru.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredMappings.map((m, index) => (
                                    <tr key={m.id} className="group hover:bg-[var(--bg-base)] transition-colors duration-200">
                                        <td className="px-6 py-4 text-center font-bold text-[var(--text-muted)]">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-800/30">
                                                    {m.sto.substring(0, 2)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-extrabold text-[var(--text-primary)] text-base tracking-wide">{m.sto}</span>
                                                    <span className="text-[10px] text-[var(--text-muted)] font-mono opacity-0 group-hover:opacity-100 transition-opacity">ID: {m.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
                                                {m.branch}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(m)} className="p-2.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-all" title="Edit">
                                                    <FaEdit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(m.id)} className="p-2.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-all" title="Hapus">
                                                    <FaTrash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Detail */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all animate-fadeIn">
                    <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden transform scale-100 animate-scale-up">
                        <div className="bg-gradient-to-r from-[var(--bg-surface-2)] to-[var(--bg-base)] px-6 py-5 border-b border-[var(--border-subtle)] flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><FaNetworkWired /></div>
                                <h3 className="font-bold text-[var(--text-primary)] text-lg">{getModalTitle()}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-full transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Kode STO</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.sto}
                                    onChange={e => setFormData({ ...formData, sto: e.target.value.toUpperCase() })}
                                    className="w-full rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all p-3 text-sm text-[var(--text-primary)] font-bold placeholder-[var(--text-muted)] uppercase shadow-inner"
                                    placeholder="Contoh: BEK"
                                />
                                <p className="text-[10px] text-[var(--text-muted)] mt-1">Gunakan singkatan resmi 3 huruf.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Nama Branch</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.branch}
                                    onChange={e => setFormData({ ...formData, branch: e.target.value.toUpperCase() })}
                                    className="w-full rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all p-3 text-sm text-[var(--text-primary)] font-bold placeholder-[var(--text-muted)] uppercase shadow-inner"
                                    placeholder="Contoh: BEKASI"
                                />
                                <p className="text-[10px] text-[var(--text-muted)] mt-1">Nama wilayah area pelayanan STO.</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-subtle)] mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-base)] hover:bg-[var(--bg-surface-2)] transition-colors">Batal</button>
                                <button type="submit" className="px-6 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5">Simpan Data</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
