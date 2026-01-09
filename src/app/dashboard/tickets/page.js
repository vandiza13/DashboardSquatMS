'use client';

import { useState, useEffect } from 'react';
import { 
    FaSearch, FaSpinner, FaChevronLeft, FaChevronRight, FaPlus, 
    FaEdit, FaTrash, FaFileAlt, FaRunning, FaCheckCircle, 
    FaHardHat, FaHistory, FaLayerGroup, FaWhatsapp, FaFileExcel, 
    FaCalendarAlt, FaInbox, FaFolderOpen 
} from 'react-icons/fa';
import * as XLSX from 'xlsx'; 
import TicketFormModal from '@/components/TicketFormModal';
import ReportModal from '@/components/ReportModal';
import HistoryModal from '@/components/HistoryModal'; 
import StatusBadge from '@/components/StatusBadge';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState'; // Pastikan file ini sudah dibuat (lihat instruksi sebelumnya)

const CATEGORY_TABS = ['ALL', 'MTEL', 'SQUAT', 'UMT', 'CENTRATAMA'];

const CATEGORY_COLORS = {
    MTEL: 'bg-blue-100 text-blue-700 border-blue-200',
    SQUAT: 'bg-red-100 text-red-700 border-red-200',
    UMT: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    CENTRATAMA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    DEFAULT: 'bg-slate-100 text-slate-700 border-slate-200'
};

// --- KOMPONEN SKELETON (LOADING STATE) ---

// 1. Skeleton untuk Tabel Desktop
const TicketTableSkeleton = () => {
    return (
        [...Array(5)].map((_, index) => (
            <tr key={index} className="border-b border-slate-50">
                <td className="px-6 py-4 align-top">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                </td>
                <td className="px-6 py-4 align-top">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-3/4" />
                </td>
                <td className="px-6 py-4 align-top">
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </td>
                <td className="px-6 py-4 align-top">
                    <Skeleton className="h-6 w-20 rounded-full" />
                </td>
                <td className="px-6 py-4 align-top">
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-2 w-16" />
                </td>
                <td className="px-6 py-4 text-center align-top">
                    <div className="flex justify-center gap-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                    </div>
                </td>
            </tr>
        ))
    );
};

// 2. Skeleton untuk Kartu HP (Mobile)
const MobileCardSkeleton = () => {
    return (
        [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-2 w-2/3">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-16 w-full rounded-lg" />
                <div className="border-t border-slate-100 pt-3 flex gap-2">
                    <Skeleton className="h-8 w-16 rounded" />
                    <Skeleton className="h-8 w-16 rounded" />
                </div>
            </div>
        ))
    );
};

export default function TicketsPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    
    const [startDate, setStartDate] = useState(''); 
    const [endDate, setEndDate] = useState('');

    const [activeTab, setActiveTab] = useState('RUNNING'); 
    const [activeCategory, setActiveCategory] = useState('ALL');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTicket, setEditingTicket] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [selectedTicketId, setSelectedTicketId] = useState('');

    useEffect(() => {
        fetch('/api/me')
            .then(res => res.json())
            .then(data => setUserRole(data.role))
            .catch(err => console.error(err));
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page, limit: 10, search: search, status: activeTab,
                category: activeCategory, startDate: startDate, endDate: endDate
            });
            const res = await fetch(`/api/tickets?${params.toString()}`);
            const result = await res.json();
            if (res.ok) {
                setTickets(result.data);
                setPagination(result.pagination);
            }
        } catch (error) { console.error("Gagal ambil tiket:", error); } 
        finally { setLoading(false); }
    };

    useEffect(() => { setPage(1); }, [activeTab, activeCategory, startDate, endDate]);
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchTickets();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [page, search, activeTab, activeCategory, startDate, endDate]);

    const handleCreateClick = () => { setEditingTicket(null); setIsModalOpen(true); };
    const handleEditClick = (ticket) => { setEditingTicket(ticket); setIsModalOpen(true); };
    
    const handleDeleteClick = async (id) => {
        if(!confirm("Hapus tiket permanen?")) return;
        try {
            const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
            if(!res.ok) throw new Error("Gagal menghapus (Akses Ditolak)");
            fetchTickets();
        } catch (err) { alert(err.message); }
    };

    const handleHistoryClick = async (id, id_tiket) => {
        setSelectedTicketId(id_tiket);
        setIsHistoryOpen(true);
        setHistoryData([]); 
        try {
            const res = await fetch(`/api/tickets/${id}/history`);
            if (res.ok) {
                const data = await res.json();
                setHistoryData(data);
            }
        } catch (error) { console.error(error); }
    };

    const handleExportExcel = async () => {
        if (!confirm("Download data tiket closed?")) return;
        try {
            const params = new URLSearchParams({
                page: 1, limit: 10000, search: search, status: 'CLOSED',
                category: activeCategory, startDate: startDate, endDate: endDate
            });
            const res = await fetch(`/api/tickets?${params.toString()}`);
            const result = await res.json();
            const dataToExport = result.data;

            if (!dataToExport || dataToExport.length === 0) { alert("Data kosong."); return; }

            const formattedData = dataToExport.map(t => ({
                'ID Tiket': t.id_tiket, 'Kategori': t.category, 'Sub Kategori': t.subcategory,
                'Deskripsi': t.deskripsi, 
                'Status': t.status,
                'Update Progress': t.update_progres || '-',
                'Teknisi PIC': t.technician_name || '-', 
                'No HP PIC': t.technician_phone || '-',
                'Tim Support': t.partner_technicians || '-',
                'STO': t.sto || '-', 
                'Waktu Buat': new Date(t.tiket_time).toLocaleString('id-ID'),
                'Update Terakhir': t.last_update_time ? new Date(t.last_update_time).toLocaleString('id-ID') : '-',
            }));

            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Tiket Closed");
            XLSX.writeFile(workbook, `Report_Tiket_${new Date().toISOString().slice(0,10)}.xlsx`);
        } catch (error) { console.error(error); alert("Gagal export."); }
    };

    const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.DEFAULT;

    // --- KOMPONEN KARTU MOBILE (HP) ---
    const MobileTicketCard = ({ ticket }) => (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 relative">
            {/* Header: Kategori & Status */}
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0"> {/* min-w-0 penting agar flex item bisa shrink */}
                    <div className="flex flex-wrap gap-1 mb-1">
                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold border uppercase ${getCategoryColor(ticket.category)}`}>
                            {ticket.category} - {ticket.subcategory}
                        </span>
                        {ticket.sto && (
                            <span className="inline-block rounded px-2 py-0.5 text-[10px] font-bold border border-slate-200 bg-slate-100 text-slate-600">
                                STO: {ticket.sto}
                            </span>
                        )}
                    </div>
                    {/* Menggunakan StatusBadge */}
                    <div className="shrink-0 mb-1"><StatusBadge status={ticket.status} /></div>
                    <div className="text-[10px] text-slate-400">{new Date(ticket.tiket_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
            </div>

            {/* Deskripsi */}
            <div className="text-slate-700 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold block mb-1 text-[10px] text-slate-500 uppercase">Deskripsi:</span>
                {ticket.deskripsi}
            </div>

            {/* Update / RCA */}
            {ticket.update_progres && (
                <div className="text-slate-700 text-xs">
                    <span className="font-semibold text-slate-500 text-[10px] uppercase">
                        {ticket.status === 'CLOSED' ? 'Root Cause (RCA):' : 'Update Progress:'}
                    </span>
                    <p className="italic text-slate-600 mt-0.5 bg-yellow-50/50 p-1.5 rounded border-l-2 border-yellow-300 break-words">
                        {ticket.update_progres}
                    </p>
                </div>
            )}

            {/* Teknisi Info */}
            <div className="border-t border-dashed border-slate-200 pt-2">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 rounded font-bold border border-slate-200">PIC</span>
                        <span className="text-xs font-bold text-slate-700">{ticket.technician_name || 'Belum assign'}</span>
                    </div>
                    
                    {/* Tombol WA di Mobile */}
                    {ticket.technician_phone && (
                        <a href={`https://wa.me/${ticket.technician_phone.replace(/^0/, '62')}`} target="_blank" className="ml-9 flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-50 px-2 py-1 rounded w-fit border border-green-100 active:scale-95 transition-transform hover:bg-green-100 mb-1">
                            <FaWhatsapp /> {ticket.technician_phone}
                        </a>
                    )}
                </div>
                {ticket.partner_technicians && (
                    <div className="text-[10px] text-slate-500 pl-9 mt-1">
                        <span className="font-bold text-slate-400">Support:</span> 
                        <div className="mt-0.5">{ticket.partner_technicians}</div>
                    </div>
                )}
            </div>

            {/* Last Update Info (Mobile) */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                    <FaHistory /> 
                    {new Date(ticket.last_update_time).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}
                </span>
                <span className="italic">by {ticket.updater_name || 'System'}</span>
            </div>

            {/* Actions Toolbar */}
            <div className="flex justify-end items-center gap-2 mt-1 pt-2">
                 {userRole !== 'View' && (
                    <button onClick={() => handleEditClick(ticket)} className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-100">
                        <FaEdit /> Edit
                    </button>
                )}
                <button onClick={() => handleHistoryClick(ticket.id, ticket.id_tiket)} className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition border border-purple-100">
                    <FaHistory /> Log
                </button>
                 {userRole === 'Admin' && (
                    <button onClick={() => handleDeleteClick(ticket.id)} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 border border-red-100">
                        <FaTrash />
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-24 md:pb-0 w-full max-w-[100vw] overflow-x-hidden"> 
            <TicketFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchTickets} initialData={editingTicket} />
            <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} categoryFilter={activeCategory} />
            <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} historyData={historyData} ticketId={selectedTicketId} />

            {/* HEADER RESPONSIVE */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800">Manajemen Tiket</h2>
                    <p className="text-slate-500 text-xs md:text-sm">Monitor dan kelola tiket lapangan</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setIsReportModalOpen(true)} className="flex-1 md:flex-none justify-center flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs md:text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition"><FaFileAlt /> Laporan</button>
                    {userRole !== 'View' && (
                        <button onClick={handleCreateClick} className="flex-1 md:flex-none justify-center flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs md:text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition"><FaPlus /> Buat Tiket</button>
                    )}
                </div>
            </div>

            {/* TABS RESPONSIVE */}
            <div className="grid grid-cols-2 rounded-xl bg-slate-200 p-1 md:w-96 shadow-inner w-full">
                <button onClick={() => setActiveTab('RUNNING')} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs md:text-sm font-bold transition-all ${activeTab === 'RUNNING' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><FaRunning /> RUNNING</button>
                <button onClick={() => setActiveTab('CLOSED')} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs md:text-sm font-bold transition-all ${activeTab === 'CLOSED' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><FaCheckCircle /> CLOSED</button>
            </div>

            {/* FILTERS RESPONSIVE */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-100">
                {/* 1. Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
                    {CATEGORY_TABS.map((cat) => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${activeCategory === cat ? 'bg-slate-800 text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{cat}</button>
                    ))}
                </div>

                {/* 2. Date & Search */}
                <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <FaCalendarAlt className="text-slate-400 text-xs hidden sm:block" />
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs text-slate-600 focus:outline-none w-full sm:w-auto p-1" />
                        </div>
                        <span className="text-slate-300 hidden sm:block">-</span>
                        <div className="flex items-center gap-2 border-t sm:border-t-0 border-slate-200 pt-1 sm:pt-0">
                             <span className="text-[10px] text-slate-400 sm:hidden">Sampai:</span>
                             <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs text-slate-600 focus:outline-none w-full sm:w-auto p-1" />
                        </div>
                    </div>

                    <div className="relative w-full md:w-auto">
                        <FaSearch className="absolute left-3 top-2.5 text-slate-400 text-xs" />
                        <input type="text" placeholder="Cari ID / Deskripsi..." className="w-full md:w-48 rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    {activeTab === 'CLOSED' && (
                        <button onClick={handleExportExcel} className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 shadow-sm transition whitespace-nowrap w-full md:w-auto"><FaFileExcel /> Excel</button>
                    )}
                </div>
            </div>

            {/* --- LIST TIKET --- */}
            
            {/* 1. TAMPILAN MOBILE (Card View) */}
            <div className="md:hidden space-y-4">
                {/* LOGIKA LOADING: SKELETON */}
                {loading ? (
                    <MobileCardSkeleton /> 
                ) : tickets.length === 0 ? (
                    /* LOGIKA KOSONG: EMPTY STATE (Search vs Kosong Biasa) */
                    <EmptyState 
                        title={search ? "Tidak Ditemukan" : "Belum Ada Tiket"}
                        message={search 
                            ? `Pencarian untuk "${search}" tidak memberikan hasil.` 
                            : `Belum ada tiket dengan status ${activeTab} di kategori ${activeCategory}.`
                        }
                        icon={search ? FaSearch : FaFolderOpen}
                        actionLabel={!search && userRole !== 'View' && activeTab === 'RUNNING' ? "Buat Tiket Baru" : null}
                        onAction={!search && userRole !== 'View' && activeTab === 'RUNNING' ? handleCreateClick : null}
                    />
                ) : (
                    tickets.map(ticket => <MobileTicketCard key={ticket.id} ticket={ticket} />)
                )}
            </div>

            {/* 2. TAMPILAN DESKTOP (Table View) */}
            <div className="hidden md:block overflow-hidden rounded-xl bg-white shadow-sm border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b text-xs">
                            <tr>
                                <th className="px-6 py-4">Info Tiket</th>
                                <th className="px-6 py-4">Deskripsi & Update</th>
                                <th className="px-6 py-4">Teknisi</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Waktu Update</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* LOGIKA LOADING: SKELETON */}
                            {loading ? (
                                <TicketTableSkeleton />
                            ) : tickets.length === 0 ? (
                                /* LOGIKA KOSONG: EMPTY STATE DALAM TABEL */
                                <tr>
                                    <td colSpan="6" className="p-8">
                                        <EmptyState 
                                            title={search ? "Pencarian Tidak Ditemukan" : "List Tiket Kosong"}
                                            message={search 
                                                ? `Tidak ada tiket yang cocok dengan kata kunci "${search}".` 
                                                : "Saat ini belum ada data tiket yang tersedia untuk ditampilkan."
                                            }
                                            icon={search ? FaSearch : FaInbox}
                                            actionLabel={!search && userRole !== 'View' && activeTab === 'RUNNING' ? "Buat Tiket Baru" : null}
                                            onAction={!search && userRole !== 'View' && activeTab === 'RUNNING' ? handleCreateClick : null}
                                            className="border-none bg-transparent shadow-none"
                                        />
                                    </td>
                                </tr>
                            ) : (
                                tickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-slate-50 transition group">
                                        
                                        {/* INFO TIKET */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="font-bold text-slate-800 text-xs">{ticket.id_tiket}</div>
                                            <span className={`inline-block mt-1 rounded px-1.5 py-0.5 text-[10px] font-bold border uppercase ${getCategoryColor(ticket.category)}`}>{ticket.category} - {ticket.subcategory}</span>
                                            {ticket.sto && (
                                                <span className="ml-1 inline-block mt-1 rounded px-1.5 py-0.5 text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-500">
                                                    STO: {ticket.sto}
                                                </span>
                                            )}
                                            <div className="text-[10px] text-slate-400 mt-1">{new Date(ticket.tiket_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                                        </td>
                                        
                                        {/* DESKRIPSI & UPDATE */}
                                        <td className="px-6 py-4 align-top max-w-sm">
                                            <div className="text-slate-700 text-xs line-clamp-3 mb-2" title={ticket.deskripsi}>{ticket.deskripsi}</div>
                                            {ticket.update_progres && (
                                                <div className="text-[10px] text-slate-600 bg-yellow-50 p-2 rounded border border-yellow-100 flex items-start gap-1">
                                                    <span className="font-bold text-yellow-700 shrink-0">
                                                        {ticket.status === 'CLOSED' ? 'RCA:' : 'Note:'}
                                                    </span> 
                                                    <span className="italic">{ticket.update_progres}</span>
                                                </div>
                                            )}
                                        </td>
                                        
                                        {/* TEKNISI */}
                                        <td className="px-6 py-4 align-top">
                                            {ticket.technician_name ? (
                                                <div className="flex flex-col gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-slate-700">{ticket.technician_name}</span>
                                                            <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 font-bold uppercase tracking-wider">LENSA</span>
                                                        </div>
                                                        {ticket.technician_phone && (
                                                            <a href={`https://wa.me/${ticket.technician_phone.replace(/^0/, '62')}`} target="_blank" className="flex items-center gap-1 text-[10px] text-green-600 hover:underline">
                                                                <FaWhatsapp /> {ticket.technician_phone}
                                                            </a>
                                                        )}
                                                    </div>
                                                    {ticket.partner_technicians && (
                                                        <div className="pt-2 border-t border-dashed border-slate-200">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tim Support:</span>
                                                            <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                                                                {ticket.partner_technicians.split(',').map((p, idx) => (
                                                                    <div key={idx} className="flex items-start gap-1 mb-0.5 last:mb-0">
                                                                        <span className="text-slate-300">•</span> {p.trim()}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (<span className="text-xs text-slate-400 italic">Belum assign</span>)}
                                        </td>

                                        {/* STATUS */}
                                        <td className="px-6 py-4 align-top">
                                            <StatusBadge status={ticket.status} />
                                        </td>

                                        {/* WAKTU UPDATE */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-slate-700">{new Date(ticket.last_update_time).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}</span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><FaHistory /> by {ticket.updater_name || 'System'}</span>
                                            </div>
                                        </td>

                                        {/* AKSI */}
                                        <td className="px-6 py-4 align-top text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {userRole !== 'View' && (
                                                    <button onClick={() => handleEditClick(ticket)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-slate-200" title="Edit"><FaEdit /></button>
                                                )}
                                                <button onClick={() => handleHistoryClick(ticket.id, ticket.id_tiket)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-slate-200" title="History"><FaHistory /></button>
                                                {userRole === 'Admin' && (
                                                    <button onClick={() => handleDeleteClick(ticket.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-slate-200" title="Hapus"><FaTrash /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {!loading && tickets.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-4 bg-white md:bg-slate-50 rounded-lg md:rounded-none">
                    <span className="text-xs text-slate-500">Hal {pagination.currentPage} dari {pagination.totalPages}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded p-1.5 text-slate-600 hover:bg-white border disabled:opacity-50"><FaChevronLeft /></button>
                        <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="rounded p-1.5 text-slate-600 hover:bg-white border disabled:opacity-50"><FaChevronRight /></button>
                    </div>
                </div>
            )}
        </div>
    );
}