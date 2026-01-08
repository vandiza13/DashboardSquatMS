'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    FaChartLine, FaTrophy, FaMedal, FaTicketAlt, FaFilter, FaTimes, FaExternalLinkAlt, 
    FaCalendarAlt, FaUserCircle, FaClock, FaSearch 
} from 'react-icons/fa';
import { 
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement 
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import Link from 'next/link';

// Registrasi Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// --- SKEMA WARNA KATEGORI ---
const CATEGORY_COLORS = {
    MTEL: '#3B82F6',       // Biru
    UMT: '#EAB308',        // Kuning
    CENTRATAMA: '#10B981', // Hijau
    SQUAT: '#EF4444',      // Merah
};

const CATEGORY_BG_COLORS = {
    MTEL: 'bg-blue-50 text-blue-700 border-blue-200',
    UMT: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    CENTRATAMA: 'bg-green-50 text-green-700 border-green-200',
    SQUAT: 'bg-red-50 text-red-700 border-red-200',
};

export default function ProductivityPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- STATE FILTER & SEARCH ---
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); 
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());    
    const [searchTerm, setSearchTerm] = useState(''); // State Pencarian

    // --- STATE MODAL DETAIL ---
    const [showModal, setShowModal] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [ticketDetails, setTicketDetails] = useState([]);
    const [selectedTechName, setSelectedTechName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedNik, setSelectedNik] = useState('');

    const months = [
        { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
        { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
        { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
    ];

    const years = [currentDate.getFullYear(), currentDate.getFullYear() - 1, currentDate.getFullYear() - 2];

    // --- FETCH DATA UTAMA ---
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

    // --- FILTER DATA SEARCH (Real-time) ---
    // Filter ini HANYA mempengaruhi tabel, tidak mempengaruhi chart (sesuai best practice dashboard)
    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        return data.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.nik.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    // --- FUNGSI KLIK ANGKA (FETCH DETAIL) ---
    const handleNumberClick = async (nik, name, category, count) => {
        if (count === 0) return;

        setSelectedTechName(name);
        setSelectedCategory(category);
        setSelectedNik(nik);
        setShowModal(true);
        setModalLoading(true);
        setTicketDetails([]); 
        setShowModal(true); // Tampilkan modal segera

        try {
            const res = await fetch(`/api/productivity/details?nik=${nik}&month=${selectedMonth}&year=${selectedYear}&category=${category}`);
            const result = await res.json();
            if (Array.isArray(result)) {
                setTicketDetails(result);
            }
        } catch (error) {
            console.error("Gagal ambil detail:", error);
        } finally {
            setModalLoading(false);
        }
    };

    // --- LOGIC PERHITUNGAN CHART ---
    const chartData = useMemo(() => {
        if (!data.length) return null;

        const topTechs = data.slice(0, 10); 
        const barLabels = topTechs.map(t => t.name.split(' ')[0]); 
        
        const stackedBarDatasets = [
            { label: 'MTEL', data: topTechs.map(t => t.mtel), backgroundColor: CATEGORY_COLORS.MTEL },
            { label: 'UMT', data: topTechs.map(t => t.umt), backgroundColor: CATEGORY_COLORS.UMT },
            { label: 'CENTRATAMA', data: topTechs.map(t => t.centratama), backgroundColor: CATEGORY_COLORS.CENTRATAMA },
            { label: 'SQUAT', data: topTechs.map(t => t.squat), backgroundColor: CATEGORY_COLORS.SQUAT },
        ];

        const totalMtel = data.reduce((acc, curr) => acc + parseInt(curr.mtel), 0);
        const totalUmt = data.reduce((acc, curr) => acc + parseInt(curr.umt), 0);
        const totalCentratama = data.reduce((acc, curr) => acc + parseInt(curr.centratama), 0);
        const totalSquat = data.reduce((acc, curr) => acc + parseInt(curr.squat), 0);

        return {
            bar: { labels: barLabels, datasets: stackedBarDatasets },
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

    const stackedBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true } },
        plugins: { legend: { display: true, position: 'top' } }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        }).format(date).replace('.', ':');
    };

    const ClickableCount = ({ count, nik, name, category, color }) => {
        if (count <= 0) return <span className="text-slate-300 font-normal">-</span>;
        
        return (
            <button 
                onClick={() => handleNumberClick(nik, name, category, count)}
                className="font-bold hover:underline hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                style={{ color: color || 'inherit' }}
                title="Klik untuk lihat detail"
            >
                {count}
            </button>
        );
    };

    return (
        <div className="space-y-8 pb-20 md:pb-10 animate-fade-in relative">
            {/* --- HEADER UTAMA (Hanya Judul & Filter Tanggal) --- */}
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
                            <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-3 opacity-5"><FaTicketAlt className="text-6xl" /></div>
                                <div className="rounded-full bg-blue-50 p-3 text-blue-600 relative z-10"><FaTicketAlt size={20} /></div>
                                <div className="relative z-10">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Closed</p>
                                    <h3 className="text-3xl font-extrabold text-slate-800">{chartData.grandTotal}</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 p-5 shadow-lg shadow-amber-200 text-white col-span-1 md:col-span-2 lg:col-span-1 relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-3 opacity-10"><FaMedal className="text-6xl transform rotate-12" /></div>
                                <div className="rounded-full bg-white/20 p-3 relative z-10"><FaMedal size={20} /></div>
                                <div className="relative z-10 overflow-hidden">
                                    <p className="text-xs text-white/90 uppercase font-bold tracking-wider">Top Performer</p>
                                    <h3 className="text-xl font-bold truncate">{chartData.topTechnician ? chartData.topTechnician.name : '-'}</h3>
                                    <p className="text-[10px] text-white/80 mt-0.5">{chartData.topTechnician ? `${chartData.topTechnician.total} Tiket` : ''}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- CHARTS --- */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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

                    {/* --- TABEL + SEARCH BAR DI ATASNYA --- */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-8">
                        {/* HEADER TABEL: Judul di Kiri, Search di Kanan */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FaTrophy /></div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm md:text-base">Leaderboard Teknisi</h3>
                                    <p className="text-xs text-slate-500 hidden md:block">Rincian detail pencapaian per kategori</p>
                                </div>
                            </div>
                            
                            {/* SEARCH BAR */}
                            <div className="relative w-full md:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSearch className="text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cari nama atau NIK..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white"
                                />
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
                                    {filteredData.length === 0 ? (
                                        <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic">
                                            {searchTerm ? `Tidak ditemukan teknisi dengan nama "${searchTerm}"` : 'Tidak ada data tiket closed pada periode ini.'}
                                        </td></tr>
                                    ) : (
                                        filteredData.map((item, index) => (
                                            <tr key={item.nik} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 text-center font-bold text-slate-500">{index + 1}</td>
                                                <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 md:static border-r border-slate-100 md:border-none shadow-sm md:shadow-none">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${index < 3 && !searchTerm ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            {index < 3 && !searchTerm ? <FaMedal /> : item.name.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-700 text-xs md:text-sm">{item.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-mono">{item.nik}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <ClickableCount count={item.mtel} nik={item.nik} name={item.name} category="MTEL" color={CATEGORY_COLORS.MTEL} />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <ClickableCount count={item.umt} nik={item.nik} name={item.name} category="UMT" color={CATEGORY_COLORS.UMT} />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <ClickableCount count={item.centratama} nik={item.nik} name={item.name} category="CENTRATAMA" color={CATEGORY_COLORS.CENTRATAMA} />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <ClickableCount count={item.squat} nik={item.nik} name={item.name} category="SQUAT" color={CATEGORY_COLORS.SQUAT} />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="mx-auto flex h-6 w-10 items-center justify-center rounded bg-slate-800 text-xs font-bold text-white shadow-sm cursor-pointer hover:bg-slate-700 hover:scale-105 transition-transform"
                                                         onClick={() => handleNumberClick(item.nik, item.name, 'TOTAL', item.total)}>
                                                        {item.total}
                                                    </div>
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

            {/* --- MODAL DETAIL TIKET (POPUP) --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div 
                        className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-up overflow-hidden"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        {/* HEADER MODAL */}
                        <div className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-start sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border-2 border-white shadow-sm">
                                    <FaUserCircle size={28} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 leading-tight">Detail Pekerjaan</h3>
                                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                                        <span className="text-sm font-semibold text-slate-700">{selectedTechName}</span>
                                        <span className="text-slate-300 text-xs">•</span>
                                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{selectedNik}</span>
                                        <span className="text-slate-300 text-xs">•</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedCategory === 'TOTAL' ? 'bg-slate-800 text-white border-transparent' : CATEGORY_BG_COLORS[selectedCategory] || 'bg-slate-100'}`}>
                                            {selectedCategory}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowModal(false)} 
                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all duration-200"
                            >
                                <FaTimes size={18} />
                            </button>
                        </div>

                        {/* CONTENT LIST MODAL */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
                            {modalLoading ? (
                                <div className="py-24 flex flex-col items-center justify-center gap-3">
                                    <FaTicketAlt className="animate-bounce text-blue-200 text-5xl" />
                                    <span className="text-sm font-medium text-slate-400 animate-pulse">Memuat riwayat pekerjaan...</span>
                                </div>
                            ) : ticketDetails.length === 0 ? (
                                <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                                    <div className="bg-slate-100 p-4 rounded-full text-slate-300 mb-2"><FaFilter size={24} /></div>
                                    <p className="text-slate-500 font-medium">Tidak ada data tiket.</p>
                                    <p className="text-xs text-slate-400 max-w-xs mx-auto">Pastikan filter periode sudah benar atau cek status tiket teknisi ini.</p>
                                </div>
                            ) : (
                                <div className="bg-white min-h-full">
                                    {ticketDetails.map((ticket, i) => (
                                        <div 
                                            key={ticket.id} 
                                            className="group relative flex items-start gap-4 p-5 border-b border-slate-50 hover:bg-blue-50/30 transition-all duration-200"
                                        >
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                ticket.category === 'MTEL' ? 'bg-blue-500' :
                                                ticket.category === 'UMT' ? 'bg-yellow-500' :
                                                ticket.category === 'CENTRATAMA' ? 'bg-green-500' : 'bg-red-500'
                                            } opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                                            <div className="flex flex-col items-center gap-1 min-w-[24px] pt-1">
                                                <span className="text-xs font-mono text-slate-400 group-hover:text-blue-500 font-medium transition-colors">
                                                    {(i + 1).toString().padStart(2, '0')}
                                                </span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center flex-wrap gap-2 mb-1.5">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${CATEGORY_BG_COLORS[ticket.category] || 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                                        {ticket.category}
                                                    </span>
                                                    <span className="text-xs font-mono text-slate-400 tracking-wide">
                                                        #{ticket.ticket_number}
                                                    </span>
                                                </div>
                                                
                                                <h4 className="text-sm font-semibold text-slate-800 leading-snug mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
                                                    {ticket.subject}
                                                </h4>

                                                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 w-fit px-2 py-1 rounded">
                                                    <FaCalendarAlt size={10} className="text-slate-300" />
                                                    <span className="font-medium">{formatDateTime(ticket.last_update_time).split('•')[0]}</span>
                                                    <span className="text-slate-300">|</span>
                                                    <FaClock size={10} className="text-slate-300" />
                                                    <span>{formatDateTime(ticket.last_update_time).split('•')[1] || formatDateTime(ticket.last_update_time).split(' ')[3] || ''}</span>
                                                </div>
                                            </div>

                                            <Link 
                                                href={`/dashboard/tickets/${ticket.id}`} 
                                                target="_blank" 
                                                className="mt-1 p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                                                title="Buka detail tiket di tab baru"
                                            >
                                                <FaExternalLinkAlt size={14} />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* FOOTER MODAL */}
                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
                            <span>Periode: <b>{months[selectedMonth-1].label} {selectedYear}</b></span>
                            <span>Total: <b>{ticketDetails.length}</b> tiket</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}