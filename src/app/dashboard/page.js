'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    FaArrowRight, 
    FaBolt,           
    FaCheckCircle,    
    FaCalendarAlt,    
    FaChartBar,       
    FaSpinner,
    FaExclamationCircle,
    FaTools
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
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [trendFilter, setTrendFilter] = useState('ALL'); 

    // --- 1. DATA FETCHING ---
    useEffect(() => {
        let isMounted = true; 

        fetch('/api/stats')
            .then(res => res.json())
            .then(result => {
                if (isMounted) {
                    if (result.error) {
                        console.error("API Error:", result.error);
                        setData({
                            stats: { total: 0, open: 0, sc: 0, closed_total: 0, closed_today: 0, closed_month: 0 },
                            runningBySub: [],
                            closedTodayBySub: [],
                            monthlyType: [],
                            dailyTrend: [],
                            recent: []
                        });
                    } else {
                        setData(result);
                    }
                    setLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    console.error("Fetch Error:", err);
                    setLoading(false);
                }
            });

        return () => { isMounted = false; }; 
    }, []);

    // --- 2. DATA PROCESSING ---
    const processedData = useMemo(() => {
        if (!data) return null;

        const stats = data.stats || { total: 0, open: 0, sc: 0, closed_total: 0, closed_today: 0, closed_month: 0 };
        const totalRunning = (parseInt(stats.open) || 0) + (parseInt(stats.sc) || 0);

        // Donut Data
        const donutStatusData = {
            labels: ['Closed', 'Open', 'Stop Clock (SC)'],
            datasets: [{
                data: [stats.closed_total, stats.open, stats.sc],
                backgroundColor: ['#10B981', '#EF4444', '#3B82F6'],
                borderWidth: 0,
                cutout: '75%', 
            }],
        };

        // Stacked Bar Data
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
                barThickness: 20, 
                borderRadius: 4,  
            };
        });

        const stackedBarData = {
            labels: uniqueMonths,
            datasets: stackedDatasets
        };

        // Line Chart Data
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
                label: cat,
                data: dataPoints,
                borderColor: color,
                backgroundColor: color + '10', 
                tension: 0.4, 
                pointRadius: 0, 
                pointHoverRadius: 6,
                fill: true, 
                borderWidth: 2
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
            stats,
            totalRunning,
            donutStatusData,
            stackedBarData,
            lineData,
            uniqueSubsMonthly,
            uniqueCatsLine
        };
    }, [data, trendFilter]); 

    // --- 3. CHART OPTIONS ---
    const donutOptions = {
        plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 20, font: {family: 'inherit'} } } },
        maintainAspectRatio: false,
        layout: { padding: 10 }
    };

    const stackedBarOptions = {
        responsive: true, maintainAspectRatio: false,
        scales: { 
            x: { stacked: true, grid: { display: false }, ticks: { font: {family: 'inherit'} } }, 
            y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: {family: 'inherit'} } } 
        },
        plugins: { 
            legend: { 
                position: 'top', 
                align: 'end',
                labels: { usePointStyle: true, boxWidth: 6, font: { size: 10, family: 'inherit' } }, 
                display: (processedData?.uniqueSubsMonthly?.length || 0) < 10 
            } 
        }
    };

    const lineOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#cbd5e1' } },
        scales: { 
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: {family: 'inherit'} } }, 
            x: { grid: { display: false }, ticks: { font: {family: 'inherit'} } } 
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };

    if (loading || !processedData) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center flex-col gap-4">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
                </div>
                <p className="text-slate-500 font-medium animate-pulse">Memuat Data...</p>
            </div>
        );
    }

    const { stats, totalRunning, donutStatusData, stackedBarData, lineData, uniqueCatsLine } = processedData;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h2>
                    <p className="text-slate-500 mt-1">Monitor performa & status tiket secara real-time</p>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Terakhir</p>
                    <p className="text-sm font-medium text-slate-700 font-mono">{new Date().toLocaleString('id-ID')}</p>
                </div>
            </div>

            {/* --- 4 KARTU UTAMA --- */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                
                {/* CARD 1: RUNNING */}
                <Link href="/dashboard/tickets?status=RUNNING" className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FaBolt className="text-6xl text-blue-600 transform rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <FaExclamationCircle />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiket Running</span>
                        </div>
                        <h3 className="text-4xl font-extrabold text-slate-800">{totalRunning}</h3>
                        <div className="mt-4 flex gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100">OPEN: {stats.open}</span>
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-yellow-50 text-yellow-600 border border-yellow-100">SC: {stats.sc}</span>
                        </div>
                    </div>
                </Link>

                {/* CARD 2: CLOSED TODAY */}
                <Link href="/dashboard/tickets?status=CLOSED" className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FaCheckCircle className="text-6xl text-emerald-600 transform rotate-12" />
                    </div>
                    <div className="relative z-10">
                         <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                <FaCheckCircle />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Closed Hari Ini</span>
                        </div>
                        <h3 className="text-4xl font-extrabold text-slate-800">{stats.closed_today}</h3>
                        <p className="mt-4 text-xs font-medium text-emerald-600 flex items-center gap-1">
                            <FaArrowRight size={10} /> Target Harian
                        </p>
                    </div>
                </Link>

                {/* CARD 3: CLOSED MONTH */}
                <Link href="/dashboard/tickets?status=CLOSED" className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FaCalendarAlt className="text-6xl text-violet-600 transform rotate-12" />
                    </div>
                    <div className="relative z-10">
                         <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
                                <FaCalendarAlt />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Closed Bulan Ini</span>
                        </div>
                        <h3 className="text-4xl font-extrabold text-slate-800">{stats.closed_month}</h3>
                        <p className="mt-4 text-xs font-medium text-violet-600 flex items-center gap-1">
                            <FaArrowRight size={10} /> Akumulasi
                        </p>
                    </div>
                </Link>

                {/* CARD 4: TOTAL */}
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-lg shadow-slate-300 hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <FaChartBar className="text-6xl text-white transform rotate-12" />
                    </div>
                    <div className="relative z-10">
                         <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                <FaChartBar />
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tiket</span>
                        </div>
                        <h3 className="text-4xl font-extrabold text-white">{stats.total}</h3>
                        <p className="mt-4 text-xs font-medium text-slate-400">
                           Semua Kategori
                        </p>
                    </div>
                </div>
            </div>

            {/* --- SECTION LIST: RUNNING & CLOSED TODAY --- */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* List Running */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col h-96">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
                            <FaBolt className="text-blue-500" /> Detail Tiket Running
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                        {data?.runningBySub?.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <FaCheckCircle className="text-4xl mb-2 opacity-20" />
                                <p className="text-sm italic">Tidak ada tiket running</p>
                            </div>
                        ) : (
                            data?.runningBySub?.map((item) => (
                                <div key={item.subcategory} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors group">
                                    <span className="text-sm font-semibold text-slate-600 truncate mr-2">{item.subcategory}</span>
                                    <span className="flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm group-hover:scale-110 transition-transform">{item.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* List Closed Today */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col h-96">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
                            <FaCheckCircle className="text-emerald-500" /> Detail Closed Hari Ini
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                        {data?.closedTodayBySub?.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <FaTools className="text-4xl mb-2 opacity-20" />
                                <p className="text-sm italic">Belum ada closed hari ini</p>
                            </div>
                        ) : (
                            data?.closedTodayBySub?.map((item) => (
                                <div key={item.subcategory} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors group">
                                    <span className="text-sm font-semibold text-slate-600 truncate mr-2">{item.subcategory}</span>
                                    <span className="flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-sm group-hover:scale-110 transition-transform">{item.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* --- GRAFIK: BAR & DONUT --- */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                    <div className="mb-6">
                        <h3 className="text-base font-bold text-slate-800">Distribusi Sub-Kategori</h3>
                        <p className="text-xs text-slate-400">Statistik bulanan per kategori</p>
                    </div>
                    <div className="h-72">
                         <Bar data={stackedBarData} options={stackedBarOptions} />
                    </div>
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                    <div className="mb-6">
                        <h3 className="text-base font-bold text-slate-800">Status Keseluruhan</h3>
                        <p className="text-xs text-slate-400">Proporsi Open vs Closed vs SC</p>
                    </div>
                    <div className="h-72 flex items-center justify-center relative">
                         <Doughnut data={donutStatusData} options={donutOptions} />
                         {/* Center Text Trick */}
                         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
                            <span className="text-xs font-bold uppercase">Total</span>
                         </div>
                    </div>
                </div>
            </div>

            {/* --- LINE CHART (TREN) --- */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Tren Tiket Closed (30 Hari)</h3>
                        <p className="text-xs text-slate-400">Analisa performa harian</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setTrendFilter('ALL')} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border ${trendFilter === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>SEMUA</button>
                        {uniqueCatsLine.map(cat => {
                            const isActive = trendFilter === cat;
                            const catColor = CATEGORY_COLORS[cat] || stringToColor(cat);
                            return (
                                <button key={cat} onClick={() => setTrendFilter(cat)} 
                                    style={{ 
                                        backgroundColor: isActive ? catColor : 'white', 
                                        color: isActive ? 'white' : catColor, 
                                        borderColor: catColor 
                                    }} 
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border hover:opacity-90 shadow-sm`}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="h-80 w-full"> 
                    <Line options={lineOptions} data={lineData} />
                </div>
            </div>

            {/* --- TABEL TIKET TERBARU --- */}
            <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between border-b bg-slate-50/50 px-6 py-4">
                    <h3 className="font-bold text-slate-700">5 Tiket Terbaru Masuk</h3>
                    <Link href="/dashboard/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                        Lihat Semua <FaArrowRight size={10} />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">ID Tiket</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Waktu</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Kategori</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data?.recent?.map((t) => (
                                <tr key={t.id_tiket} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-700">{t.id_tiket}</td>
                                    {/* FIX: GANTI toLocaleDateString JADI toLocaleString AGAR BISA PAKAI timeStyle */}
                                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(t.tiket_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-100">{t.category}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                            t.status === 'OPEN' ? 'text-red-600 bg-red-50 border-red-100' : 
                                            t.status === 'SC' ? 'text-yellow-600 bg-yellow-50 border-yellow-100' : 
                                            'text-emerald-600 bg-emerald-50 border-emerald-100'
                                        }`}>
                                            {t.status}
                                        </span>
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