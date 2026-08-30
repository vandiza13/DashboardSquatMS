'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    FaChartLine, 
    FaTimes, 
    FaSpinner, 
    FaSearch, 
    FaFileExcel, 
    FaExternalLinkAlt, 
    FaStopwatch 
} from 'react-icons/fa';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function MttriComplianceTable({ data, selectedMonth, selectedYear }) {
    const [mounted, setMounted] = useState(false);
    const [modalState, setModalState] = useState({
        isOpen: false,
        loading: false,
        branch: '',
        severity: '',
        type: '', // 'comply' | 'not_comply'
        tickets: []
    });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const targetReference = [
        { severity: 'LOW', targetPct: '91%', targetHours: '24 Jam' },
        { severity: 'MINOR', targetPct: '91%', targetHours: '16 Jam' },
        { severity: 'MAJOR', targetPct: '82%', targetHours: '8 Jam' },
        { severity: 'CRITICAL', targetPct: '73%', targetHours: '4 Jam' }
    ];

    const monthParam = selectedYear && selectedMonth 
        ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
        : '';

    const handleOpenDetail = async (branch, severity, type, count) => {
        if (!count || count <= 0) return;

        setModalState({
            isOpen: true,
            loading: true,
            branch,
            severity,
            type,
            tickets: []
        });
        setSearchQuery('');

        try {
            const params = new URLSearchParams({
                branch,
                severity,
                type,
                month: monthParam
            });

            const res = await fetch(`/api/stats/mttri-details?${params.toString()}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Gagal mengambil data detail');
            }
            const result = await res.json();
            setModalState(prev => ({ ...prev, loading: false, tickets: Array.isArray(result) ? result : [] }));
        } catch (err) {
            console.error("Gagal load MTTRi detail:", err);
            setModalState(prev => ({ ...prev, loading: false, tickets: [] }));
        }
    };

    const handleCloseModal = () => {
        setModalState(prev => ({ ...prev, isOpen: false, tickets: [] }));
    };

    const handleExportExcel = () => {
        if (!modalState.tickets.length) return;

        const exportData = modalState.tickets.map((t, idx) => ({
            'No': idx + 1,
            'ID Tiket': t.id_tiket,
            'Kategori': `${t.category}-${t.subcategory}`,
            'Branch': t.branch || '-',
            'STO': t.sto || '-',
            'Severity': t.priority || '-',
            'TTR (Jam)': t.ttr_tacc || '-',
            'Target SLA': `${t.targetHours} Jam`,
            'Status SLA': t.isComply ? 'COMPLY' : 'NOT COMPLY',
            'Waktu Tiket': t.tiket_time ? new Date(t.tiket_time).toLocaleString('id-ID') : '-',
            'Waktu Closed': t.last_update_time ? new Date(t.last_update_time).toLocaleString('id-ID') : '-',
            'Teknisi': t.technician_name || 'Belum assign',
            'No HP': t.technician_phone || '-',
            'Support': t.partner_technicians || '-',
            'Deskripsi': t.deskripsi || '-',
            'RCA / Progress': t.update_progres || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "MTTRi Details");
        XLSX.writeFile(wb, `MTTRi_${modalState.type.toUpperCase()}_${modalState.branch}_${modalState.severity}_${monthParam || 'Current'}.xlsx`);
    };

    // Filter tickets in modal based on search input
    const filteredTickets = modalState.tickets.filter(t => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (t.id_tiket && t.id_tiket.toLowerCase().includes(q)) ||
            (t.sto && t.sto.toLowerCase().includes(q)) ||
            (t.deskripsi && t.deskripsi.toLowerCase().includes(q)) ||
            (t.technician_name && t.technician_name.toLowerCase().includes(q))
        );
    });

    return (
        <div className="rounded-2xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)] space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
                <div>
                    <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2.5 tracking-tight">
                        <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                            <FaChartLine size={17} />
                        </span>
                        Tabel MTTRi Compliance (SQUAT TSEL)
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                        Monitoring pencapaian SLA TTR per Branch & Severity (MTD)
                    </p>
                </div>

                {/* Target SLA Reference Badges */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5 mr-1">
                        <span className="h-2 w-2 rounded-full bg-indigo-500"></span> Target:
                    </span>
                    {targetReference.map(t => (
                        <div key={t.severity} className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] text-xs font-semibold shadow-xs">
                            <span className="text-[var(--text-secondary)] font-bold">{t.severity}</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-black font-mono">{t.targetPct}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-normal">({t.targetHours})</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                <table className="w-full border-collapse text-xs text-center">
                    <thead>
                        <tr className="bg-[var(--bg-base)] text-[var(--text-secondary)] border-b border-[var(--border-color)] font-extrabold text-[11px] uppercase tracking-wider">
                            <th rowSpan="2" className="py-3 px-3 border-r border-[var(--border-color)] w-14">NO</th>
                            <th rowSpan="2" className="py-3 px-4 border-r border-[var(--border-color)] min-w-[130px]">BRANCH</th>
                            <th rowSpan="2" className="py-3 px-4 border-r border-[var(--border-color)] min-w-[110px]">SEVERITY</th>
                            <th colSpan="4" className="py-2.5 px-4 border-b border-[var(--border-color)] bg-slate-200/50 dark:bg-slate-800/60 font-black text-[var(--text-primary)]">
                                TIKET MTD
                            </th>
                        </tr>
                        <tr className="bg-[var(--bg-base)]/80 text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-wider border-b border-[var(--border-color)]">
                            <th className="py-2.5 px-3 border-r border-[var(--border-color)] min-w-[100px]">JUMLAH TIKET</th>
                            <th className="py-2.5 px-3 border-r border-[var(--border-color)] min-w-[90px]">COMPLY</th>
                            <th className="py-2.5 px-3 border-r border-[var(--border-color)] min-w-[100px]">NOT COMPLY</th>
                            <th className="py-2.5 px-3 min-w-[100px]">TTR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                        {data.map((branchGroup, bIdx) => (
                            <React.Fragment key={branchGroup.branch}>
                                {branchGroup.severities.map((row, rIdx) => (
                                    <tr key={row.severity} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                        {rIdx === 0 && (
                                            <>
                                                <td 
                                                    rowSpan={branchGroup.severities.length + 1} 
                                                    className="p-3 font-black text-[var(--text-muted)] border-r border-[var(--border-color)] align-middle bg-[var(--bg-surface)] text-xs"
                                                >
                                                    {bIdx + 1}
                                                </td>
                                                <td 
                                                    rowSpan={branchGroup.severities.length + 1} 
                                                    className="p-3 font-black text-[var(--text-primary)] border-r border-[var(--border-color)] align-middle bg-[var(--bg-surface)] text-sm tracking-wide"
                                                >
                                                    {branchGroup.branch}
                                                </td>
                                            </>
                                        )}
                                        <td className="py-2.5 px-4 font-bold text-[var(--text-secondary)] border-r border-[var(--border-color)] text-left pl-5 tracking-wide">
                                            {row.severity}
                                        </td>
                                        <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border-color)] font-mono">
                                            {row.total}
                                        </td>
                                        
                                        {/* COMPLY CELL */}
                                        <td className="py-2.5 px-3 border-r border-[var(--border-color)] font-mono">
                                            {row.comply > 0 ? (
                                                <button 
                                                    onClick={() => handleOpenDetail(branchGroup.branch, row.severity, 'comply', row.comply)}
                                                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                                    title="Lihat detail tiket Comply"
                                                >
                                                    {row.comply}
                                                </button>
                                            ) : (
                                                <span className="text-[var(--text-muted)] opacity-40 font-normal">0</span>
                                            )}
                                        </td>

                                        {/* NOT COMPLY CELL */}
                                        <td className="py-2.5 px-3 border-r border-[var(--border-color)] font-mono">
                                            {row.notComply > 0 ? (
                                                <button 
                                                    onClick={() => handleOpenDetail(branchGroup.branch, row.severity, 'not_comply', row.notComply)}
                                                    className="font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                                    title="Lihat detail tiket Not Comply"
                                                >
                                                    {row.notComply}
                                                </button>
                                            ) : (
                                                <span className="text-[var(--text-muted)] opacity-40 font-normal">0</span>
                                            )}
                                        </td>

                                        {/* TTR PERCENTAGE BADGE */}
                                        <td className="py-2 px-3 border-l border-[var(--border-color)] font-mono">
                                            <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold font-mono ${
                                                row.isMet 
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                            }`}>
                                                {parseFloat(row.pct).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                
                                {/* TOTAL ROW PER BRANCH */}
                                <tr className="bg-slate-100/60 dark:bg-slate-800/50 font-black border-b-2 border-[var(--border-color)]">
                                    <td className="py-2.5 px-4 text-left pl-5 border-r border-[var(--border-color)] uppercase tracking-wider text-[11px] text-[var(--text-primary)]">
                                        TOTAL
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[var(--text-primary)] border-r border-[var(--border-color)]">
                                        {branchGroup.total.total}
                                    </td>

                                    {/* TOTAL COMPLY */}
                                    <td className="py-2.5 px-3 border-r border-[var(--border-color)] font-mono">
                                        {branchGroup.total.comply > 0 ? (
                                            <button 
                                                onClick={() => handleOpenDetail(branchGroup.branch, 'TOTAL', 'comply', branchGroup.total.comply)}
                                                className="font-black text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                                title="Lihat detail seluruh tiket Comply"
                                            >
                                                {branchGroup.total.comply}
                                            </button>
                                        ) : (
                                            <span className="text-[var(--text-muted)] opacity-40 font-normal">0</span>
                                        )}
                                    </td>

                                    {/* TOTAL NOT COMPLY */}
                                    <td className="py-2.5 px-3 border-r border-[var(--border-color)] font-mono">
                                        {branchGroup.total.notComply > 0 ? (
                                            <button 
                                                onClick={() => handleOpenDetail(branchGroup.branch, 'TOTAL', 'not_comply', branchGroup.total.notComply)}
                                                className="font-black text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                                title="Lihat detail seluruh tiket Not Comply"
                                            >
                                                {branchGroup.total.notComply}
                                            </button>
                                        ) : (
                                            <span className="text-[var(--text-muted)] opacity-40 font-normal">0</span>
                                        )}
                                    </td>

                                    {/* TOTAL TTR PERCENTAGE */}
                                    <td className="py-2 px-3 border-l border-[var(--border-color)] font-mono">
                                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-extrabold font-mono bg-slate-200/60 dark:bg-slate-700/60 text-[var(--text-primary)] border border-slate-300/40 dark:border-slate-600/40">
                                            {parseFloat(branchGroup.total.pct).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                        </span>
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* DETAIL MODAL (PORTAL TO DOCUMENT.BODY) */}
            {modalState.isOpen && mounted && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="w-full max-w-5xl bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden flex flex-col max-h-[85vh] my-auto relative">
                        
                        {/* Header Modal */}
                        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-slate-900 text-white shrink-0">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h3 className="font-bold text-lg text-white tracking-tight">
                                        Detail Tiket MTTRi: {modalState.branch}
                                    </h3>
                                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider ${
                                        modalState.type === 'comply'
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-rose-500 text-white'
                                    }`}>
                                        {modalState.type === 'comply' ? 'COMPLY' : 'NOT COMPLY'}
                                    </span>
                                    {modalState.severity !== 'TOTAL' && (
                                        <span className="px-2.5 py-0.5 rounded-md bg-slate-700 text-slate-200 text-xs font-bold font-mono">
                                            {modalState.severity}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-300 mt-1">
                                    Total: <span className="font-bold font-mono text-white">{modalState.tickets.length}</span> Tiket ditemukan
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {modalState.tickets.length > 0 && (
                                    <button 
                                        onClick={handleExportExcel}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                                    >
                                        <FaFileExcel /> Export Excel
                                    </button>
                                )}
                                <button 
                                    onClick={handleCloseModal}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 bg-[var(--bg-base)] border-b border-[var(--border-color)] flex items-center justify-between gap-4 shrink-0">
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
                                <input 
                                    type="text"
                                    placeholder="Cari ID Tiket, STO, Teknisi, atau deskripsi..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition"
                                />
                            </div>
                        </div>

                        {/* Modal Body / Table */}
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                            {modalState.loading ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-2 text-indigo-600">
                                    <FaSpinner className="animate-spin text-3xl" />
                                    <span className="text-xs font-bold text-[var(--text-secondary)]">Memuat detail tiket...</span>
                                </div>
                            ) : filteredTickets.length === 0 ? (
                                <div className="py-16 text-center text-[var(--text-muted)]">
                                    <p className="text-sm font-bold">Tidak ada tiket ditemukan.</p>
                                </div>
                            ) : (
                                <div className="border border-[var(--border-color)] rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-[var(--bg-base)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-bold text-[11px] uppercase tracking-wider">
                                                <th className="p-3">ID Tiket</th>
                                                <th className="p-3">Severity</th>
                                                <th className="p-3">STO / Branch</th>
                                                <th className="p-3 text-center">TTR (Jam)</th>
                                                <th className="p-3 text-center">Target SLA</th>
                                                <th className="p-3 text-center">Status</th>
                                                <th className="p-3">Teknisi</th>
                                                <th className="p-3">Deskripsi / RCA</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-subtle)]">
                                            {filteredTickets.map((t) => (
                                                <tr key={t.id} className="hover:bg-[var(--bg-base)] transition-colors">
                                                    <td className="p-3 font-bold">
                                                        <Link 
                                                            href={`/dashboard/tickets/${t.id}`}
                                                            target="_blank"
                                                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono text-xs"
                                                        >
                                                            {t.id_tiket}
                                                            <FaExternalLinkAlt size={9} />
                                                        </Link>
                                                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5 font-normal">
                                                            {t.tiket_time ? new Date(t.tiket_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-white dark:bg-slate-700 text-[10px] font-extrabold font-mono">
                                                            {t.priority || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-bold text-[var(--text-primary)]">{t.sto || '-'}</span>
                                                        <span className="block text-[10px] text-[var(--text-muted)]">{t.branch || '-'}</span>
                                                    </td>
                                                    <td className="p-3 text-center font-mono font-bold text-xs">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                                                            t.isComply
                                                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                            : 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                                                        }`}>
                                                            <FaStopwatch size={10} /> {t.ttr_tacc}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center text-xs font-semibold text-[var(--text-muted)] font-mono">
                                                        {t.targetHours} Jam
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                            t.isComply
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                                                        }`}>
                                                            {t.isComply ? 'COMPLY' : 'NOT COMPLY'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="font-bold text-[var(--text-primary)]">{t.technician_name || <span className="italic font-normal text-[var(--text-muted)]">Belum assign</span>}</div>
                                                        {t.technician_phone && <div className="text-[10px] text-green-600 font-mono">{t.technician_phone}</div>}
                                                    </td>
                                                    <td className="p-3 max-w-xs">
                                                        <div className="line-clamp-2 text-xs text-[var(--text-primary)]" title={t.deskripsi}>
                                                            {t.deskripsi || '-'}
                                                        </div>
                                                        {t.update_progres && (
                                                            <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-1 rounded border border-amber-200 dark:border-amber-800/40 line-clamp-2" title={t.update_progres}>
                                                                <span className="font-bold">RCA:</span> {t.update_progres}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3.5 bg-[var(--bg-base)] border-t border-[var(--border-color)] flex justify-between items-center shrink-0">
                            <span className="text-xs text-[var(--text-muted)] font-medium">
                                Menampilkan {filteredTickets.length} dari {modalState.tickets.length} tiket
                            </span>
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 text-[var(--text-primary)] hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold rounded-xl transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
