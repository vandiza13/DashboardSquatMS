'use client';

import React, { useState, useEffect } from 'react';
import { 
    FaBroadcastTower, 
    FaCopy, 
    FaCheck, 
    FaCheckCircle, 
    FaTimesCircle, 
    FaClock, 
    FaShieldAlt, 
    FaExclamationTriangle,
    FaInfoCircle,
    FaChevronDown,
    FaChevronUp,
    FaSpinner
} from 'react-icons/fa';

export default function TsaComplianceTable({ selectedMonth, selectedYear }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [showTopTickets, setShowTopTickets] = useState(false);

    const fetchTsaData = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = '/api/stats/tsa';
            if (selectedMonth && selectedYear) {
                const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
                url = `/api/stats/tsa?month=${monthStr}`;
            }
            
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Gagal memuat data KPI TSA');
            }
            const resData = await res.json();
            setData(resData);
        } catch (err) {
            console.error("Error loading TSA stats:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTsaData();
    }, [selectedMonth, selectedYear]);

    const handleCopyBroadcast = () => {
        if (!data?.broadcastText) return;
        navigator.clipboard.writeText(data.broadcastText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    if (loading) {
        return (
            <div className="rounded-2xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)] flex flex-col items-center justify-center py-12 gap-3 text-indigo-600">
                <FaSpinner className="animate-spin text-3xl" />
                <span className="text-xs font-bold text-[var(--text-secondary)]">Memuat metrik KPI TSA Bekasi dari Google Sheet...</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="rounded-2xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)]">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2">
                        <FaExclamationTriangle /> {error || 'Data KPI TSA Bekasi belum tersedia'}
                    </span>
                    <button 
                        onClick={fetchTsaData} 
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition text-xs font-bold"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    const bekasiAch = data.achievement?.[0];
    const bekasiBud = data.budgetOutage?.[0];
    const bekasiPro = data.proyeksi?.[0];
    const topTickets = data.topTickets || [];

    return (
        <div className="rounded-2xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)] space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
                <div>
                    <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2.5 tracking-tight">
                        <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                            <FaBroadcastTower size={18} />
                        </span>
                        KPI Transport Service Availability (TSA) - Branch Bekasi
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                        Monitoring ketersediaan transport Node-B full cover Branch Bekasi (Target SLA: <span className="font-bold text-[var(--text-primary)] font-mono">≥ 99,950%</span>)
                    </p>
                </div>

                {/* Quick Action: Copy Broadcast WhatsApp */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopyBroadcast}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                            copied 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                        }`}
                        title="Salin format laporan harian untuk WhatsApp / Telegram"
                    >
                        {copied ? <FaCheck size={13} /> : <FaCopy size={13} />}
                        <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Format Broadcast WA Bekasi'}</span>
                    </button>
                </div>
            </div>

            {/* Top Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* 1. Realisasi TSA Bekasi */}
                <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Realisasi TSA Bekasi</span>
                        <span className={`p-1.5 rounded-lg text-xs ${
                            bekasiAch?.isComply ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                            <FaShieldAlt />
                        </span>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black font-mono tracking-tight text-[var(--text-primary)]">
                            {bekasiAch?.tsaPct?.toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}%
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                bekasiAch?.isComply 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' 
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                            }`}>
                                {bekasiAch?.isComply ? <FaCheckCircle size={9}/> : <FaTimesCircle size={9}/>}
                                {bekasiAch?.isComply ? 'COMPLY (≥ 99,95%)' : 'NOT COMPLY (< 99,95%)'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Total Site Billing */}
                <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Site Billing</span>
                        <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 text-xs">
                            <FaBroadcastTower />
                        </span>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black font-mono tracking-tight text-[var(--text-primary)]">
                            {bekasiAch?.totalBilling?.toLocaleString('id-ID')} <span className="text-xs font-normal text-[var(--text-muted)]">Site</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                            Area: <strong className="text-[var(--text-primary)]">Branch Bekasi</strong>
                        </p>
                    </div>
                </div>

                {/* 3. Outage MTD */}
                <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Outage MTD</span>
                        <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 text-xs">
                            <FaClock />
                        </span>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
                            {Math.round(bekasiAch?.outageHours || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-[var(--text-muted)]">Jam</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                            {bekasiAch?.totalIncident} Tiket Insiden ({bekasiAch?.totalSiteDown} Site Down)
                        </p>
                    </div>
                </div>

                {/* 4. Sisa Budget Outage */}
                <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Sisa Budget Outage</span>
                        <span className="text-xs font-mono">
                            {bekasiBud?.isSafe ? '🟢' : '🔴'}
                        </span>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black font-mono tracking-tight text-[var(--text-primary)]">
                            {Math.round(bekasiBud?.sisaBudgetOutage || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-[var(--text-muted)]">Jam</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                            Maks Outage: <span className="font-bold text-[var(--text-primary)] font-mono">{Math.round(bekasiBud?.maxOutagePerDay || 0)} Jam/Hari</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* TABEL B.1 ACHIEVEMENT TSA BEKASI */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Achievement Transport Service Availability (MTD) - Bekasi
                    </h4>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                    <table className="w-full border-collapse text-xs text-center">
                        <thead>
                            <tr className="bg-[var(--bg-base)] text-[var(--text-secondary)] border-b border-[var(--border-color)] font-extrabold text-[11px] uppercase tracking-wider">
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)] text-left pl-4">BRANCH</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">TOTAL BILLING</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">TOTAL INCIDENT</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">TOTAL SITE DOWN</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">SUPPORTED HOURS</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">TOTAL OUTAGE (JAM)</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)] min-w-[130px]">REALISASI TSA</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">TARGET</th>
                                <th className="py-2.5 px-3 min-w-[100px]">STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="py-3 px-3 border-r border-[var(--border-color)] text-left pl-4 font-black text-[var(--text-primary)] tracking-wide">
                                    {bekasiAch?.branch || bekasiAch?.district}
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono font-bold">
                                    {bekasiAch?.totalBilling?.toLocaleString('id-ID')}
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono">
                                    {bekasiAch?.totalIncident}
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono">
                                    {bekasiAch?.totalSiteDown}
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono text-[var(--text-muted)]">
                                    {Math.round(bekasiAch?.supportedHours || 0)?.toLocaleString('id-ID')}
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono font-bold text-amber-600 dark:text-amber-400">
                                    {Math.round(bekasiAch?.outageHours || 0)?.toLocaleString('id-ID')}
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono font-extrabold text-sm">
                                    <span className={bekasiAch?.isComply ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                        {bekasiAch?.tsaPct?.toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}%
                                    </span>
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono text-[var(--text-muted)]">
                                    {bekasiAch?.targetPct?.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                </td>
                                <td className="py-3 px-3">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                                        bekasiAch?.isComply
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                                    }`}>
                                        {bekasiAch?.isComply ? 'COMPLY' : 'NOT COMPLY'}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TABEL B.2 SISA BUDGET OUTAGE & PROYEKSI FM BEKASI */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Sisa Budget Outage & Proyeksi Akhir Bulan (Full Month) - Bekasi
                    </h4>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                    <table className="w-full border-collapse text-xs text-center">
                        <thead>
                            <tr className="bg-[var(--bg-base)] text-[var(--text-secondary)] border-b border-[var(--border-color)] font-extrabold text-[11px] uppercase tracking-wider">
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)] text-left pl-4">BRANCH</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">MAX OUTAGE BULANAN</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">REALISASI OUTAGE MTD</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">SISA BUDGET OUTAGE</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">BATAS MAX / HARI</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">PROYEKSI OUTAGE FM</th>
                                <th className="py-2.5 px-3 border-r border-[var(--border-color)]">PROYEKSI TSA FM</th>
                                <th className="py-2.5 px-3">STATUS PROYEKSI</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="py-3 px-3 border-r border-[var(--border-color)] text-left pl-4 font-black text-[var(--text-primary)] tracking-wide">
                                    {bekasiBud?.branch || bekasiBud?.district}
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono text-[var(--text-muted)]">
                                    {Math.round(bekasiBud?.budgetOutageFullMonth || 0)} Jam
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono font-bold text-amber-600 dark:text-amber-400">
                                    {Math.round(bekasiBud?.outageMtd || 0)} Jam
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono font-black text-sm">
                                    <span className={bekasiBud?.isSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                        {Math.round(bekasiBud?.sisaBudgetOutage || 0)} Jam
                                    </span>
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono font-bold">
                                    <span className="inline-flex items-center gap-1">
                                        {Math.round(bekasiBud?.maxOutagePerDay || 0)} Jam/Hari
                                        <span>{bekasiBud?.isSafe ? '🟢' : '🔴'}</span>
                                    </span>
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono text-[var(--text-muted)]">
                                    {Math.round(bekasiPro?.proyeksiOutageFm || 0)} Jam
                                </td>
                                <td className="py-3 px-3 border-r border-[var(--border-color)] font-mono font-extrabold text-sm">
                                    <span className={bekasiPro?.isMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                        {bekasiPro?.proyeksiTsaFm?.toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}%
                                    </span>
                                </td>
                                <td className="py-3 px-3">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                                        bekasiPro?.isMet
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                    }`}>
                                        {bekasiPro?.isMet ? 'MENCAPAI TARGET' : 'TIDAK MENCAPAI'}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TOP 3 OUTAGE INCIDENTS BEKASI ACCORDION */}
            <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-base)]/50">
                <button
                    onClick={() => setShowTopTickets(!showTopTickets)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-[var(--bg-surface)] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-xs font-bold text-[var(--text-primary)] cursor-pointer"
                >
                    <span className="flex items-center gap-2">
                        <FaInfoCircle className="text-blue-500" />
                        Top 3 Insiden dengan Dampak Outage Terbesar di Branch Bekasi
                    </span>
                    <span className="flex items-center gap-1 text-[var(--text-muted)] text-[11px]">
                        {showTopTickets ? 'Sembunyikan' : 'Lihat Detail Tiket'}
                        {showTopTickets ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
                    </span>
                </button>

                {showTopTickets && (
                    <div className="p-4 space-y-3 border-t border-[var(--border-color)] bg-[var(--bg-surface)]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {topTickets.map((t, idx) => (
                                <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                                                {t.incident}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                                {t.severity}
                                            </span>
                                        </div>
                                        <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                                            {t.outageHours} Jam
                                        </span>
                                    </div>

                                    <div className="text-[11px] text-[var(--text-muted)] space-y-0.5">
                                        <div>Site: <strong className="text-[var(--text-primary)] font-mono">{t.siteId}</strong> ({t.sto})</div>
                                        <div>TTR: <strong className="text-[var(--text-primary)] font-mono">{t.ttr} Jam</strong> | Site Down: <strong className="text-[var(--text-primary)] font-mono">{t.impactedSites}</strong></div>
                                        <div className="text-[10px] text-[var(--text-muted)]">{t.reportedDate}</div>
                                    </div>

                                    {t.rca && (
                                        <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] leading-relaxed line-clamp-3" title={t.rca}>
                                            <strong className="text-amber-700 dark:text-amber-400">RCA:</strong> {t.rca}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
