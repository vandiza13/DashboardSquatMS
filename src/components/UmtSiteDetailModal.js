'use client';

import { FaTimes, FaGlobe, FaTag, FaMapMarkedAlt } from 'react-icons/fa';

export default function UmtSiteDetailModal({ isOpen, onClose, site }) {
    if (!isOpen || !site) return null;

    const displayVal = (val, fallback = '-') => {
        if (val === undefined || val === null || String(val).trim() === '') return fallback;
        return val;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto relative border border-[var(--border-color)] animate-[fadeIn_0.2s_ease_forwards]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface-2)]">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-orange-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">UMT SITE</span>
                        </div>
                        <h3 className="font-extrabold text-xl text-[var(--text-primary)] mt-1">
                            {site.site_id} - {displayVal(site.site_name, 'No Site Name')}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-red-500 transition p-1.5 rounded-full hover:bg-[var(--bg-base)]">
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] space-y-3">
                            <h4 className="text-xs font-black text-blue-500 uppercase tracking-wide flex items-center gap-1"><FaTag /> Informasi Pokok</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Site ID:</span><span className="font-extrabold text-[var(--text-primary)]">{site.site_id}</span></div>
                                <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Nama Site:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.site_name)}</span></div>
                                <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">STO:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.sto)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)] font-semibold">Ring:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.ring)}</span></div>
                            </div>
                        </div>

                        <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] flex flex-col justify-between">
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-blue-500 uppercase tracking-wide flex items-center gap-1"><FaMapMarkedAlt /> Lokasi GPS</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Latitude:</span><span className="font-mono text-xs text-[var(--text-primary)]">{displayVal(site.latitude)}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Longitude:</span><span className="font-mono text-xs text-[var(--text-primary)]">{displayVal(site.longitude)}</span></div>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">Catatan Keterangan:</span>
                                <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed whitespace-pre-wrap">{displayVal(site.keterangan, 'Tidak ada catatan tambahan.')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-[var(--bg-surface-2)] border-t border-[var(--border-color)] flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm transition"
                    >
                        Tutup
                    </button>
                </div>

            </div>
        </div>
    );
}
