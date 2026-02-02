'use client';

import { useState, useEffect } from 'react';
import { 
    FaSearch, FaSpinner, FaChevronLeft, FaChevronRight, FaPlus, 
    FaEdit, FaTrash, FaFileAlt, FaRunning, FaCheckCircle, 
    FaHardHat, FaHistory, FaLayerGroup, FaWhatsapp, FaFileExcel, 
    FaCalendarAlt, FaInbox, FaFolderOpen, FaFileUpload,
    FaHourglassHalf, FaFire, FaExclamationCircle, FaStopwatch, FaTag
} from 'react-icons/fa';
import * as XLSX from 'xlsx'; 
import TicketFormModal from '@/components/TicketFormModal';
import ReportModal from '@/components/ReportModal';
import HistoryModal from '@/components/HistoryModal'; 
import StatusBadge from '@/components/StatusBadge';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import BulkTicketModal from '@/components/BulkTicketModal';
import MultiTicketModal from '@/components/MultiTicketModal';

const CATEGORY_TABS = ['ALL', 'MTEL', 'SQUAT', 'UMT', 'CENTRATAMA'];

const CATEGORY_COLORS = {
    MTEL: 'bg-blue-100 text-blue-700 border-blue-200',
    SQUAT: 'bg-red-100 text-red-700 border-red-200',
    UMT: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    CENTRATAMA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    DEFAULT: 'bg-slate-100 text-slate-700 border-slate-200'
};

// --- KONFIGURASI SLA LENGKAP (TSEL + CNQ & OLO) ---
const SLA_LIMITS = {
    // TSEL
    'PREMIUM': 2,
    'CRITICAL': 4,
    'MAJOR': 8,
    'MINOR': 16,
    'LOW': 24,
    'CNQ': 24,
    // OLO
    'NON-GAMAS': 4,
    'GAMAS': 7,
    'QUALITY': 7
};

// --- HELPER 1: LOGIKA AGING (SLA AWARE) ---
const getTicketAging = (ticket) => {
    if (ticket.status === 'CLOSED') return null;

    const now = new Date();
    const created = new Date(ticket.tiket_time);
    const diffMs = now - created;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60)); 

    // --- A. LOGIKA KHUSUS SQUAT (TSEL & OLO) ---
    if (ticket.category === 'SQUAT' && ticket.priority && SLA_LIMITS[ticket.priority]) {
        const limit = SLA_LIMITS[ticket.priority];
        
        // 1. LEWAT SLA (BREACHED)
        if (diffHours >= limit) {
            return {
                label: 'BREACHED',
                text: `Lewat ${diffHours - limit} Jam`,
                className: 'bg-red-600 text-white border-red-700 animate-pulse shadow-md font-bold',
                icon: <FaFire />
            };
        }
        // 2. WARNING (> 75% Waktu)
        if (diffHours >= limit * 0.75) {
            return {
                label: 'WARNING',
                text: `Sisa ${limit - diffHours} Jam`,
                className: 'bg-orange-500 text-white border-orange-600 font-bold',
                icon: <FaExclamationCircle />
            };
        }
        // 3. AMAN
        return {
            label: 'ON TRACK',
            text: `Running ${diffHours} Jam`,
            className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            icon: <FaStopwatch />
        };
    }

    // --- B. LOGIKA DEFAULT (TIKET LAIN) ---
    if (diffHours < 4) {
        return { label: '< 4 Jam', text: `${diffHours} Jam`, className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <FaStopwatch /> };
    } else if (diffHours >= 4 && diffHours <= 12) {
        return { label: '4-12 Jam', text: `${diffHours} Jam`, className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <FaHourglassHalf /> };
    } else if (diffHours > 12 && diffHours <= 24) {
        return { label: '12-24 Jam', text: `${diffHours} Jam`, className: 'bg-orange-100 text-orange-700 border-orange-200', icon: <FaExclamationCircle /> };
    } else {
        const days = Math.floor(diffHours / 24);
        return { label: '> 24 Jam', text: `${days} Hari+`, className: 'bg-red-100 text-red-700 border-red-200 animate-pulse', icon: <FaFire /> };
    }
};

// --- HELPER 2: WARNA BACKGROUND BARIS ---
const getRowSeverityStyle = (ticket) => {
    if (ticket.status === 'CLOSED') return 'bg-white border-slate-200 hover:bg-slate-50';

    const now = new Date();
    const created = new Date(ticket.tiket_time);
    const diffHours = Math.floor((now - created) / (1000 * 60 * 60));

    // --- LOGIKA SQUAT (TSEL & OLO) ---
    if (ticket.category === 'SQUAT' && ticket.priority && SLA_LIMITS[ticket.priority]) {
        const limit = SLA_LIMITS[ticket.priority];
        if (diffHours >= limit) return 'bg-red-100 border-red-300 hover:bg-red-200';
        if (diffHours >= limit * 0.75) return 'bg-orange-100 border-orange-300 hover:bg-orange-200';
        return 'bg-white border-slate-200 hover:bg-slate-50';
    }

    // --- LOGIKA DEFAULT ---
    if (diffHours > 24) return 'bg-red-100 border-red-300 hover:bg-red-200'; 
    if (diffHours > 12) return 'bg-orange-100 border-orange-300 hover:bg-orange-200';
    return 'bg-white border-slate-200 hover:bg-slate-50';
};

const TicketTableSkeleton = () => ([...Array(5)].map((_, i) => (
    <tr key={i} className="border-b border-slate-50">
        <td className="px-6 py-4"><Skeleton className="h-4 w-24 mb-2"/><Skeleton className="h-3 w-16"/></td>
        <td className="px-6 py-4"><Skeleton className="h-4 w-full mb-2"/><Skeleton className="h-3 w-3/4"/></td>
        <td className="px-6 py-4"><Skeleton className="h-3 w-24 mb-2"/><Skeleton className="h-3 w-32"/></td>
        <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full"/></td>
        <td className="px-6 py-4"><Skeleton className="h-3 w-24 mb-1"/><Skeleton className="h-2 w-16"/></td>
        <td className="px-6 py-4 text-center"><div className="flex justify-center gap-2"><Skeleton className="h-8 w-8 rounded"/><Skeleton className="h-8 w-8 rounded"/></div></td>
    </tr>
)));

const MobileCardSkeleton = () => ([...Array(3)].map((_, i) => (
    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between"><div className="space-y-2 w-2/3"><Skeleton className="h-4 w-1/3"/><Skeleton className="h-3 w-1/4"/></div><Skeleton className="h-6 w-16 rounded-full"/></div>
        <Skeleton className="h-16 w-full rounded-lg"/>
        <div className="border-t border-slate-100 pt-3 flex gap-2"><Skeleton className="h-8 w-16 rounded"/><Skeleton className="h-8 w-16 rounded"/></div>
    </div>
)));

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
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isMultiRowModalOpen, setIsMultiRowModalOpen] = useState(false);

    useEffect(() => {
        fetch('/api/me').then(res => res.json()).then(data => setUserRole(data.role)).catch(console.error);
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10, search, status: activeTab, category: activeCategory, startDate, endDate });
            const res = await fetch(`/api/tickets?${params}`);
            const result = await res.json();
            if (res.ok) { setTickets(result.data); setPagination(result.pagination); }
        } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
    };

    useEffect(() => { setPage(1); }, [activeTab, activeCategory, startDate, endDate]);
    useEffect(() => { const t = setTimeout(fetchTickets, 500); return () => clearTimeout(t); }, [page, search, activeTab, activeCategory, startDate, endDate]);

    const handleCreateClick = () => { setEditingTicket(null); setIsModalOpen(true); };
    const handleEditClick = (ticket) => { setEditingTicket(ticket); setIsModalOpen(true); };
    const handleDeleteClick = async (id) => {
        if(!confirm("Hapus tiket permanen?")) return;
        try { await fetch(`/api/tickets/${id}`, { method: 'DELETE' }); fetchTickets(); } catch (err) { alert(err.message); }
    };
    const handleHistoryClick = async (id, id_tiket) => {
        setSelectedTicketId(id_tiket); setIsHistoryOpen(true); setHistoryData([]); 
        try { const res = await fetch(`/api/tickets/${id}/history`); if (res.ok) setHistoryData(await res.json()); } catch (error) { console.error(error); }
    };
    const handleExportExcel = async () => {
        if (!confirm("Download data?")) return;
        const params = new URLSearchParams({ page: 1, limit: 10000, search, status: 'CLOSED', category: activeCategory, startDate, endDate });
        const res = await fetch(`/api/tickets?${params}`);
        const { data } = await res.json();
        if (!data?.length) return alert("Data kosong.");
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tiket");
        XLSX.writeFile(wb, `Report_Tiket_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const MobileTicketCard = ({ ticket }) => (
        <div className={`p-4 rounded-xl border shadow-sm flex flex-col gap-3 relative transition-colors ${getRowSeverityStyle(ticket)}`}>
            <div className="flex justify-between items-start border-b border-black/5 pb-2 mb-1">
                <div className="flex flex-col">
                    <span className="font-extrabold text-slate-800 text-base">{ticket.id_tiket}</span>
                    
                    {ticket.id_tiket_tacc && (
                        <span className="flex items-center gap-1 text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 mt-1 w-fit">
                            <FaTag size={8}/> TACC: {ticket.id_tiket_tacc}
                        </span>
                    )}

                    <span className="text-[10px] text-slate-500 mt-0.5">{new Date(ticket.tiket_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={ticket.status} />
                    {ticket.status !== 'CLOSED' && (() => {
                        const aging = getTicketAging(ticket); 
                        return aging ? <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${aging.className}`}>{aging.icon} {aging.text}</span> : null;
                    })()}
                </div>
            </div>
            
            {/* [UPDATE MOBILE] Menambahkan flex-wrap & whitespace-nowrap pada Priority agar rapi */}
            <div className="flex flex-wrap gap-1">
                <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold border uppercase bg-white ${CATEGORY_COLORS[ticket.category] || CATEGORY_COLORS.DEFAULT}`}>{ticket.category} - {ticket.subcategory}</span>
                {ticket.sto && <span className="inline-block rounded px-2 py-0.5 text-[10px] font-bold border border-slate-200 bg-white text-slate-600">STO: {ticket.sto}</span>}
                {ticket.priority && <span className="inline-block rounded px-2 py-0.5 text-[10px] font-extrabold border border-slate-800 bg-slate-800 text-white shadow-sm whitespace-nowrap">{ticket.priority}</span>}
            </div>

            <div className="text-slate-700 text-xs bg-white/60 p-2.5 rounded-lg border border-black/5">
                <span className="font-semibold block mb-1 text-[10px] text-slate-500 uppercase">Deskripsi:</span>
                <span className="line-clamp-3">{ticket.deskripsi}</span>
            </div>
            {ticket.update_progres && (
                <div className="text-slate-700 text-xs">
                    <span className="font-semibold text-slate-500 text-[10px] uppercase">{ticket.status === 'CLOSED' ? 'RCA:' : 'Update:'}</span>
                    <p className="italic text-slate-600 mt-0.5 bg-yellow-100/50 p-1.5 rounded border-l-2 border-yellow-300 break-words text-[11px]">{ticket.update_progres}</p>
                </div>
            )}
            <div className="border-t border-black/5 pt-2 mt-1">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-white/80 text-slate-600 px-1.5 rounded font-bold border border-black/10">PIC</span>
                        <span className="text-xs font-bold text-slate-700">{ticket.technician_name || 'Belum assign'}</span>
                    </div>
                    {ticket.technician_phone && <a href={`https://wa.me/${ticket.technician_phone.replace(/^0/, '62')}`} target="_blank" className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100 hover:bg-green-100"><FaWhatsapp/> Hubungi</a>}
                </div>
                {ticket.partner_technicians && <div className="text-[10px] text-slate-500 mt-2 bg-white/50 p-1.5 rounded border border-black/5"><span className="font-bold text-slate-400 block mb-0.5">Support:</span> {ticket.partner_technicians}</div>}
            </div>
            <div className="flex flex-col gap-3 pt-3 mt-1 border-t border-black/5">
                <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><FaHistory/> Updated: {new Date(ticket.last_update_time).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}</span>
                    <span className="italic">by {ticket.updater_name || 'System'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {userRole !== 'View' && <button onClick={() => handleEditClick(ticket)} className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-blue-600 bg-white hover:bg-blue-50 rounded-lg border border-blue-100 shadow-sm"><FaEdit/> Edit</button>}
                    <button onClick={() => handleHistoryClick(ticket.id, ticket.id_tiket)} className={`flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-purple-600 bg-white hover:bg-purple-50 rounded-lg border border-purple-100 shadow-sm ${userRole === 'View' ? 'col-span-3' : ''}`}><FaHistory/> Log</button>
                    {userRole === 'Admin' && <button onClick={() => handleDeleteClick(ticket.id)} className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-red-600 bg-white hover:bg-red-50 rounded-lg border border-red-100 shadow-sm"><FaTrash/> Hapus</button>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-24 md:pb-0 w-full max-w-[100vw] overflow-x-hidden">
            <TicketFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchTickets} initialData={editingTicket} />
            <BulkTicketModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} onSuccess={fetchTickets} />
            <MultiTicketModal isOpen={isMultiRowModalOpen} onClose={() => setIsMultiRowModalOpen(false)} onSuccess={fetchTickets} />
            <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} categoryFilter={activeCategory} />
            <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} historyData={historyData} ticketId={selectedTicketId} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div><h2 className="text-xl md:text-2xl font-bold text-slate-800">Manajemen Tiket</h2><p className="text-slate-500 text-xs md:text-sm">Monitor dan kelola tiket lapangan</p></div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setIsReportModalOpen(true)} className="flex-1 md:flex-none justify-center flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs md:text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition"><FaFileAlt /> Laporan</button>
                    {userRole !== 'View' && (
                        <div className="flex gap-2 bg-indigo-50 p-1 rounded-lg border border-indigo-100">
                            <button onClick={() => setIsMultiRowModalOpen(true)} className="flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-white hover:shadow-sm transition"><FaPlus /> Input Massal</button>
                            <div className="w-[1px] bg-indigo-200 my-1"></div>
                            <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-white hover:shadow-sm transition"><FaFileUpload /> Import Excel</button>
                        </div>
                    )}
                    {userRole !== 'View' && <button onClick={handleCreateClick} className="flex-1 md:flex-none justify-center flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs md:text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition"><FaPlus /> Buat Tiket</button>}
                </div>
            </div>

            <div className="grid grid-cols-2 rounded-xl bg-slate-200 p-1 md:w-96 shadow-inner w-full">
                <button onClick={() => setActiveTab('RUNNING')} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs md:text-sm font-bold transition-all ${activeTab === 'RUNNING' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><FaRunning /> RUNNING</button>
                <button onClick={() => setActiveTab('CLOSED')} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs md:text-sm font-bold transition-all ${activeTab === 'CLOSED' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><FaCheckCircle /> CLOSED</button>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-100">
                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
                    {CATEGORY_TABS.map((cat) => <button key={cat} onClick={() => setActiveCategory(cat)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${activeCategory === cat ? 'bg-slate-800 text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{cat}</button>)}
                </div>
                <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full md:w-auto">
                        <div className="flex items-center gap-2"><FaCalendarAlt className="text-slate-400 text-xs hidden sm:block"/><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs text-slate-600 focus:outline-none w-full sm:w-auto p-1"/></div>
                        <span className="text-slate-300 hidden sm:block">-</span>
                        <div className="flex items-center gap-2 border-t sm:border-t-0 border-slate-200 pt-1 sm:pt-0"><span className="text-[10px] text-slate-400 sm:hidden">Sampai:</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs text-slate-600 focus:outline-none w-full sm:w-auto p-1"/></div>
                    </div>
                    <div className="relative w-full md:w-auto"><FaSearch className="absolute left-3 top-2.5 text-slate-400 text-xs"/><input type="text" placeholder="Cari ID / Deskripsi..." className="w-full md:w-48 rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)}/></div>
                    {activeTab === 'CLOSED' && <button onClick={handleExportExcel} className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 shadow-sm transition whitespace-nowrap w-full md:w-auto"><FaFileExcel /> Excel</button>}
                </div>
            </div>

            <div className="md:hidden space-y-4">
                {loading ? <MobileCardSkeleton /> : tickets.length === 0 ? <EmptyState title={search ? "Tidak Ditemukan" : "Belum Ada Tiket"} message={search ? `Pencarian "${search}" nihil.` : `Belum ada data.`} icon={search ? FaSearch : FaFolderOpen}/> : tickets.map(t => <MobileTicketCard key={t.id} ticket={t} />)}
            </div>

            <div className="hidden md:block overflow-hidden rounded-xl bg-white shadow-sm border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b text-xs">
                            <tr><th className="px-6 py-4">Info Tiket</th><th className="px-6 py-4">Deskripsi</th><th className="px-6 py-4">Teknisi</th><th className="px-6 py-4">Status & SLA</th><th className="px-6 py-4">Update</th><th className="px-6 py-4 text-center">Aksi</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? <TicketTableSkeleton /> : tickets.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-slate-500">Data Kosong</td></tr> : tickets.map(ticket => (
                                <tr key={ticket.id} className={`transition group border-b ${getRowSeverityStyle(ticket)}`}>
                                    <td className="px-6 py-4 align-top">
                                        <div className="font-bold text-slate-800 text-xs">{ticket.id_tiket}</div>
                                        
                                        {/* [BARU] TAMPILAN TACC DI DESKTOP */}
                                        {ticket.id_tiket_tacc && (
                                            <div className="mt-1">
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                                    <FaTag size={8}/> TACC: {ticket.id_tiket_tacc}
                                                </span>
                                            </div>
                                        )}

                                        {/* [UPDATE DESKTOP] Menambahkan flex-wrap & whitespace-nowrap pada Priority */}
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border uppercase bg-white ${CATEGORY_COLORS[ticket.category]}`}>{ticket.category}-{ticket.subcategory}</span>
                                            {ticket.priority && <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold border border-slate-800 bg-slate-800 text-white whitespace-nowrap">{ticket.priority}</span>}
                                        </div>
                                        {ticket.sto && <div className="mt-1"><span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border border-slate-200 bg-white text-slate-500">STO: {ticket.sto}</span></div>}
                                        <div className="text-[10px] text-slate-400 mt-1">{new Date(ticket.tiket_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top max-w-sm">
                                        <div className="text-slate-700 text-xs line-clamp-3 mb-2" title={ticket.deskripsi}>{ticket.deskripsi}</div>
                                        {ticket.update_progres && <div className="text-[10px] text-slate-600 bg-yellow-100/50 p-2 rounded border border-yellow-200 flex gap-1"><span className="font-bold text-yellow-700 shrink-0">{ticket.status === 'CLOSED' ? 'RCA:' : 'Note:'}</span><span className="italic">{ticket.update_progres}</span></div>}
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        {ticket.technician_name ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-700">{ticket.technician_name}</span><span className="text-[9px] px-1 bg-blue-50 text-blue-600 rounded border border-blue-100 font-bold">LENSA</span></div>
                                                {ticket.technician_phone && <a href={`https://wa.me/${ticket.technician_phone.replace(/^0/,'62')}`} target="_blank" className="flex items-center gap-1 text-[10px] text-green-600 hover:underline"><FaWhatsapp/> {ticket.technician_phone}</a>}
                                                {ticket.partner_technicians && <div className="text-[10px] text-slate-500 bg-white/60 p-1 rounded border border-slate-200 mt-1"><span className="font-bold text-slate-400 block">Support:</span>{ticket.partner_technicians}</div>}
                                            </div>
                                        ) : <span className="text-xs text-slate-400 italic">Belum assign</span>}
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex flex-col gap-2 items-start">
                                            <StatusBadge status={ticket.status} />
                                            {(() => { const aging = getTicketAging(ticket); return aging ? <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap bg-white ${aging.className}`}>{aging.icon}{aging.text}</span> : null; })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-700">{new Date(ticket.last_update_time).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}</span>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><FaHistory /> {ticket.updater_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {userRole !== 'View' && <button onClick={() => handleEditClick(ticket)} className="p-1.5 text-blue-600 hover:bg-blue-50 bg-white rounded border border-slate-200 shadow-sm"><FaEdit/></button>}
                                            <button onClick={() => handleHistoryClick(ticket.id, ticket.id_tiket)} className="p-1.5 text-purple-600 hover:bg-purple-50 bg-white rounded border border-slate-200 shadow-sm"><FaHistory/></button>
                                            {userRole === 'Admin' && <button onClick={() => handleDeleteClick(ticket.id)} className="p-1.5 text-red-600 hover:bg-red-50 bg-white rounded border border-slate-200 shadow-sm"><FaTrash/></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {!loading && tickets.length > 0 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-4 bg-white md:bg-slate-50 rounded-lg md:rounded-none"><span className="text-xs text-slate-500">Hal {pagination.currentPage}/{pagination.totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="rounded p-1.5 border hover:bg-white disabled:opacity-50"><FaChevronLeft/></button><button onClick={() => setPage(p => Math.min(pagination.totalPages, p+1))} disabled={page===pagination.totalPages} className="rounded p-1.5 border hover:bg-white disabled:opacity-50"><FaChevronRight/></button></div></div>}
        </div>
    );
}