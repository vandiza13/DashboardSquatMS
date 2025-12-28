'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    FaChartLine, FaTrophy, FaSpinner, FaMedal, FaTicketAlt, FaFilter, FaCalendarAlt 
} from 'react-icons/fa';
import { 
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement 
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Registrasi Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// --- SKEMA WARNA KATEGORI ---
const CATEGORY_COLORS = {
    MTEL: '#3B82F6',       // Biru
    UMT: '#EAB308',        // Kuning
    CENTRATAMA: '#10B981', // Hijau
    SQUAT: '#EF4444',      // Merah
};

export default function ProductivityPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- STATE FILTER PERIODE ---
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); 
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());    

    const months = [
        { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
        { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
        { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
    ];

    const years = [currentDate.getFullYear(), currentDate.getFullYear() - 1, currentDate.getFullYear() - 2];

    // --- FETCH DATA ---
    useEffect(() => {
        setLoading(true);
        fetch(`/api/productivity?month=${selectedMonth}&year=${selectedYear}`)
            .then(res => res.json())
            .then(result => {
                if (Array.isArray(result)) {
                    setData(result);
                } else {
                    setData([]); 
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [selectedMonth, selectedYear]); 

    // --- LOGIC PERHITUNGAN CHART ---
    const chartData = useMemo(() => {
        if (!data.length) return null;

        const topTechs = data.slice(0, 10); 
        const barLabels = topTechs.map(t => t.name.split(' ')[0]); 
        
        // Stacked Bar Dataset
        const stackedBarDatasets = [
            {
                label: 'MTEL',
                data: topTechs.map(t => t.mtel),
                backgroundColor: CATEGORY_COLORS.MTEL,
            },
            {
                label: 'UMT',
                data: topTechs.map(t => t.umt),
                backgroundColor: CATEGORY_COLORS.UMT,
            },
            {
                label: 'CENTRATAMA',
                data: topTechs.map(t => t.centratama),
                backgroundColor: CATEGORY_COLORS.CENTRATAMA,
            },
            {
                label: 'SQUAT',
                data: topTechs.map(t => t.squat),
                backgroundColor: CATEGORY_COLORS.SQUAT,
            },
        ];

        // Donut Data
        const totalMtel = data.reduce((acc, curr) => acc + parseInt(curr.mtel), 0);
        const totalUmt = data.reduce((acc, curr) => acc + parseInt(curr.umt), 0);
        const totalCentratama = data.reduce((acc, curr) => acc + parseInt(curr.centratama), 0);
        const totalSquat = data.reduce((acc, curr) => acc + parseInt(curr.squat), 0);

        return {
            bar: {
                labels: barLabels,
                datasets: stackedBarDatasets, 
            },
            donut: {
                labels: ['MTEL', 'UMT', 'CENTRATAMA', 'SQUAT'],
                datasets: [{
                    data: [totalMtel, totalUmt, totalCentratama, totalSquat],
                    backgroundColor: [CATEGORY_COLORS.MTEL, CATEGORY_COLORS.UMT, CATEGORY_COLORS.CENTRATAMA, CATEGORY_COLORS.SQUAT], 
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            grandTotal: totalMtel + totalUmt + totalCentratama + totalSquat,
            topTechnician: data[0] 
        };
    }, [data]);

    const getTrophyColor = (index) => {
        if (index === 0) return 'text-yellow-400 drop-shadow-sm'; 
        if (index === 1) return 'text-slate-400 drop-shadow-sm';   
        if (index === 2) return 'text-amber-700 drop-shadow-sm';  
        return null;
    };

    const stackedBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { stacked: true }, 
            y: { stacked: true }  
        },
        plugins: {
            legend: { display: true, position: 'top' } 
        }
    };

    return (
        <div className="space-y-8 pb-20 md:pb-10 animate-fade-in">
            {/* --- HEADER & FILTER (RESPONSIVE) --- */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Produktifitas Tim</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Analisa performa periode: <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{months[selectedMonth-1].label} {selectedYear}</span>
                    </p>
                </div>
                
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
                    <div className="px-3 text-slate-400 hidden md:block"><FaFilter /></div>
                    <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-50 py-2 px-2 rounded-lg flex-1 md:flex-none"
                    >
                        {months.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                    </select>
                    <span className="text-slate-300">|</span>
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-50 py-2 px-2 rounded-lg flex-1 md:flex-none"
                    >
                        {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                    <div className="relative mb-3">
                        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
                    </div>
                    <p className="text-sm font-medium animate-pulse">Menghitung statistik...</p>
                </div>
            ) : (
                <>
                    {/* --- SUMMARY CARDS --- */}
                    {chartData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Card Total */}
                            <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-3 opacity-5">
                                    <FaTicketAlt className="text-6xl" />
                                </div>
                                <div className="rounded-full bg-blue-50 p-3 text-blue-600 relative z-10"><FaTicketAlt size={20} /></div>
                                <div className="relative z-10">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Closed</p>
                                    <h3 className="text-3xl font-extrabold text-slate-800">{chartData.grandTotal}</h3>
                                </div>
                            </div>

                            {/* Card Top Performer */}
                            <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 p-5 shadow-lg shadow-amber-200 text-white col-span-1 md:col-span-2 lg:col-span-1 relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-3 opacity-10">
                                    <FaMedal className="text-6xl transform rotate-12" />
                                </div>
                                <div className="rounded-full bg-white/20 p-3 relative z-10"><FaMedal size={20} /></div>
                                <div className="relative z-10 overflow-hidden">
                                    <p className="text-xs text-white/90 uppercase font-bold tracking-wider">Top Performer</p>
                                    <h3 className="text-xl font-bold truncate">{chartData.topTechnician ? chartData.topTechnician.name : '-'}</h3>
                                    <p className="text-[10px] text-white/80 mt-0.5">{chartData.topTechnician ? `${chartData.topTechnician.total} Tiket` : ''}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- SECTION 1: GRAFIK (Grid 1 di HP, 3 di Desktop) --- */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Grafik Batang */}
                        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 lg:col-span-2">
                            <h3 className="mb-6 text-base font-bold text-slate-800 flex items-center gap-2">
                                <FaChartLine className="text-blue-500"/> Top 10 Teknisi ({months[selectedMonth-1].label})
                            </h3>
                            <div className="h-64 md:h-80">
                                {chartData && chartData.bar.datasets[0].data.length > 0 ? (
                                    <Bar data={chartData.bar} options={stackedBarOptions} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                                        <p className="text-sm">Belum ada data di bulan ini.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Grafik Donut */}
                        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                            <h3 className="mb-6 text-base font-bold text-slate-800 text-center">Share Kategori</h3>
                            <div className="h-64 flex items-center justify-center relative">
                                {chartData && chartData.grandTotal > 0 ? (
                                    <>
                                        <Doughnut data={chartData.donut} options={{ cutout: '70%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 15, font: {size: 11} } } } }} />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-80">
                                            <span className="text-3xl font-bold text-slate-800">{chartData.grandTotal}</span>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                                        <p className="text-sm">Kosong.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- SECTION 2: TABEL DETAIL (RESPONSIVE SCROLL) --- */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-8">
                        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FaTrophy /></div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm md:text-base">Leaderboard Teknisi</h3>
                                <p className="text-xs text-slate-500 hidden md:block">Rincian detail pencapaian per kategori</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[600px]">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-4 text-center w-16 bg-blue-600 text-white text-xs uppercase font-bold tracking-wider">#</th>
                                        <th className="px-6 py-4 bg-blue-600 text-white text-xs uppercase font-bold tracking-wider sticky left-0 z-10 md:static">Teknisi</th>
                                        <th className="px-6 py-4 text-center text-white text-xs uppercase font-bold tracking-wider" style={{ backgroundColor: CATEGORY_COLORS.MTEL }}>MTEL</th>
                                        <th className="px-6 py-4 text-center text-white text-xs uppercase font-bold tracking-wider" style={{ backgroundColor: CATEGORY_COLORS.UMT }}>UMT</th>
                                        <th className="px-6 py-4 text-center text-white text-xs uppercase font-bold tracking-wider" style={{ backgroundColor: CATEGORY_COLORS.CENTRATAMA }}>CENTRATAMA</th>
                                        <th className="px-6 py-4 text-center text-white text-xs uppercase font-bold tracking-wider" style={{ backgroundColor: CATEGORY_COLORS.SQUAT }}>SQUAT</th>
                                        <th className="px-6 py-4 text-center bg-blue-800 text-white text-xs uppercase font-bold tracking-wider">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {data.length === 0 ? (
                                        <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic">Tidak ada data tiket closed pada periode ini.</td></tr>
                                    ) : (
                                        data.map((item, index) => (
                                            <tr key={item.nik} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 text-center font-bold text-slate-500">{index + 1}</td>
                                                <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 md:static border-r border-slate-100 md:border-none shadow-sm md:shadow-none">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs transition-all ${index < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            {index < 3 ? <FaMedal /> : item.name.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-700 text-xs md:text-sm">{item.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-mono">{item.nik}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold" style={{ color: CATEGORY_COLORS.MTEL }}>
                                                    {item.mtel > 0 ? item.mtel : <span className="text-slate-300 font-normal">-</span>}
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold" style={{ color: CATEGORY_COLORS.UMT }}>
                                                    {item.umt > 0 ? item.umt : <span className="text-slate-300 font-normal">-</span>}
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold" style={{ color: CATEGORY_COLORS.CENTRATAMA }}>
                                                    {item.centratama > 0 ? item.centratama : <span className="text-slate-300 font-normal">-</span>}
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold" style={{ color: CATEGORY_COLORS.SQUAT }}>
                                                    {item.squat > 0 ? item.squat : <span className="text-slate-300 font-normal">-</span>}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="mx-auto flex h-6 w-10 items-center justify-center rounded bg-slate-800 text-xs font-bold text-white shadow-sm">{item.total}</div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}