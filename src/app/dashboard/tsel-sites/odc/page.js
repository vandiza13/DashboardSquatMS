'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    FaNetworkWired, FaSearch, FaSpinner, FaMapMarkerAlt,
    FaHdd, FaLink, FaChevronRight, FaTimes, FaCopy, FaCheck
} from 'react-icons/fa';

export default function OdcTablePage() {
    const [odcs, setOdcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Modal state
    const [selectedOdc, setSelectedOdc] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleCopySites = () => {
        if (!selectedOdc || !selectedOdc.connected_sites) return;
        let textToCopy = `${selectedOdc.site_name_odc} :\n`;
        textToCopy += selectedOdc.connected_sites
            .map((site, index) => `${index + 1}. ${site.site_id} - ${site.site_name}`)
            .join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const fetchOdcs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tsel-sites/odc?search=${search}`);
            const data = await res.json();
            if (res.ok) {
                setOdcs(data.data || []);
            } else {
                setError(data.error || 'Gagal memuat data ODC');
            }
        } catch (err) {
            setError('Gagal terhubung ke server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOdcs();
    }, [search]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput), 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    return (
        <>
        <div className="space-y-6 pb-24 md:pb-0 animate-[fadeIn_0.3s_ease_forwards]">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 shrink-0">
                        <FaNetworkWired size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Data ODC</h1>
                        <p className="text-sm font-semibold text-[var(--text-muted)] mt-0.5">
                            Manajemen {odcs.length} titik Optical Distribution Cabinet
                        </p>
                    </div>
                </div>
               {/* <div className="flex gap-2">
                    <Link href="/dashboard/tsel-sites/map" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors">
                        <FaMapMarkerAlt /> Buka di Peta GIS
                    </Link>
                </div>*/}
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <FaSearch className="absolute left-4 top-3.5 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Cari Nama ODC..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-surface)] px-11 py-3 text-sm font-bold text-[var(--text-primary)] focus:border-red-500 focus:outline-none transition-colors"
                    />
                    {searchInput && (
                        <button onClick={() => setSearchInput('')} className="absolute right-4 top-3.5 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                            <FaTimes />
                        </button>
                    )}
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)]">
                    <FaSpinner className="animate-spin text-red-500 text-4xl mb-4" />
                    <p className="text-[var(--text-secondary)] font-bold">Memuat Data ODC...</p>
                </div>
            ) : error ? (
                <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
                    <p className="text-red-600 font-bold">{error}</p>
                    <button onClick={fetchOdcs} className="mt-3 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Coba Lagi</button>
                </div>
            ) : odcs.length === 0 ? (
                <div className="p-12 text-center bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)]">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
                        <FaNetworkWired size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Tidak ada ODC ditemukan</h3>
                    <p className="text-[var(--text-muted)] mt-1 font-medium">Coba gunakan kata kunci pencarian yang berbeda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {odcs.map((odc) => (
                        <div key={odc.site_name_odc} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-4 hover:border-red-300 hover:shadow-md transition-all group flex flex-col">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-sm font-black text-[var(--text-primary)] group-hover:text-red-600 transition-colors">{odc.site_name_odc}</h3>
                                    <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                                        {odc.latitude_odc && odc.longitude_odc ? `📍 ${odc.latitude_odc}, ${odc.longitude_odc}` : '📍 Koordinat tidak tersedia'}
                                    </div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-950/30 text-red-600 px-2 py-1 rounded-lg border border-red-100 dark:border-red-900/50 flex flex-col items-center">
                                    <span className="text-[10px] font-black leading-none">IMPACT</span>
                                    <span className="text-lg font-black leading-tight">{odc.total_connected_sites}</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-2 mb-4 flex-1">
                                <div className="bg-[var(--bg-base)] p-2 rounded-xl border border-[var(--border-color)]">
                                    <div className="text-[9px] text-[var(--text-muted)] font-black uppercase flex items-center gap-1"><FaHdd /> Kapasitas</div>
                                    <div className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">{odc.capacity_odc || '-'}</div>
                                </div>
                            </div>

                            <button 
                                onClick={() => setSelectedOdc(odc)}
                                className="w-full py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-[var(--border-color)]"
                            >
                                Lihat {odc.total_connected_sites} Site Terdampak <FaChevronRight size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

            {/* MODAL DETAIL ODC */}
            {selectedOdc && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 animate-[fadeIn_0.2s_ease_forwards]">
                    <div className="bg-[var(--bg-surface)] w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-red-50 dark:bg-red-950/20 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg text-red-600"><FaNetworkWired size={16} /></div>
                                <div>
                                    <h2 className="text-base font-black text-red-700 dark:text-red-400 leading-none">{selectedOdc.site_name_odc}</h2>
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mt-1">{selectedOdc.total_connected_sites} Site Terdampak</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedOdc(null)} className="p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                                <FaTimes />
                            </button>
                        </div>
                        
                        {/* Modal Body: List of Sites */}
                        <div className="p-4 overflow-y-auto flex-1 bg-[var(--bg-base)]">
                            <div className="space-y-2">
                                {selectedOdc.connected_sites.map((site, index) => (
                                    <div key={site.id || `${site.site_id}-${index}`} className="flex items-start justify-between bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-color)] hover:border-red-300 transition-colors">
                                        <div className="flex items-start gap-3 min-w-0 pr-3">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0 mt-0.5">
                                                {index + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-black text-[var(--text-primary)] truncate">{site.site_id}</div>
                                                <div className="text-[11px] font-medium text-[var(--text-muted)] break-words leading-tight mt-0.5">{site.site_name}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">{site.site_class || 'Unknown'}</span>
                                            <span className="text-[9px] font-bold text-slate-400 mt-1">{site.branch}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-surface)] rounded-b-2xl flex flex-wrap justify-between items-center gap-2">
                            <button 
                                onClick={handleCopySites} 
                                className={`px-4 py-2 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 border ${copied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                            >
                                {copied ? <><FaCheck /> Berhasil Disalin</> : <><FaCopy /> Copy Daftar Site</>}
                            </button>
                            
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedOdc(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Tutup</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
