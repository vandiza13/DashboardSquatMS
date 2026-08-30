'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FaArrowRight,
    FaBolt,
    FaCheckCircle,
    FaCalendarAlt,
    FaChartBar,
    FaSpinner,
    FaExclamationCircle,
    FaTools,
    FaClock,
    FaStopwatch,
    FaFilter
} from 'react-icons/fa';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

// [PUSHER] 1. Import Client Pusher
import { pusherClient } from '@/lib/pusher-client';

// Registrasi Komponen Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler);

// --- UTILS ---
const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

const CATEGORY_COLORS = {
    MTEL: '#3B82F6', SQUAT: '#EF4444', UMT: '#EAB308',
    CENTRATAMA: '#10B981', IBT: '#8B5CF6', OLO: '#F97316'
};

export default function DashboardPage() {
    const { theme } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [trendFilter, setTrendFilter] = useState('ALL');

    // Chart color tokens based on theme
    const isDark = theme === 'dark';
    const chartColors = {
        grid: isDark ? '#1e293b' : '#f1f5f9',
        tick: isDark ? '#64748b' : '#94a3b8',
        tooltip: isDark ? '#1e293b' : '#0f172a',
        tooltipText: isDark ? '#e2e8f0' : '#f1f5f9',
        legendText: isDark ? '#94a3b8' : '#475569',
    };

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/stats');
            const result = await res.json();

            if (result.error) {
                console.error("API Error:", result.error);
                setData({
                    stats: { total: 0, open: 0, sc: 0, closed_total: 0, closed_today: 0, closed_month: 0 },
                    runningBySub: [],
                    closedTodayBySub: [],
                    monthlyType: [],
                    dailyTrend: [],
                    recent: [],
                    aging: [],
                    ttr: {}
                });
            } else {
                setData(result);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            // Fix infinite loading: set fallback data if fetch throws
            setData({
                stats: { total: 0, open: 0, sc: 0, closed_total: 0, closed_today: 0, closed_month: 0 },
                runningBySub: [],
                closedTodayBySub: [],
                monthlyType: [],
                dailyTrend: [],
                recent: [],
                aging: [],
                ttr: {}
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const channel = pusherClient.subscribe('dashboard-channel');
        channel.bind('ticket-update', (data) => {
            console.log("Dashboard Overview Realtime Update:", data);
            fetchData();
        });
        return () => {
            pusherClient.unsubscribe('dashboard-channel');
        };
    }, [fetchData]);

    // --- DATA PROCESSING ---
    const processedData = useMemo(() => {
        if (!data) return null;

        const stats = data.stats || { total: 0, open: 0, sc: 0, closed_total: 0, closed_today: 0, closed_month: 0 };
        const totalRunning = (parseInt(stats.open) || 0) + (parseInt(stats.sc) || 0);
        const ttr = data.ttr || {}; 

        const donutStatusData = {
            labels: ['Closed', 'Open', 'Stop Clock (SC)'],
            datasets: [{
                data: [stats.closed_total, stats.open, stats.sc],
                backgroundColor: ['#10B981', '#EF4444', '#3B82F6'],
                borderWidth: 0,
                cutout: '75%',
            }],
        };

        const agingRaw = data.aging || [];
        const uniqueAgingCats = [...new Set(agingRaw.map(item => item.category))];
        if (uniqueAgingCats.length === 0) uniqueAgingCats.push('No Data');
        const barThicknessSetting = 60;
        const agingDatasets = [
            {
                label: '< 4 Jam (Aman)',
                data: uniqueAgingCats.map(cat => agingRaw.find(d => d.category === cat && d.age_group === 'less_4h')?.count || 0),
                backgroundColor: '#22c55e', borderRadius: 4, maxBarThickness: barThicknessSetting,
            },
            {
                label: '4-12 Jam (Warning)',
                data: uniqueAgingCats.map(cat => agingRaw.find(d => d.category === cat && d.age_group === '4h_12h')?.count || 0),
                backgroundColor: '#eab308', borderRadius: 4, maxBarThickness: barThicknessSetting,
            },
            {
                label: '12-24 Jam (Urgent)',
                data: uniqueAgingCats.map(cat => agingRaw.find(d => d.category === cat && d.age_group === '12h_24h')?.count || 0),
                backgroundColor: '#f97316', borderRadius: 4, maxBarThickness: barThicknessSetting,
            },
            {
                label: '> 24 Jam (Kritis)',
                data: uniqueAgingCats.map(cat => agingRaw.find(d => d.category === cat && d.age_group === 'more_24h')?.count || 0),
                backgroundColor: '#ef4444', borderRadius: 4, maxBarThickness: barThicknessSetting,
            }
        ];
        const agingBarData = { labels: uniqueAgingCats, datasets: agingDatasets };

        const uniqueMonths = [...new Set(data.monthlyType?.map(item => item.month) || [])];
        const uniqueSubsMonthly = [...new Set(data.monthlyType?.map(item => item.subcategory) || [])];
        const stackedDatasets = uniqueSubsMonthly.map(sub => {
            const color = stringToColor(sub);
            return {
                label: sub,
                data: uniqueMonths.map(month => {
                    const found = data.monthlyType?.find(d => d.month === month && d.subcategory === sub);
                    return found ? found.count : 0;
                }),
                backgroundColor: color,
                maxBarThickness: 80,
                borderRadius: 4,
            };
        });
        const stackedBarData = { labels: uniqueMonths, datasets: stackedDatasets };

        const dates = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().slice(0, 10));
        }

        const uniqueCatsLine = [...new Set(data.dailyTrend?.map(item => item.category) || [])];
        const allLineDatasets = uniqueCatsLine.map(cat => {
            const dataPoints = dates.map(date => {
                const found = data.dailyTrend?.find(item => item.date === date && item.category === cat);
                return found ? found.count : 0;
            });
            const color = CATEGORY_COLORS[cat] || stringToColor(cat);
            return {
                label: cat, data: dataPoints,
                borderColor: color, backgroundColor: color + '15',
                tension: 0.4, pointRadius: 0, pointHoverRadius: 6,
                fill: true, borderWidth: 2
            };
        });

        const displayedDatasets = trendFilter === 'ALL'
            ? allLineDatasets
            : allLineDatasets.filter(ds => ds.label === trendFilter);

        const lineData = {
            labels: dates.map(d => { const dateObj = new Date(d); return `${dateObj.getDate()}/${dateObj.getMonth() + 1}`; }),
            datasets: displayedDatasets
        };

        return {
            stats, totalRunning, donutStatusData, stackedBarData,
            lineData, uniqueSubsMonthly, uniqueCatsLine, agingBarData, ttr
        };
    }, [data, trendFilter]);

    // --- CHART OPTIONS (THEME-AWARE) ---
    const donutOptions = {
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    usePointStyle: true, boxWidth: 8, padding: 20,
                    font: { family: 'inherit' }, color: chartColors.legendText
                }
            }
        },
        maintainAspectRatio: false,
        layout: { padding: 10 }
    };

    const stackedBarOptions = {
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: { stacked: true, grid: { display: false }, ticks: { font: { family: 'inherit' }, color: chartColors.tick } },
            y: { stacked: true, beginAtZero: true, grid: { color: chartColors.grid }, ticks: { font: { family: 'inherit' }, color: chartColors.tick } }
        },
        plugins: {
            legend: {
                position: 'top', align: 'end',
                labels: { usePointStyle: true, boxWidth: 6, font: { size: 10, family: 'inherit' }, color: chartColors.legendText },
                display: (processedData?.uniqueSubsMonthly?.length || 0) < 10
            }
        }
    };

    const agingOptions = {
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: {
                stacked: true, grid: { display: false },
                ticks: { font: { family: 'inherit', weight: 'bold' }, color: chartColors.tick }
            },
            y: {
                stacked: true, beginAtZero: true,
                grid: { color: chartColors.grid },
                ticks: { stepSize: 1, color: chartColors.tick }
            }
        },
        plugins: {
            legend: {
                display: true, position: 'bottom',
                labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 }, color: chartColors.legendText }
            },
            tooltip: { mode: 'index', intersect: false }
        }
    };

    const lineOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index', intersect: false,
                backgroundColor: chartColors.tooltip,
                titleColor: chartColors.tooltipText,
                bodyColor: chartColors.legendText
            }
        },
        scales: {
            y: { beginAtZero: true, grid: { color: chartColors.grid }, ticks: { font: { family: 'inherit' }, color: chartColors.tick } },
            x: { grid: { display: false }, ticks: { font: { family: 'inherit' }, color: chartColors.tick } }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };

    if (loading || !processedData) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center flex-col gap-4">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-[var(--border-color)] border-t-blue-600 animate-spin"></div>
                </div>
                <p className="text-[var(--text-muted)] font-medium animate-pulse">Memuat Data...</p>
            </div>
        );
    }

    const { stats, totalRunning, donutStatusData, stackedBarData, lineData, uniqueCatsLine, agingBarData, ttr } = processedData;

    return (
        <div className="space-y-6 animate-fade-in pb-12 w-full max-w-[100vw] overflow-x-hidden">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] tracking-tight">Dashboard Overview</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">Monitor performa & status tiket operasional secara real-time</p>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Update Terakhir</p>
                    <p className="text-xs font-bold text-[var(--text-primary)] font-mono">{new Date().toLocaleString('id-ID')}</p>
                </div>
            </div>

            {/* --- 4 KARTU UTAMA (COMPACT) --- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* CARD 1: RUNNING */}
                <Link href="/dashboard/tickets?status=RUNNING" className="group relative overflow-hidden rounded-xl bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs border border-[var(--border-color)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><FaBolt className="text-5xl text-blue-600 transform rotate-12" /></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500 text-xs"><FaExclamationCircle /></div>
                            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Tiket Running</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">{totalRunning}</h3>
                        <div className="mt-3 flex gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">OPEN: {stats.open}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">SC: {stats.sc}</span>
                        </div>
                    </div>
                </Link>

                {/* CARD 2: CLOSED TODAY */}
                <Link href="/dashboard/tickets?status=CLOSED" className="group relative overflow-hidden rounded-xl bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs border border-[var(--border-color)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><FaCheckCircle className="text-5xl text-emerald-600 transform rotate-12" /></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500 text-xs"><FaCheckCircle /></div>
                            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Closed Hari Ini</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">{stats.closed_today}</h3>
                        <p className="mt-3 text-[11px] font-bold text-emerald-500 flex items-center gap-1"><FaArrowRight size={9} /> Target Harian</p>
                    </div>
                </Link>

                {/* CARD 3: CLOSED MONTH */}
                <Link href="/dashboard/tickets?status=CLOSED" className="group relative overflow-hidden rounded-xl bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs border border-[var(--border-color)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><FaCalendarAlt className="text-5xl text-violet-600 transform rotate-12" /></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 bg-violet-500/10 rounded-lg text-violet-500 text-xs"><FaCalendarAlt /></div>
                            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Closed Bulan Ini</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">{stats.closed_month}</h3>
                        <p className="mt-3 text-[11px] font-bold text-violet-500 flex items-center gap-1"><FaArrowRight size={9} /> Akumulasi</p>
                    </div>
                </Link>

                {/* CARD 4: TOTAL */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 p-4 sm:p-5 text-white shadow-md shadow-blue-500/15 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <div className="absolute top-0 right-0 p-3 opacity-10"><FaChartBar className="text-5xl text-white transform rotate-12" /></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 bg-white/15 rounded-lg backdrop-blur-xs text-xs"><FaChartBar /></div>
                            <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider">Total Tiket</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{stats.total}</h3>
                        <p className="mt-3 text-[11px] font-bold text-blue-200">Semua Kategori</p>
                    </div>
                </div>
            </div>

            {/* --- AREA 1: RUNNING & AGING --- */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                {/* 1. LIST TIKET RUNNING */}
                <div className="rounded-xl bg-[var(--bg-surface)] p-5 shadow-xs border border-[var(--border-color)] flex flex-col h-80">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-subtle)]">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                            <FaBolt className="text-blue-500" /> Detail Tiket Running
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                        {data?.runningBySub?.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full mb-2 shadow-xs border border-emerald-200 dark:border-emerald-800/30">
                                    <FaCheckCircle className="text-3xl" />
                                </div>
                                <p className="text-sm font-extrabold">Clear & Aman! 🎉</p>
                                <p className="text-xs mt-0.5 text-center text-emerald-600/70 dark:text-emerald-400/80 px-4">Mantap! Tidak ada antrean tiket saat ini.</p>
                            </div>
                        ) : (
                            data?.runningBySub?.map((item) => (
                                <div key={item.subcategory} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group">
                                    <span className="text-xs font-semibold text-[var(--text-secondary)] truncate mr-2">{item.subcategory}</span>
                                    <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-xs group-hover:scale-110 transition-transform">{item.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 2. AGING CHART */}
                <div className="rounded-xl bg-[var(--bg-surface)] p-5 shadow-xs border border-[var(--border-color)] flex flex-col h-80">
                    <div className="mb-3 flex items-center gap-2 pb-1">
                        <div className="p-1 bg-orange-500/10 rounded-md text-orange-500">
                            <FaClock size={14} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Umur Tiket (Aging)</h3>
                            <p className="text-[10px] text-[var(--text-muted)]">Per Kategori</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <Bar data={agingBarData} options={agingOptions} key={`aging-${theme}`} />
                    </div>
                </div>

            </div>

            {/* --- AREA 2: CLOSED TODAY & STATUS DONUT --- */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                {/* 1. LIST CLOSED TODAY */}
                <div className="rounded-xl bg-[var(--bg-surface)] p-5 shadow-xs border border-[var(--border-color)] flex flex-col h-80">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-subtle)]">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                            <FaCheckCircle className="text-emerald-500" /> Detail Closed Hari Ini
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                        {data?.closedTodayBySub?.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                                <FaTools className="text-4xl mb-2 opacity-20" />
                                <p className="text-sm italic">Belum ada closed hari ini</p>
                            </div>
                        ) : (
                            data?.closedTodayBySub?.map((item) => (
                                <div key={item.subcategory} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors group">
                                    <span className="text-sm font-semibold text-[var(--text-secondary)] truncate mr-2">{item.subcategory}</span>
                                    <span className="flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-sm group-hover:scale-110 transition-transform">{item.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 2. DONUT STATUS */}
                <div className="rounded-2xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)] flex flex-col h-96">
                    <div className="mb-4">
                        <h3 className="text-base font-bold text-[var(--text-primary)]">Status Keseluruhan</h3>
                        <p className="text-xs text-[var(--text-muted)]">Proporsi Open vs Closed vs SC</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center relative min-h-0">
                        <div className="h-64 w-full">
                            <Doughnut data={donutStatusData} options={donutOptions} key={`donut-${theme}`} />
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                            <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Total</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- AREA 3: DISTRIBUSI (FULL WIDTH) --- */}
            <div className="rounded-2xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)]">
                <div className="mb-6">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">Distribusi Sub-Kategori</h3>
                    <p className="text-xs text-[var(--text-muted)]">Statistik bulanan per kategori</p>
                </div>
                <div className="h-72">
                    <Bar data={stackedBarData} options={stackedBarOptions} key={`stacked-${theme}`} />
                </div>
            </div>

            {/* --- AREA 4: LINE CHART TREN (FULL WIDTH) --- */}
            <div className="rounded-2xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)]">
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">Tren Closed (30 Hari)</h3>
                        <p className="text-xs text-[var(--text-muted)]">Analisa performa harian</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setTrendFilter('ALL')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border ${trendFilter === 'ALL'
                                ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] border-transparent shadow-sm'
                                : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]'
                                }`}
                        >
                            SEMUA
                        </button>
                        {uniqueCatsLine.map(cat => {
                            const isActive = trendFilter === cat;
                            const catColor = CATEGORY_COLORS[cat] || stringToColor(cat);
                            return (
                                <button key={cat} onClick={() => setTrendFilter(cat)}
                                    style={{
                                        backgroundColor: isActive ? catColor : 'transparent',
                                        color: isActive ? 'white' : catColor,
                                        borderColor: catColor
                                    }}
                                    className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all border hover:opacity-90 shadow-sm"
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="h-80 w-full">
                    <Line options={lineOptions} data={lineData} key={`line-${theme}`} />
                </div>
            </div>

            {/* --- TABEL TIKET TERBARU --- */}
            <div className="rounded-2xl bg-[var(--bg-surface)] shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-base)] px-6 py-4">
                    <h3 className="font-bold text-[var(--text-primary)]">5 Tiket Terbaru Masuk</h3>
                    <Link href="/dashboard/tickets" className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors border border-blue-200 dark:border-blue-800/50">
                        Lihat Semua <FaArrowRight size={10} />
                    </Link>
                </div>

                {/* TAMPILAN TABLE (DESKTOP) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--bg-base)] text-[var(--text-muted)] border-b border-[var(--border-color)]">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">ID Tiket</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Waktu</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Kategori</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {data?.recent?.map((t) => (
                                <tr key={t.id_tiket} className="hover:bg-[var(--bg-base)] transition-colors">
                                    <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{t.id_tiket}</td>
                                    <td className="px-6 py-4 text-[var(--text-muted)] text-xs">{new Date(t.tiket_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800/50">{t.category}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${t.status === 'OPEN' ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50' :
                                            t.status === 'SC' ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800/50' :
                                                'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50'
                                            }`}>
                                            {t.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* TAMPILAN LIST CARD (MOBILE) */}
                <div className="md:hidden">
                    {data?.recent?.map((t) => (
                        <div key={t.id_tiket} className="p-4 border-b border-[var(--border-subtle)] last:border-0 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-[var(--text-primary)] text-sm">{t.id_tiket}</span>
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${t.status === 'OPEN' ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50' :
                                    t.status === 'SC' ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800/50' :
                                        'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50'
                                    }`}>{t.status}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-[var(--text-muted)]">
                                <span>{new Date(t.tiket_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                <span className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/50 font-semibold">{t.category}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}