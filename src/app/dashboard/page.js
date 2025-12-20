'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    FaArrowRight, 
    FaBolt,           
    FaCheckCircle,    
    FaCalendarAlt,    
    FaChartBar,       
    FaSpinner 
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

// --- UTILS (Dipindah keluar component agar stabil) ---
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

    // 1. FIX: Gunakan Flag isMounted untuk mencegah update state pada komponen yang belum siap/unmounted
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

        return () => { isMounted = false; }; // Cleanup function
    }, []);

    // 2. FIX: Bungkus logika kalkulasi data dengan useMemo
    // Ini mencegah Chart.js menerima objek baru setiap render (menghindari re-render loop)
    const processedData = useMemo(() => {
        if (!data) return null;

        // --- A. DATA RINGKASAN ---
        const stats = data.stats || { total: 0, open: 0, sc: 0, closed_total: 0, closed_today: 0, closed_month: 0 };
        const totalRunning = (parseInt(stats.open) || 0) + (parseInt(stats.sc) || 0);

        // --- B. DATA DONUT ---
        const donutStatusData = {
            labels: ['Closed', 'Open', 'Stop Clock (SC)'],
            datasets: [{
                data: [stats.closed_total, stats.open, stats.sc],
                backgroundColor: ['#10B981', '#EF4444', '#3B82F6'],
                borderWidth: 0,
                cutout: '70%',
            }],
        };

        // --- C. DATA STACKED BAR ---
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
                barThickness: 40,
            };
        });

        const stackedBarData = {
            labels: uniqueMonths,
            datasets: stackedDatasets
        };

        // --- D. DATA LINE CHART ---
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
                backgroundColor: color + '20',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true, 
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
    }, [data, trendFilter]); // Hanya hitung ulang jika data atau filter berubah

    // 3. CHART OPTIONS (Dibuat konstan/memoized)
    const donutOptions = {
        plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } } },
        maintainAspectRatio: false
    };

    const stackedBarOptions = {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } },
        plugins: { 
            legend: { 
                position: 'top', 
                labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } }, 
                display: (processedData?.uniqueSubsMonthly?.length || 0) < 10 
            } 
        }
    };

    const lineOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
    };

    if (loading || !processedData) {
        return (
            <div className="flex h-screen items-center justify-center">
                <FaSpinner className="animate-spin text-4xl text-blue-600" />
            </div>
        );
    }

    const { stats, totalRunning, donutStatusData, stackedBarData, lineData, uniqueCatsLine } = processedData;

    return (
        <div className="space-y-8 pb-10">
            {/* Header Title */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 border-l-4 border-blue-600 pl-3">STATISTIK TIKET</h2>
            </div>

            {/* --- SECTION 0: 4 KARTU UTAMA --- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                
                {/* CARD 1: TIKET RUNNING */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg shadow-blue-200">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <FaBolt className="text-white text-lg" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-bold mt-2">{totalRunning}</h3>
                            <p className="text-sm font-medium text-blue-100 mt-1">Tiket Running</p>
                            <div className="mt-3 flex gap-2 text-xs bg-blue-700/30 p-1.5 rounded-lg inline-flex backdrop-blur-sm border border-white/10">
                                <span className="font-semibold text-red-200">Open: {stats.open}</span>
                                <span className="w-[1px] bg-white/30 h-3 self-center"></span>
                                <span className="font-semibold text-yellow-200">SC: {stats.sc}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 2: CLOSED HARI INI */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-200">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <FaCheckCircle className="text-2xl" />
                        </div>
                        <div>
                            <h3 className="text-4xl font-bold">{stats.closed_today || 0}</h3>
                            <p className="text-sm font-medium text-emerald-100">Closed Hari Ini</p>
                        </div>
                    </div>
                </div>

                {/* CARD 3: CLOSED BULAN INI */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg shadow-violet-200">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <FaCalendarAlt className="text-2xl" />
                        </div>
                        <div>
                            <h3 className="text-4xl font-bold">{stats.closed_month || 0}</h3>
                            <p className="text-sm font-medium text-violet-100">Closed Bulan Ini</p>
                        </div>
                    </div>
                </div>

                {/* CARD 4: TOTAL TIKET */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 p-6 text-white shadow-lg shadow-slate-300">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <FaChartBar className="text-2xl" />
                        </div>
                        <div>
                            <h3 className="text-4xl font-bold">{stats.total}</h3>
                            <p className="text-sm font-medium text-slate-200">Total Tiket</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECTION 1: LIST RUNNING & CLOSED TODAY --- */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 h-full">
                    <div className="border-l-4 border-blue-600 pl-3 mb-4">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Tiket Running</h3>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {data?.runningBySub?.length === 0 ? (
                            <p className="text-slate-400 text-sm italic">Tidak ada tiket running.</p>
                        ) : (
                            data?.runningBySub?.map((item) => (
                                <div key={item.subcategory} className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2 last:border-0 hover:bg-slate-50 p-1 rounded transition">
                                    <span className="text-sm font-medium text-slate-600 truncate mr-2" title={item.subcategory}>{item.subcategory}</span>
                                    <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm shadow-blue-200">{item.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 h-full">
                    <div className="border-l-4 border-green-600 pl-3 mb-4">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Closed Hari Ini</h3>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {data?.closedTodayBySub?.length === 0 ? (
                            <p className="text-slate-400 text-sm italic">Belum ada tiket closed hari ini.</p>
                        ) : (
                            data?.closedTodayBySub?.map((item) => (
                                <div key={item.subcategory} className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2 last:border-0 hover:bg-slate-50 p-1 rounded transition">
                                    <span className="text-sm font-medium text-slate-600 truncate mr-2" title={item.subcategory}>{item.subcategory}</span>
                                    <span className="rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm shadow-green-200">{item.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* --- SECTION 2: GRAFIK --- */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                    <div className="border-l-4 border-blue-600 pl-3 mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Distribusi Sub-Kategori (Bulanan)</h3>
                    </div>
                    <div className="h-72">
                         <Bar data={stackedBarData} options={stackedBarOptions} />
                    </div>
                </div>
                <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                    <div className="border-l-4 border-blue-600 pl-3 mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Distribusi Status Tiket</h3>
                    </div>
                    <div className="h-72 flex items-center justify-center">
                         <Doughnut data={donutStatusData} options={donutOptions} />
                    </div>
                </div>
            </div>

            {/* --- SECTION 3: LINE CHART --- */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="border-l-4 border-purple-600 pl-3">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Tren Tiket Closed (30 Hari)</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setTrendFilter('ALL')} className={`rounded-full px-4 py-1 text-xs font-bold transition-all border ${trendFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>SEMUA</button>
                        {uniqueCatsLine.map(cat => {
                            const isActive = trendFilter === cat;
                            const catColor = CATEGORY_COLORS[cat] || stringToColor(cat);
                            return (
                                <button key={cat} onClick={() => setTrendFilter(cat)} style={{ backgroundColor: isActive ? catColor : 'white', color: isActive ? 'white' : catColor, borderColor: catColor }} className={`rounded-full px-4 py-1 text-xs font-bold transition-all border hover:opacity-80`}>{cat}</button>
                            );
                        })}
                    </div>
                </div>
                <div className="h-80 w-full"> 
                    <Line options={lineOptions} data={lineData} />
                </div>
            </div>

            {/* --- SECTION 4: TABLE --- */}
            <div className="rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-4">
                    <h3 className="font-bold text-slate-700">5 Tiket Terbaru Masuk</h3>
                    <Link href="/dashboard/tickets" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">Lihat Semua <FaArrowRight size={12} /></Link>
                </div>
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-slate-500">
                            <tr>
                                <th className="px-6 py-3">ID Tiket</th>
                                <th className="px-6 py-3">Waktu</th>
                                <th className="px-6 py-3">Kategori</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data?.recent?.map((t) => (
                                <tr key={t.id_tiket} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium text-slate-800">{t.id_tiket}</td>
                                    <td className="px-6 py-3 text-slate-500">{new Date(t.tiket_time).toLocaleDateString('id-ID')}</td>
                                    <td className="px-6 py-3"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold border border-blue-100">{t.category}</span></td>
                                    <td className="px-6 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'OPEN' ? 'text-red-600 bg-red-50' : t.status === 'SC' ? 'text-orange-600 bg-orange-50' : 'text-green-600 bg-green-50'}`}>{t.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}