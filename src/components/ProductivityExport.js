'use client';

import { useState } from 'react';
import { FaFileExcel, FaSpinner, FaCalendarAlt } from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function ProductivityExport() {
    const [loading, setLoading] = useState(false);
    
    // Default tanggal: Awal bulan ini s/d Hari ini
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));

    const handleDownload = async () => {
        setLoading(true);
        try {
            // 1. Fetch Data dari API
            const res = await fetch(`/api/reports/productivity?startDate=${startDate}&endDate=${endDate}`);
            const rawData = await res.json();

            if (!rawData || rawData.length === 0) {
                alert("Tidak ada data produktivitas pada rentang tanggal tersebut.");
                setLoading(false);
                return;
            }

            // 2. Olah Data untuk Sheet 1: REKAPITULASI (Summary)
            const summaryMap = {};

            rawData.forEach(row => {
                const name = row.technician_name;
                if (!summaryMap[name]) {
                    summaryMap[name] = { 
                        name: name, 
                        nik: row.technician_nik,
                        total: 0, 
                        closed: 0, 
                        open: 0, 
                        sc: 0 
                    };
                }
                
                summaryMap[name].total += 1;
                if (row.status === 'CLOSED') summaryMap[name].closed += 1;
                else if (row.status === 'OPEN') summaryMap[name].open += 1;
                else if (row.status === 'SC') summaryMap[name].sc += 1;
            });

            const summaryData = Object.values(summaryMap).map((item, index) => ({
                'No': index + 1,
                'Nama Teknisi': item.name,
                'NIK': item.nik,
                'Total Tiket': item.total,
                'CLOSED (Selesai)': item.closed,
                'OPEN (Proses)': item.open,
                'SC (Pending)': item.sc,
                'Achievement (%)': item.total > 0 ? ((item.closed / item.total) * 100).toFixed(1) + '%' : '0%'
            }));

            // 3. Olah Data untuk Sheet 2: DETAIL TIKET
            const detailData = rawData.map(row => ({
                'Nama Teknisi': row.technician_name,
                'ID Tiket': row.id_tiket,
                'Kategori': row.category,
                'Sub Kategori': row.subcategory,
                'STO': row.sto || '-',
                'Status': row.status,
                'Waktu Tiket': new Date(row.tiket_time).toLocaleString('id-ID'),
                'Update Terakhir': new Date(row.last_update_time).toLocaleString('id-ID')
            }));

            // 4. Buat File Excel
            const workbook = XLSX.utils.book_new();

            // Sheet Rekap
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            // Auto width kolom rekap
            const wscolsSummary = [{wch:5}, {wch:25}, {wch:15}, {wch:12}, {wch:15}, {wch:15}, {wch:15}, {wch:15}];
            wsSummary['!cols'] = wscolsSummary;
            XLSX.utils.book_append_sheet(workbook, wsSummary, "REKAP PRODUKTIVITAS");

            // Sheet Detail
            const wsDetail = XLSX.utils.json_to_sheet(detailData);
            // Auto width kolom detail
            const wscolsDetail = [{wch:25}, {wch:20}, {wch:10}, {wch:15}, {wch:8}, {wch:10}, {wch:22}, {wch:22}];
            wsDetail['!cols'] = wscolsDetail;
            XLSX.utils.book_append_sheet(workbook, wsDetail, "DETAIL DATA");

            // 5. Download File
            XLSX.writeFile(workbook, `Laporan_Produktivitas_${startDate}_sd_${endDate}.xlsx`);

        } catch (error) {
            console.error(error);
            alert("Gagal mendownload laporan.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Judul & Icon */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <FaFileExcel size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-700">Export Produktivitas</h3>
                        <p className="text-xs text-slate-500">Download laporan kinerja teknisi (Excel)</p>
                    </div>
                </div>

                {/* Filter Tanggal & Tombol */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 w-full sm:w-auto">
                        <FaCalendarAlt className="text-slate-400" />
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-xs text-slate-600 focus:outline-none"
                        />
                        <span className="text-slate-300">-</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent text-xs text-slate-600 focus:outline-none"
                        />
                    </div>

                    <button 
                        onClick={handleDownload} 
                        disabled={loading}
                        className="w-full sm:w-auto px-5 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
                    >
                        {loading ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
                        Download Excel
                    </button>
                </div>
            </div>
        </div>
    );
}