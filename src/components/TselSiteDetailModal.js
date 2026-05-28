'use client';

import { useState } from 'react';
import { FaTimes, FaGlobe, FaServer, FaCodeBranch, FaHdd, FaMapMarkedAlt, FaTag } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import Skeleton from './Skeleton';

// Load Peta Leaflet secara dinamis (tanpa Server-Side Rendering)
const TselSiteMap = dynamic(() => import('./TselSiteMap'), {
    ssr: false,
    loading: () => <Skeleton className="h-[350px] w-full rounded-2xl" />
});

export default function TselSiteDetailModal({ isOpen, onClose, site }) {
    const [activeTab, setActiveTab] = useState('general');

    if (!isOpen || !site) return null;

    // Helper: Formatter untuk data null
    const displayVal = (val, fallback = '-') => {
        if (val === undefined || val === null || String(val).trim() === '') return fallback;
        return val;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease_forwards] overflow-y-auto">
            <div className="w-full max-w-3xl bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto relative border border-[var(--border-color)]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface-2)]">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">TSEL SITE</span>
                            <span className="text-xs text-[var(--text-muted)] font-mono">{site.id_tiket_tacc || site.id}</span>
                        </div>
                        <h3 className="font-extrabold text-xl text-[var(--text-primary)] mt-1">
                            {site.site_id} - {displayVal(site.site_name, 'No Site Name')}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-red-500 transition p-1.5 rounded-full hover:bg-[var(--bg-base)]">
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Tabs Selector */}
                <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-base)] overflow-x-auto no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all uppercase whitespace-nowrap ${
                            activeTab === 'general'
                                ? 'border-blue-500 text-blue-500 bg-[var(--bg-surface)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <FaGlobe size={13} /> General
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('backbone')}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all uppercase whitespace-nowrap ${
                            activeTab === 'backbone'
                                ? 'border-blue-500 text-blue-500 bg-[var(--bg-surface)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <FaServer size={13} /> Backbone & IP
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('subrack')}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all uppercase whitespace-nowrap ${
                            activeTab === 'subrack'
                                ? 'border-blue-500 text-blue-500 bg-[var(--bg-surface)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <FaHdd size={13} /> Core Subrack
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('odcodp')}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all uppercase whitespace-nowrap ${
                            activeTab === 'odcodp'
                                ? 'border-blue-500 text-blue-500 bg-[var(--bg-surface)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <FaCodeBranch size={13} /> ODC & ODP Fiber
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('map')}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all uppercase whitespace-nowrap ${
                            activeTab === 'map'
                                ? 'border-blue-500 text-blue-500 bg-[var(--bg-surface)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <FaMapMarkedAlt size={13} /> Visual Peta Link
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-4 text-sm">

                    {/* === TAB 1: GENERAL === */}
                    {activeTab === 'general' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-[fadeIn_0.2s_ease_forwards]">
                            <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] space-y-3">
                                <h4 className="text-xs font-black text-blue-500 uppercase tracking-wide flex items-center gap-1"><FaTag /> Informasi Pokok</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Site ID:</span><span className="font-extrabold text-[var(--text-primary)]">{site.site_id}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Nama Site:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.site_name)}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Site Class:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.site_class)}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Branch:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.branch)}</span></div>
                                    <div className="flex justify-between"><span className="text-[var(--text-muted)] font-semibold">STO:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.sto)}</span></div>
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
                    )}

                    {/* === TAB 2: BACKBONE & IP === */}
                    {activeTab === 'backbone' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-[fadeIn_0.2s_ease_forwards]">
                            <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] space-y-3">
                                <h4 className="text-xs font-black text-blue-500 uppercase tracking-wide flex items-center gap-1"><FaServer /> Backbone Router</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Metro Backbone:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.metro)}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Port Metro:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.port_metro)}</span></div>
                                    <div className="flex justify-between border-b border(--border-color) pb-2"><span className="text-[var(--text-muted)] font-semibold">Link Akses:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.akses)}</span></div>
                                    <div className="flex justify-between"><span className="text-[var(--text-muted)] font-semibold">Port Connection:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.port_connection)}</span></div>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] space-y-3">
                                <h4 className="text-xs font-black text-blue-500 uppercase tracking-wide flex items-center gap-1"><FaGlobe /> OLT & ONT Routing</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">IP OLT:</span><span className="font-mono text-xs font-bold text-[var(--text-primary)]">{displayVal(site.ip_olt)}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">GPON / Subrack:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.gpon)}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Port GPON:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.port_gpon)}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">IP ONT:</span><span className="font-mono text-xs font-bold text-[var(--text-primary)]">{displayVal(site.ip_ont)}</span></div>
                                    <div className="flex justify-between"><span className="text-[var(--text-muted)] font-semibold">SN ONT:</span><span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{displayVal(site.sn_ont)}</span></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === TAB 3: SUBRACK === */}
                    {activeTab === 'subrack' && (
                        <div className="bg-[var(--bg-base)] p-6 rounded-xl border border-[var(--border-color)] space-y-4 animate-[fadeIn_0.2s_ease_forwards]">
                            <h4 className="text-xs font-black text-blue-500 uppercase tracking-wide flex items-center gap-1"><FaHdd /> Core Subrack & ODF Address</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)]">
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">EA Subrack Core (Equipment Address)</span>
                                    <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{displayVal(site.ea_subrack_core)}</span>
                                </div>
                                <div className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)]">
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">OA Subrack Core (Optical Address)</span>
                                    <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{displayVal(site.oa_subrack_core)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === TAB 4: ODC & ODP === */}
                    {activeTab === 'odcodp' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-[fadeIn_0.2s_ease_forwards]">
                            {/* ODC PANEL */}
                            <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] space-y-3">
                                <h4 className="text-xs font-black text-blue-500 uppercase tracking-wide flex items-center gap-1"><FaCodeBranch /> Optical Distribution Cabinet (ODC)</h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Nama ODC:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.site_name_odc)}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Kapasitas Core:</span><span className="font-bold text-[var(--text-primary)]">{site.capacity_odc ? `${site.capacity_odc} Core` : '-'}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Bastray Feeder:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.bastray_feeder_odc)}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Core Feeder:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.core_feeder_odc)}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Bastray Distribusi:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.bastray_distribusi)}</span></div>
                                    <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Core Distribusi:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.distribusi_core)}</span></div>
                                    <div className="flex justify-between"><span className="text-[var(--text-muted)] font-semibold">ODC Lat/Long:</span><span className="font-mono text-[var(--text-primary)]">{(site.latitude_odc && site.longitude_odc) ? `${site.latitude_odc}, ${site.longitude_odc}` : '-'}</span></div>
                                </div>
                            </div>

                            {/* ODP PANEL */}
                            <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] space-y-3 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-blue-500 uppercase tracking-wide flex items-center gap-1"><FaCodeBranch /> Optical Distribution Point (ODP)</h4>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between border-b border-[var(--border-color)] pb-2"><span className="text-[var(--text-muted)] font-semibold">Nama ODP:</span><span className="font-bold text-[var(--text-primary)]">{displayVal(site.site_name_odp)}</span></div>
                                        <div className="flex justify-between"><span className="text-[var(--text-muted)] font-semibold">ODP Lat/Long:</span><span className="font-mono text-[var(--text-primary)]">{(site.latitude_odp && site.longitude_odp) ? `${site.latitude_odp}, ${site.longitude_odp}` : '-'}</span></div>
                                    </div>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-3.5 text-xs text-emerald-800 dark:text-emerald-300 mt-4 leading-relaxed font-semibold">
                                    Poin ODP merupakan percabangan akhir fiber optik yang langsung terhubung menuju ONT pelanggan / Site Base Station.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === TAB 5: MAP === */}
                    {activeTab === 'map' && (
                        <div className="space-y-3 animate-[fadeIn_0.2s_ease_forwards]">
                            <div className="flex justify-between items-center bg-[var(--bg-base)] p-3.5 rounded-xl border border-[var(--border-color)]">
                                <div className="flex gap-4 text-xs font-bold">
                                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-blue-500 inline-block shadow"></span> Site</span>
                                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-500 inline-block shadow"></span> ODC</span>
                                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-500 inline-block shadow"></span> ODP</span>
                                </div>
                                <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50">Fiber Routing Link</span>
                            </div>
                            <div className="overflow-hidden rounded-2xl shadow-sm border border-[var(--border-color)]">
                                <TselSiteMap
                                    latitude={site.latitude}
                                    longitude={site.longitude}
                                    latitudeOdc={site.latitude_odc}
                                    longitudeOdc={site.longitude_odc}
                                    latitudeOdp={site.latitude_odp}
                                    longitudeOdp={site.longitude_odp}
                                    siteId={site.site_id}
                                    siteName={site.site_name}
                                    odcName={site.site_name_odc}
                                    odpName={site.site_name_odp}
                                />
                            </div>
                        </div>
                    )}

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
