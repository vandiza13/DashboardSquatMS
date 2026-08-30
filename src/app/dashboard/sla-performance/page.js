'use client';

import React, { useState, useEffect } from 'react';
import { 
    FaStopwatch, 
    FaFilter, 
    FaSyncAlt, 
    FaChartBar, 
    FaCheckCircle, 
    FaShieldAlt 
} from 'react-icons/fa';
import MsComplianceTable from '@/components/MsComplianceTable';
import MttriComplianceTable from '@/components/MttriComplianceTable';
import OloComplianceTable from '@/components/OloComplianceTable';
import Skeleton from '@/components/Skeleton';
import { pusherClient } from '@/lib/pusher-client';

export default function SlaPerformancePage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filter Periode Bulan & Tahun
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const monthsList = [
        { value: 1, label: 'Januari' },
        { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' },
        { value: 4, label: 'April' },
        { value: 5, label: 'Mei' },
        { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' },
        { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' },
        { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' },
        { value: 12, label: 'Desember' }
    ];

    const currentYear = new Date().getFullYear();
    const yearsList = [currentYear - 1, currentYear, currentYear + 1];

    const fetchStats = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
            const res = await fetch(`/api/stats?month=${monthStr}`, { cache: 'no-store' });
            if (res.ok) {
                const resData = await res.json();
                setData(resData);
            }
        } catch (err) {
            console.error("Gagal mengambil data SLA stats:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [selectedMonth, selectedYear]);

    // Pusher Realtime Update
    useEffect(() => {
        const channel = pusherClient.subscribe('dashboard-channel');
        channel.bind('ticket-update', () => {
            fetchStats(true);
        });

        return () => {
            pusherClient.unsubscribe('dashboard-channel');
        };
    }, [selectedMonth, selectedYear]);

    return (
        <div className="space-y-8 pb-20 w-full max-w-[100vw] overflow-x-hidden">
            
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                            <FaStopwatch size={22} />
                        </span>
                        <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                            Monitoring SLA & MTTR Terpadu
                        </h2>
                    </div>
                    <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1.5 font-medium">
                        Analisa waktu penyelesaian tiket (TTR) dan kepatuhan target SLA bulanan (MS-Eksternal, SQUAT TSEL & SQUAT OLO)
                    </p>
                </div>

                {/* Filter Controls & Refresh */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-[var(--bg-base)] p-1.5 rounded-xl border border-[var(--border-color)] shadow-xs">
                        <div className="px-2.5 text-[var(--text-muted)]"><FaFilter size={13} /></div>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent text-xs md:text-sm font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer hover:bg-[var(--bg-surface)] py-1.5 px-2 rounded-lg transition"
                        >
                            {monthsList.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                        <span className="text-[var(--text-muted)]">|</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent text-xs md:text-sm font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer hover:bg-[var(--bg-surface)] py-1.5 px-2 rounded-lg transition"
                        >
                            {yearsList.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => fetchStats(true)}
                        disabled={refreshing}
                        title="Segarkan Data"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-blue-500 text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                        <FaSyncAlt className={refreshing ? 'animate-spin text-blue-500' : ''} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Content Body / Tables */}
            {loading && !data ? (
                <div className="space-y-6">
                    <div className="rounded-2xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)] space-y-4">
                        <Skeleton className="h-6 w-1/4 mb-4" />
                        <Skeleton className="h-48 w-full rounded-xl" />
                    </div>
                    <div className="rounded-2xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)] space-y-4">
                        <Skeleton className="h-6 w-1/4 mb-4" />
                        <Skeleton className="h-48 w-full rounded-xl" />
                    </div>
                    <div className="rounded-2xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)] space-y-4">
                        <Skeleton className="h-6 w-1/4 mb-4" />
                        <Skeleton className="h-48 w-full rounded-xl" />
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* 1. TABEL MS-EKSTERNAL */}
                    <MsComplianceTable 
                        data={data?.msCompliance} 
                        selectedMonth={selectedMonth} 
                        selectedYear={selectedYear} 
                    />

                    {/* 2. TABEL SQUAT TSEL (MTTRi) */}
                    <MttriComplianceTable 
                        data={data?.mttriCompliance} 
                        selectedMonth={selectedMonth} 
                        selectedYear={selectedYear} 
                    />

                    {/* 3. TABEL SQUAT OLO */}
                    <OloComplianceTable 
                        data={data?.oloCompliance} 
                        selectedMonth={selectedMonth} 
                        selectedYear={selectedYear} 
                    />
                </div>
            )}
        </div>
    );
}
