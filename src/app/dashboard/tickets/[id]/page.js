'use client';

import { useState, useEffect, use } from 'react'; // Pastikan 'use' di-import
import { 
    FaArrowLeft, FaCalendarAlt, FaUserCircle, FaWhatsapp, 
    FaHistory, FaExclamationCircle, FaTools 
} from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TicketDetailPage({ params }) {
    // PERBAIKAN: Gunakan `use(params)` untuk unwrap Promise params di Next.js 15+
    const unwrappedParams = use(params);
    const id = unwrappedParams.id;
    
    const router = useRouter();
    const [ticket, setTicket] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Ambil Detail Tiket
                const resTicket = await fetch(`/api/tickets/${id}`);
                if (!resTicket.ok) throw new Error("Tiket tidak ditemukan");
                const ticketData = await resTicket.json();
                setTicket(ticketData);

                // 2. Ambil History Tiket
                const resHistory = await fetch(`/api/tickets/${id}/history`);
                if (resHistory.ok) {
                    const historyData = await resHistory.json();
                    setHistory(historyData);
                }
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen text-slate-500">
            <div className="h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p>Memuat detail tiket...</p>
        </div>
    );

    if (error || !ticket) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="bg-red-50 p-4 rounded-full text-red-500 mb-3"><FaExclamationCircle size={32} /></div>
            <h3 className="text-xl font-bold text-slate-800">Gagal Memuat Data</h3>
            <p className="text-slate-500 mb-6">{error || 'Data tidak ditemukan'}</p>
            <button onClick={() => router.back()} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">
                Kembali
            </button>
        </div>
    );

    // Helper Warna Status
    const getStatusColor = (status) => {
        if (status === 'OPEN') return 'bg-red-100 text-red-700 border-red-200';
        if (status === 'SC') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-green-100 text-green-700 border-green-200';
    };

    return (
        <div className="max-w-5xl mx-auto pb-20 animate-fade-in">
            {/* --- HEADER --- */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition w-fit">
                    <FaArrowLeft /> <span className="font-semibold">Kembali</span>
                </button>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-400 font-mono">ID DATABASE: {ticket.id}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* --- KOLOM KIRI: INFO UTAMA --- */}
                <div className="lg:col-span-2 space-y-6">
                    {/* KARTU HEADER TIKET */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusColor(ticket.status)}`}>
                                        {ticket.status}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500 px-2 py-0.5 bg-slate-200 rounded border border-slate-300">
                                        {ticket.category}
                                    </span>
                                </div>
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{ticket.id_tiket}</h1>
                                <p className="text-slate-500 text-sm mt-1">{ticket.subcategory}</p>
                            </div>
                            {ticket.sto && (
                                <div className="text-center bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
                                    <span className="block text-[10px] text-slate-400 font-bold uppercase">STO</span>
                                    <span className="block text-lg font-bold text-slate-700">{ticket.sto}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <FaTools className="text-slate-400" /> Deskripsi Pekerjaan
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                {ticket.deskripsi}
                            </div>

                            {ticket.update_progres && (
                                <div className="mt-4">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">
                                        {ticket.status === 'CLOSED' ? 'Root Cause (RCA)' : 'Update Progress'}
                                    </h3>
                                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-slate-700 text-sm italic border-l-4 border-l-yellow-400">
                                        "{ticket.update_progres}"
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* HISTORY LOG */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2">
                            <FaHistory className="text-slate-400" /> Riwayat Aktivitas
                        </h3>
                        <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                            {history.length === 0 ? (
                                <p className="text-sm text-slate-400 italic pl-6">Belum ada riwayat.</p>
                            ) : (
                                history.map((log, idx) => (
                                    <div key={idx} className="relative pl-6 group">
                                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-slate-200 border-2 border-white group-hover:bg-blue-500 transition-colors"></div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-slate-700">{log.changed_by || 'System'}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {new Date(log.change_timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                            {log.change_details}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* --- KOLOM KANAN: SIDEBAR INFO --- */}
                <div className="space-y-6">
                    {/* INFO TEKNISI */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Teknisi Bertugas (LENSA)</h3>
                        {ticket.technician_name ? (
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <FaUserCircle size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{ticket.technician_name}</p>
                                    <p className="text-xs text-slate-500 font-mono">{ticket.assigned_technician_niks?.split(',')[0]}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">Belum ada teknisi assign.</p>
                        )}
                        
                        {ticket.technician_phone && (
                            <a 
                                href={`https://wa.me/${ticket.technician_phone.replace(/^0/, '62')}`} 
                                target="_blank"
                                className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 border border-green-200 transition"
                            >
                                <FaWhatsapp size={14} /> Hubungi via WhatsApp
                            </a>
                        )}

                        {ticket.partner_technicians && (
                            <div className="mt-4 pt-4 border-t border-dashed border-slate-100">
                                <p className="text-xs font-bold text-slate-400 mb-2">TIM SUPPORT</p>
                                <div className="flex flex-wrap gap-1">
                                    {ticket.partner_technicians.split(',').map((p, i) => (
                                        <span key={i} className="text-[10px] bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100">
                                            {p.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* INFO WAKTU */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Detail Waktu</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1"><FaCalendarAlt /> DIBUAT PADA</p>
                                <p className="text-sm font-semibold text-slate-700">
                                    {new Date(ticket.tiket_time).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1"><FaHistory /> UPDATE TERAKHIR</p>
                                <p className="text-sm font-semibold text-slate-700">
                                    {new Date(ticket.last_update_time).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">Oleh: {ticket.updater_name || 'System'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}