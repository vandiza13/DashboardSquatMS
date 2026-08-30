'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    FaChartLine, FaTrophy, FaMedal, FaTicketAlt, FaFilter, FaTimes, FaExternalLinkAlt,
    FaCalendarAlt, FaUserCircle, FaClock, FaSearch,
    FaFileExcel, FaSpinner
} from 'react-icons/fa';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import Link from 'next/link';
// Note: Dynamic import for XLSX is handled inside the click handler to avoid SSR issues.
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// --- SKEMA WARNA KATEGORI ---
const CATEGORY_COLORS = {
    MTEL: '#3B82F6',       // Biru
    UMT: '#EAB308',        // Kuning
    CENTRATAMA: '#10B981', // Hijau
    SQUAT: '#EF4444',      // Merah
};

const CATEGORY_BG_COLORS = {
    MTEL: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50',
    UMT: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/50',
    CENTRATAMA: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50',
    SQUAT: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50',
};

export default function ProductivityPage() {
    const [data, setData] = useState([]);
    const [subcategoryCounts, setSubcategoryCounts] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- STATE FILTER & SEARCH ---
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    // --- STATE MODAL DETAIL ---
    const [showModal, setShowModal] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [ticketDetails, setTicketDetails] = useState([]);
    const [selectedTechName, setSelectedTechName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedNik, setSelectedNik] = useState('');

    // --- STATE DOWNLOAD ---
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [downloadPbsLoading, setDownloadPbsLoading] = useState(false);

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
                if (result && result.technicians) {
                    setData(Array.isArray(result.technicians) ? result.technicians : []);
                    setSubcategoryCounts(Array.isArray(result.subcategoryCounts) ? result.subcategoryCounts : []);
                } else if (Array.isArray(result)) {
                    setData(result);
                    setSubcategoryCounts([]);
                } else {
                    setData([]);
                    setSubcategoryCounts([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [selectedMonth, selectedYear]);

    // --- FILTER DATA SEARCH ---
    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        return data.filter(item =>
            (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.nik || '').toLowerCase().includes(searchTerm.toLowerCase())
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
        setShowModal(true);

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

    // --- [UPDATE] FUNGSI DOWNLOAD EXCEL DENGAN DATA LENGKAP ---
    const handleDownloadExcel = async () => {
        setDownloadLoading(true);
        try {
            // Dynamically import XLSX to prevent SSR issues
            const XLSX = await import('xlsx');

            // 1. Hitung Range Tanggal
            const startDate = new Date(selectedYear, selectedMonth - 1, 1);
            const endDate = new Date(selectedYear, selectedMonth, 0);

            const formatDateStr = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const sDateParam = formatDateStr(startDate);
            const eDateParam = formatDateStr(endDate);

            // 2. Fetch Data dari API Report
            const res = await fetch(`/api/reports/productivity?startDate=${sDateParam}&endDate=${eDateParam}`);
            const rawData = await res.json();

            if (!rawData || rawData.length === 0) {
                alert("Tidak ada data tiket untuk periode ini.");
                setDownloadLoading(false);
                return;
            }

            // --- KONSTANTA SLA ---
            const SLA_THRESHOLD_HOURS = 4;

            // 3. Buat Sheet 1: REKAP BULANAN
            const summaryData = data.map((item, index) => ({
                'No': index + 1,
                'Nama Teknisi': item.name,
                'NIK': item.nik,
                'Total Tiket': item.total,
                'MTEL': item.mtel,
                'UMT': item.umt,
                'CENTRATAMA': item.centratama,
                'SQUAT': item.squat,
            }));

            // 4. [UPDATE] Buat Sheet 2: DETAIL TIKET LENGKAP
            const detailData = rawData.map(row => {
                const isTsel = row.category === 'SQUAT' && row.subcategory === 'TSEL';
                const isSquat = row.category === 'SQUAT';
                const isTaccCategory = ['MTEL', 'UMT', 'CENTRATAMA'].includes(row.category);

                // Logika TTR & SLA
                let ttrValue = '-';
                let slaStatus = '-';
                if (row.ttr_tacc != null && String(row.ttr_tacc).trim() !== '') {
                    const ttrNum = parseFloat(String(row.ttr_tacc).replace(',', '.'));
                    if (!isNaN(ttrNum)) {
                        ttrValue = ttrNum;
                        let threshold = 4;
                        const prio = (row.priority || '').toUpperCase().replace(/[\s_]/g, '-');
                        
                        if (isTsel) {
                            if (prio === 'LOW') threshold = 24;
                            else if (prio === 'MINOR') threshold = 16;
                            else if (prio === 'MAJOR') threshold = 8;
                            else if (prio === 'CRITICAL') threshold = 4;
                            else if (prio === 'PREMIUM') threshold = 2;
                            else if (prio === 'CNQ') threshold = 24;
                        } else if (isSquat && row.subcategory === 'OLO') {
                            if (prio === 'NON-GAMAS' || prio === 'NONGAMAS') threshold = 4;
                            else if (prio === 'GAMAS') threshold = 7;
                            else if (prio === 'QUALITY') threshold = 7;
                        }

                        slaStatus = ttrNum <= threshold ? 'COMPLY' : 'NOT COMPLY';
                    }
                }

                return {
                    'Nama Teknisi': row.technician_name,
                    'NIK': row.technician_nik,
                    'No. HP': row.phone_number || '-',
                    'ID Tiket': row.id_tiket,
                    'ID TACC': isTaccCategory ? (row.id_tiket_tacc || '-') : '-',
                    'Kategori': row.category,
                    'Sub Kategori': row.subcategory,
                    'Branch': row.branch || '-',
                    'Priority (SLA)': isTsel ? (row.priority || '-') : '-',
                    'Status': row.status,
                    'STO': row.sto || '-',
                    'TTR TACC (Jam)': ttrValue,
                    'Status SLA': slaStatus,
                    'Deskripsi': row.deskripsi || '-',
                    'RCA / Progress': row.update_progres || '-',
                    'Partner Teknisi': row.partner_technicians || '-',
                    'Waktu Tiket': row.tiket_time ? new Date(row.tiket_time).toLocaleString('id-ID') : '-',
                    'Update Terakhir': row.last_update_time ? new Date(row.last_update_time).toLocaleString('id-ID') : '-',
                };
            });

            // 5. [NEW] Buat Sheet 3: REKAP SLA TTR per Teknisi
            const ttrMap = {};
            rawData.forEach(row => {
                if (!['MTEL', 'UMT', 'CENTRATAMA'].includes(row.category)) return;
                if (row.ttr_tacc == null || String(row.ttr_tacc).trim() === '') return;
                const ttrNum = parseFloat(String(row.ttr_tacc).replace(',', '.'));
                if (isNaN(ttrNum)) return;

                const key = `${row.technician_nik}_${row.category}`;
                if (!ttrMap[key]) {
                    ttrMap[key] = {
                        name: row.technician_name,
                        nik: row.technician_nik,
                        category: row.category,
                        total: 0,
                        inSla: 0,
                        overSla: 0,
                        sumTtr: 0,
                    };
                }
                ttrMap[key].total++;
                ttrMap[key].sumTtr += ttrNum;
                if (ttrNum <= SLA_THRESHOLD_HOURS) {
                    ttrMap[key].inSla++;
                } else {
                    ttrMap[key].overSla++;
                }
            });

            const slaRekapData = Object.values(ttrMap)
                .sort((a, b) => a.name.localeCompare(b.name) || a.category.localeCompare(b.category))
                .map((item, index) => ({
                    'No': index + 1,
                    'Nama Teknisi': item.name,
                    'NIK': item.nik,
                    'Kategori': item.category,
                    'Total Tiket (TTR)': item.total,
                    'IN SLA (≤4 Jam)': item.inSla,
                    'OVER SLA (>4 Jam)': item.overSla,
                    '% IN SLA': item.total > 0 ? `${((item.inSla / item.total) * 100).toFixed(1)}%` : '0%',
                    'Rata-rata TTR (Jam)': item.total > 0 ? (item.sumTtr / item.total).toFixed(2) : '0',
                }));

            // 6. Generate Excel File
            const workbook = XLSX.utils.book_new();

            // Sheet 1 (Rekap Bulanan)
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            wsSummary['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(workbook, wsSummary, "REKAP BULANAN");

            // Sheet 2 (Detail Tiket Lengkap)
            const wsDetail = XLSX.utils.json_to_sheet(detailData);
            wsDetail['!cols'] = [
                { wch: 25 }, // Nama
                { wch: 15 }, // NIK
                { wch: 15 }, // No. HP
                { wch: 20 }, // ID Tiket
                { wch: 18 }, // ID TACC
                { wch: 12 }, // Kategori
                { wch: 15 }, // Sub Kategori
                { wch: 12 }, // Branch
                { wch: 15 }, // Priority
                { wch: 10 }, // Status
                { wch: 8 },  // STO
                { wch: 15 }, // TTR TACC
                { wch: 12 }, // Status SLA
                { wch: 30 }, // Deskripsi
                { wch: 30 }, // RCA
                { wch: 20 }, // Partner
                { wch: 22 }, // Waktu Tiket
                { wch: 22 }, // Update Terakhir
            ];
            XLSX.utils.book_append_sheet(workbook, wsDetail, "DATA DETAIL");

            // Sheet 3 (Rekap SLA TTR)
            if (slaRekapData.length > 0) {
                const wsSla = XLSX.utils.json_to_sheet(slaRekapData);
                wsSla['!cols'] = [
                    { wch: 5 },  // No
                    { wch: 25 }, // Nama
                    { wch: 15 }, // NIK
                    { wch: 12 }, // Kategori
                    { wch: 15 }, // Total
                    { wch: 15 }, // IN SLA
                    { wch: 15 }, // OVER SLA
                    { wch: 12 }, // % IN SLA
                    { wch: 18 }, // Rata-rata TTR
                ];
                XLSX.utils.book_append_sheet(workbook, wsSla, "REKAP SLA TTR");
            }

            // Save File
            XLSX.writeFile(workbook, `Laporan_Produktifitas_${months[selectedMonth - 1].label}_${selectedYear}.xlsx`);

        } catch (error) {
            console.error("Download Error:", error);
            alert("Gagal mendownload excel.");
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleDownloadPBS = async () => {
        setDownloadPbsLoading(true);
        try {
            const yearStr = selectedYear.toString();
            const monthStr = selectedMonth.toString().padStart(2, '0');
            const monthParam = `${yearStr}-${monthStr}`;
            
            const res = await fetch(`/api/reports/pbs?month=${monthParam}`);
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${res.status}: Gagal download laporan`);
            }
            
            const blob = await res.blob();
            
            if (blob.size === 0) {
                alert("Tidak ada data tiket SQUAT CLOSED pada bulan tersebut.");
                setDownloadPbsLoading(false);
                return;
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Laporan_PBS_SQUAT_${yearStr}_${monthStr}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error(error);
            alert(error.message || "Gagal mendownload laporan PBS.");
        } finally {
            setDownloadPbsLoading(false);
        }
    };

    // --- LOGIC PERHITUNGAN CHART ---
    const chartData = useMemo(() => {
        if (!data.length) return null;

        const topTechs = data.slice(0, 10);
        const barLabels = topTechs.map(t => (t.name || 'Unknown').split(' ')[0]);

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
        if (count <= 0) return <span className="text-[var(--text-muted)] font-normal opacity-40">-</span>;

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
                    <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">Produktifitas Tim</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Analisa performa periode: <span className="font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-300">{months[selectedMonth - 1].label} {selectedYear}</span>
                    </p>
                </div>

                {/* FILTER & DOWNLOAD BUTTON */}
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">

                    {/* 1. FILTER BULAN/TAHUN */}
                    <div className="flex items-center gap-2 bg-[var(--bg-surface)] p-1.5 rounded-xl border border-[var(--border-color)] shadow-sm flex-1 md:flex-none">
                        <div className="px-3 text-[var(--text-muted)] hidden md:block"><FaFilter /></div>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent text-sm font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer hover:bg-[var(--bg-base)] py-2 px-2 rounded-lg flex-1 md:flex-none"
                        >
                            {months.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                        </select>
                        <span className="text-[var(--text-muted)]">|</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent text-sm font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer hover:bg-[var(--bg-base)] py-2 px-2 rounded-lg flex-1 md:flex-none"
                        >
                            {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                        </select>
                    </div>

                    {/* 2. TOMBOL DOWNLOAD EXCEL */}
                    <button
                        onClick={handleDownloadExcel}
                        disabled={downloadLoading || loading || data.length === 0}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-sm shadow-green-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {downloadLoading ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
                        <span className="hidden md:inline">Download</span> Excel
                    </button>

                    {/* 3. TOMBOL DOWNLOAD Laporan PBS */}
                    <button
                        onClick={handleDownloadPBS}
                        disabled={downloadPbsLoading || loading || data.length === 0}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm shadow-blue-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {downloadPbsLoading ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
                        <span className="hidden md:inline">Download</span> Laporan PBS (SQUAT)
                    </button>

                </div>
            </div>

            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center text-[var(--text-muted)]">
                    <div className="relative mb-3">
                        <div className="h-12 w-12 rounded-full border-4 border-[var(--border-color)] border-t-blue-600 animate-spin"></div>
                    </div>
                    <p className="text-sm font-medium animate-pulse">Menghitung statistik...</p>
                </div>
            ) : (
                <>
                    {/* --- SUMMARY CARDS --- */}
                    {chartData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex items-center gap-4 rounded-xl bg-[var(--bg-surface)] p-5 shadow-sm border border-[var(--border-color)] relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-3 opacity-5"><FaTicketAlt className="text-6xl" /></div>
                                <div className="rounded-full bg-blue-500/10 p-3 text-blue-500 relative z-10"><FaTicketAlt size={20} /></div>
                                <div className="relative z-10">
                                    <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider">Total Closed</p>
                                    <h3 className="text-3xl font-extrabold text-[var(--text-primary)]">{chartData.grandTotal}</h3>
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
                        <div className="rounded-xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)] lg:col-span-2">
                            <h3 className="mb-6 text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <FaChartLine className="text-blue-500" /> Top 10 Teknisi ({months[selectedMonth - 1].label})
                            </h3>
                            <div className="h-64 md:h-80">
                                {chartData && chartData.bar.datasets[0].data.length > 0 ? (
                                    <Bar data={chartData.bar} options={stackedBarOptions} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-base)] rounded-lg border border-dashed border-[var(--border-color)]">
                                        <p className="text-sm">Belum ada data di bulan ini.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="rounded-xl bg-[var(--bg-surface)] p-6 shadow-sm border border-[var(--border-color)]">
                            <h3 className="mb-6 text-base font-bold text-[var(--text-primary)] text-center">Share Kategori</h3>
                            <div className="h-52 flex items-center justify-center relative">
                                {chartData && chartData.grandTotal > 0 ? (
                                    <>
                                        <Doughnut data={chartData.donut} options={{ cutout: '70%', plugins: { legend: { display: false } } }} />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-80">
                                            <span className="text-3xl font-bold text-[var(--text-primary)]">{chartData.grandTotal}</span>
                                            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Total</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-base)] rounded-lg border border-dashed border-[var(--border-color)]">
                                        <p className="text-sm">Kosong.</p>
                                    </div>
                                )}
                            </div>

                            {/* --- DETAIL ANGKA PER KATEGORI --- */}
                            {chartData && chartData.grandTotal > 0 && (
                                <div className="mt-4 space-y-2">
                                    {/* Total */}
                                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)]">
                                        <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">Total</span>
                                        <span className="text-sm font-extrabold text-[var(--text-primary)]">{chartData.grandTotal}</span>
                                    </div>

                                    {/* Per Kategori */}
                                    {['UMT', 'CENTRATAMA', 'MTEL', 'SQUAT'].map(cat => {
                                        const catTotal = cat === 'UMT' ? chartData.donut.datasets[0].data[1]
                                            : cat === 'CENTRATAMA' ? chartData.donut.datasets[0].data[2]
                                            : cat === 'MTEL' ? chartData.donut.datasets[0].data[0]
                                            : chartData.donut.datasets[0].data[3];

                                        const hasSubcategories = cat === 'MTEL' || cat === 'SQUAT';
                                        const subs = subcategoryCounts.filter(s => s.category === cat);

                                        return (
                                            <div key={cat} className="rounded-lg border border-[var(--border-color)] overflow-hidden">
                                                <div className="flex items-center justify-between px-3 py-2" style={{ borderLeft: `3px solid ${CATEGORY_COLORS[cat]}` }}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[cat] }}></span>
                                                        <span className="text-xs font-bold text-[var(--text-secondary)]">{cat}</span>
                                                    </div>
                                                    <span className="text-sm font-extrabold" style={{ color: CATEGORY_COLORS[cat] }}>{catTotal}</span>
                                                </div>

                                                {/* Sub-detail untuk MTEL dan SQUAT */}
                                                {hasSubcategories && subs.length > 0 && (
                                                    <div className="bg-[var(--bg-base)] px-3 py-1.5 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border-subtle)]">
                                                        {subs.map(sub => (
                                                            <span key={sub.subcategory} className="text-[11px] text-[var(--text-muted)]">
                                                                <span className="font-semibold text-[var(--text-secondary)]">{sub.subcategory}</span>
                                                                {' '}
                                                                <span className="font-bold" style={{ color: CATEGORY_COLORS[cat] }}>{sub.count}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- TABEL + SEARCH BAR DI ATASNYA --- */}
                    <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-sm mt-8">
                        {/* HEADER TABEL: Judul di Kiri, Search di Kanan */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-500/10 dark:bg-blue-900/30 p-2 rounded-lg text-blue-500 dark:text-blue-400"><FaTrophy /></div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] text-sm md:text-base">Leaderboard Teknisi</h3>
                                    <p className="text-xs text-[var(--text-secondary)] hidden md:block">Rincian detail pencapaian per kategori</p>
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
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-[var(--bg-surface)] text-[var(--text-primary)]"
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
                                <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                                    {filteredData.length === 0 ? (
                                        <tr><td colSpan="7" className="p-8 text-center text-[var(--text-muted)] italic">
                                            {searchTerm ? `Tidak ditemukan teknisi dengan nama "${searchTerm}"` : 'Tidak ada data tiket closed pada periode ini.'}
                                        </td></tr>
                                    ) : (
                                        filteredData.map((item, index) => (
                                            <tr key={item.nik} className="hover:bg-[var(--bg-base)] transition-colors group">
                                                <td className="px-6 py-4 text-center font-bold text-[var(--text-muted)]">{index + 1}</td>
                                                <td className="px-6 py-4 sticky left-0 bg-[var(--bg-surface)] group-hover:bg-[var(--bg-base)] transition-colors z-10 md:static border-r border-[var(--border-subtle)] md:border-none shadow-sm md:shadow-none">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${index < 3 && !searchTerm ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                            {index < 3 && !searchTerm ? <FaMedal /> : (item.name || 'U').charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-[var(--text-primary)] text-xs md:text-sm">{item.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{item.nik}</span>
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
                        className="bg-[var(--bg-surface)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-up overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* HEADER MODAL */}
                        <div className="px-6 py-5 border-b border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-between items-start sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center border-2 border-[var(--border-color)] shadow-sm">
                                    <FaUserCircle size={28} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)] leading-tight">Detail Pekerjaan</h3>
                                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                                        <span className="text-sm font-semibold text-[var(--text-secondary)]">{selectedTechName}</span>
                                        <span className="text-[var(--text-muted)] text-xs">•</span>
                                        <span className="text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded">{selectedNik}</span>
                                        <span className="text-slate-300 text-xs">•</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedCategory === 'TOTAL' ? 'bg-slate-800 text-white border-transparent' : CATEGORY_BG_COLORS[selectedCategory] || 'bg-slate-100'}`}>
                                            {selectedCategory}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-full transition-all duration-200"
                            >
                                <FaTimes size={18} />
                            </button>
                        </div>

                        {/* CONTENT LIST MODAL */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-base)]">
                            {modalLoading ? (
                                <div className="py-24 flex flex-col items-center justify-center gap-3">
                                    <FaTicketAlt className="animate-bounce text-blue-500/50 text-5xl" />
                                    <span className="text-sm font-medium text-[var(--text-muted)] animate-pulse">Memuat riwayat pekerjaan...</span>
                                </div>
                            ) : ticketDetails.length === 0 ? (
                                <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                                    <div className="bg-[var(--bg-surface)] p-4 rounded-full text-[var(--text-muted)] mb-2"><FaFilter size={24} /></div>
                                    <p className="text-[var(--text-secondary)] font-medium">Tidak ada data tiket.</p>
                                    <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">Pastikan filter periode sudah benar atau cek status tiket teknisi ini.</p>
                                </div>
                            ) : (
                                <div className="bg-[var(--bg-surface)] min-h-full">
                                    {ticketDetails.map((ticket, i) => (
                                        <div
                                            key={ticket.id}
                                            className="group relative flex items-start gap-4 p-5 border-b border-[var(--border-subtle)] hover:bg-blue-500/5 transition-all duration-200"
                                        >
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${ticket.category === 'MTEL' ? 'bg-blue-500' :
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
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${CATEGORY_BG_COLORS[ticket.category] || 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                                                        {ticket.category}
                                                    </span>
                                                    <span className="text-xs font-mono text-[var(--text-muted)] tracking-wide">
                                                        #{ticket.ticket_number}
                                                    </span>
                                                </div>

                                                <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug mb-2 line-clamp-2 group-hover:text-blue-500 transition-colors">
                                                    {ticket.subject}
                                                </h4>

                                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-base)] border border-[var(--border-subtle)] w-fit px-2 py-1 rounded">
                                                    <FaCalendarAlt size={10} className="opacity-70" />
                                                    <span className="font-medium text-[var(--text-secondary)]">{formatDateTime(ticket.last_update_time).split('•')[0]}</span>
                                                    <span className="opacity-50">|</span>
                                                    <FaClock size={10} className="opacity-70" />
                                                    <span className="text-[var(--text-secondary)]">{formatDateTime(ticket.last_update_time).split('•')[1] || formatDateTime(ticket.last_update_time).split(' ')[3] || ''}</span>
                                                </div>
                                            </div>

                                            <Link
                                                href={`/dashboard/tickets/${ticket.id}`}
                                                target="_blank"
                                                className="mt-1 p-2 text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all"
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
                        <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-base)] flex justify-between items-center text-xs text-[var(--text-muted)]">
                            <span>Periode: <b>{months[selectedMonth - 1].label} {selectedYear}</b></span>
                            <span>Total: <b>{ticketDetails.length}</b> tiket</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}