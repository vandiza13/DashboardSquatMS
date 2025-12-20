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

// --- SKEMA WARNA KATEGORI (Konsisten dengan Grafik Donut) ---
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
        
        // --- UPDATE: Membuat Dataset untuk Stacked Bar Chart ---
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

        // Data untuk Grafik Donut
        const totalMtel = data.reduce((acc, curr) => acc + parseInt(curr.mtel), 0);
        const totalUmt = data.reduce((acc, curr) => acc + parseInt(curr.umt), 0);
        const totalCentratama = data.reduce((acc, curr) => acc + parseInt(curr.centratama), 0);
        const totalSquat = data.reduce((acc, curr) => acc + parseInt(curr.squat), 0);

        return {
            bar: {
                labels: barLabels,
                datasets: stackedBarDatasets, // Menggunakan dataset bertumpuk
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

    // --- Opsi untuk Stacked Bar Chart ---
    const stackedBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { stacked: true }, // Mengaktifkan tumpukan pada sumbu X
            y: { stacked: true }  // Mengaktifkan tumpukan pada sumbu Y
        },
        plugins: {
            legend: { display: true, position: 'top' } // Menampilkan legenda
        }
    };

    return (
        <div className="space-y-8 pb-10">
            {/* --- HEADER & FILTER (Tidak Berubah) --- */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Produktifitas Tim</h2>
                    <p className="text-sm text-slate-500">
                        Analisa performa periode: <span className="font-semibold text-blue-600">{months[selectedMonth-1].label} {selectedYear}</span>
                    </p>
                </div>
                
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="px-3 text-slate-400"><FaFilter /></div>
                    <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-50 py-2 px-2 rounded-lg"
                    >
                        {months.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                    </select>
                    <span className="text-slate-300">|</span>
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-50 py-2 px-2 rounded-lg"
                    >
                        {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                    <FaSpinner className="animate-spin text-4xl text-blue-600 mb-3" />
                    <p>Sedang menghitung data...</p>
                </div>
            ) : (
                <>
                    {/* --- SUMMARY CARDS (Tidak Berubah) --- */}
                    {chartData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-slate-100">
                                <div className="rounded-full bg-blue-100 p-3 text-blue-600"><FaTicketAlt /></div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Total Closed</p>
                                    <h3 className="text-2xl font-bold text-slate-800">{chartData.grandTotal}</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 p-4 shadow-lg shadow-yellow-200 text-white col-span-1 md:col-span-2 lg:col-span-1">
                                <div className="rounded-full bg-white/20 p-3"><FaMedal /></div>
                                <div>
                                    <p className="text-xs text-white/80 uppercase font-bold">Top Performer</p>
                                    <h3 className="text-lg font-bold truncate">{chartData.topTechnician ? chartData.topTechnician.name : '-'}</h3>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- SECTION 1: GRAFIK --- */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Grafik Batang Bertumpuk (Stacked Bar Chart) */}
                        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 lg:col-span-2">
                            <h3 className="mb-4 text-lg font-bold text-slate-700">Top 10 Teknisi ({months[selectedMonth-1].label})</h3>
                            <div className="h-64">
                                {chartData && chartData.bar.datasets[0].data.length > 0 ? (
                                    <Bar data={chartData.bar} options={stackedBarOptions} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">Belum ada data di bulan ini.</div>
                                )}
                            </div>
                        </div>

                        {/* Grafik Donut */}
                        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                            <h3 className="mb-4 text-lg font-bold text-slate-700 text-center">Share Kategori</h3>
                            <div className="h-64 flex items-center justify-center relative">
                                {chartData && chartData.grandTotal > 0 ? (
                                    <>
                                        <Doughnut data={chartData.donut} options={{ cutout: '70%', plugins: { legend: { position: 'bottom' } } }} />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-3xl font-bold text-slate-800">{chartData.grandTotal}</span>
                                            <span className="text-xs text-slate-400">Tiket</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-slate-400 text-sm">Tidak ada data.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- SECTION 2: TABEL DETAIL --- */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-8">
                        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <span className="text-blue-600 font-bold text-lg">📋</span>
                            <h3 className="font-bold text-slate-700">Rincian Detail Tiket Per Teknisi</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                {/* UPDATE: Header Tabel dengan Warna Kategori */}
                                <thead>
                                    <tr>
                                        <th className="px-6 py-4 text-center w-16 bg-blue-600 text-white text-xs uppercase font-bold tracking-wider">#</th>
                                        <th className="px-6 py-4 bg-blue-600 text-white text-xs uppercase font-bold tracking-wider">Teknisi</th>
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
                                                <td className="px-6 py-4 text-center font-bold text-slate-600">{index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 font-bold text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                            {item.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                {index < 3 && <FaTrophy className={getTrophyColor(index)} />}
                                                                <span className="font-bold text-slate-800">{item.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400">{item.nik}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* UPDATE: Sel Tabel dengan Warna Teks Kategori */}
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
                                                    <div className="mx-auto flex h-8 w-12 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-600 shadow-sm">{item.total}</div>
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