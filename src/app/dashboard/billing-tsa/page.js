'use client';

import { useState, useEffect } from 'react';
import { FaDatabase, FaPlus, FaSave, FaSpinner, FaEdit } from 'react-icons/fa';

export default function BillingTSAPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monthYear, setMonthYear] = useState('');
    const [totalSites, setTotalSites] = useState('');
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        fetch('/api/me').then(res => res.json()).then(data => setUserRole(data.role));
        fetchData();
        
        const now = new Date();
        const currentYearStr = now.getFullYear().toString();
        const currentMonthStr = (now.getMonth() + 1).toString().padStart(2, '0');
        setMonthYear(`${currentYearStr}-${currentMonthStr}`);
    }, []);

    if (userRole && userRole !== 'SuperAdmin') {
        return <div className="p-10 text-center text-red-500 font-bold">Akses Ditolak: Halaman ini hanya untuk SuperAdmin.</div>;
    }

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/billing-tsa');
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/billing-tsa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    month_year: monthYear,
                    total_sites: parseInt(totalSites, 10)
                })
            });
            const result = await res.json();
            if (result.success) {
                alert('Berhasil menyimpan target Billing TSA');
                setTotalSites('');
                setIsEditing(false);
                fetchData();
            } else {
                alert(result.error || 'Gagal menyimpan data');
            }
        } catch (error) {
            alert('Terjadi kesalahan jaringan');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (row) => {
        setMonthYear(row.month_year);
        setTotalSites(row.total_sites);
        setIsEditing(true);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6 flex flex-col gap-2">
                <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
                    <FaDatabase className="text-emerald-500" />
                    Manajemen Billing TSA
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">Atur Total Site Billing per bulan untuk perhitungan TSA di SLA Performance.</p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-sm p-6 mb-8">
                <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider">{isEditing ? 'Update Billing TSA' : 'Tambah Billing TSA Baru'}</h2>
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Bulan (YYYY-MM)</label>
                        <input
                            type="month"
                            value={monthYear}
                            onChange={(e) => setMonthYear(e.target.value)}
                            required
                            className="w-full px-4 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Total Sites</label>
                        <input
                            type="number"
                            value={totalSites}
                            onChange={(e) => setTotalSites(e.target.value)}
                            placeholder="Contoh: 726"
                            required
                            className="w-full px-4 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {isEditing && (
                            <button type="button" onClick={() => { setIsEditing(false); setTotalSites(''); }} className="px-4 py-2 text-sm font-bold text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-surface)] transition-all">
                                Batal
                            </button>
                        )}
                        <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50">
                            {saving ? <FaSpinner className="animate-spin" /> : (isEditing ? <FaSave /> : <FaPlus />)}
                            {isEditing ? 'Simpan' : 'Tambah'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-base)]">
                    <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Histori Target Billing</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--bg-base)] text-[var(--text-secondary)] uppercase tracking-wider font-extrabold border-b border-[var(--border-color)] text-[11px]">
                            <tr>
                                <th className="px-6 py-3.5">Bulan</th>
                                <th className="px-6 py-3.5">Total Sites</th>
                                <th className="px-6 py-3.5">Diperbarui Oleh</th>
                                <th className="px-6 py-3.5">Waktu Update</th>
                                <th className="px-6 py-3.5 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-[var(--text-muted)]">
                                        <FaSpinner className="animate-spin inline mr-2" /> Memuat data...
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-[var(--text-muted)]">
                                        Belum ada data Billing TSA.
                                    </td>
                                </tr>
                            ) : data.map((row) => (
                                <tr key={row.id} className="hover:bg-[var(--bg-base)] transition-colors">
                                    <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.month_year}</td>
                                    <td className="px-6 py-4 font-black text-emerald-600 dark:text-emerald-400">{row.total_sites}</td>
                                    <td className="px-6 py-4 text-[var(--text-secondary)]">{row.updated_by || '-'}</td>
                                    <td className="px-6 py-4 text-[11px] text-[var(--text-muted)]">
                                        {new Date(row.updated_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleEdit(row)} className="p-2 text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Edit">
                                            <FaEdit size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
