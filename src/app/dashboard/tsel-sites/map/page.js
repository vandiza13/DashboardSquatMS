'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
    FaSearch, FaFilter, FaMapMarkerAlt, FaTimes,
    FaLayerGroup, FaExpand, FaCompress, FaList,
    FaMapPin, FaCrosshairs, FaRoute
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import Link from 'next/link';

// Dynamic import TselGisMap
const TselGisMap = dynamic(() => import('@/components/TselGisMap').then(mod => mod.default), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-[var(--bg-base)] rounded-2xl">
            <div className="text-center space-y-3">
                <div className="h-12 w-12 mx-auto rounded-full border-4 border-[var(--border-color)] border-t-blue-500 animate-spin" />
                <p className="text-[var(--text-muted)] text-sm font-semibold animate-pulse">Memuat Peta GIS...</p>
            </div>
        </div>
    )
});

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CLASS_COLORS = {
    'Diamond':  { color: '#ef4444', label: 'Diamond' },
    'Platinum': { color: '#f97316', label: 'Platinum' },
    'Gold':     { color: '#eab308', label: 'Gold' },
    'Silver':   { color: '#22c55e', label: 'Silver' },
    'Bronze':   { color: '#3b82f6', label: 'Bronze' },
    'VIP':      { color: '#a855f7', label: 'VIP' },
    'Premium':  { color: '#ec4899', label: 'Premium' },
};

const ALL_CLASSES = Object.keys(CLASS_COLORS);
const ALL_BRANCHES = ['BEKASI', 'KARAWANG'];

export default function TselSitesMapPage() {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [branchFilter, setBranchFilter] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Coordinate Search State
    const [inputLat, setInputLat] = useState('');
    const [inputLng, setInputLng] = useState('');
    const [searchCoord, setSearchCoord] = useState(null);
    const [nearestSites, setNearestSites] = useState([]);
    const [isCoordSearchOpen, setIsCoordSearchOpen] = useState(false);

    // UI State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const fetchSites = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (branchFilter) params.set('branch', branchFilter);
            if (classFilter) params.set('siteClass', classFilter);
            if (search) params.set('search', search);

            const res = await fetch(`/api/tsel-sites/map?${params}`);
            const result = await res.json();
            if (res.ok) {
                setSites(result.data || []);
            } else {
                setError(result.error || 'Gagal memuat data');
            }
        } catch (err) {
            setError('Gagal terhubung ke server');
            console.error('Fetch map error:', err);
        } finally {
            setLoading(false);
        }
    }, [branchFilter, classFilter, search]);

    useEffect(() => {
        fetchSites();
    }, [fetchSites]);

    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput), 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Handlers
    const handleSearchCoordinates = () => {
        const lat = parseFloat(inputLat);
        const lng = parseFloat(inputLng);
        if (isNaN(lat) || isNaN(lng)) return alert('Format koordinat tidak valid');

        setSearchCoord({ lat, lng });

        const sitesWithDistance = sites.map(site => {
            const sLat = parseFloat(site.latitude);
            const sLng = parseFloat(site.longitude);
            if (isNaN(sLat) || isNaN(sLng) || sLat < -90 || sLat > 90 || sLng < -180 || sLng > 180) return null;
            return { ...site, distance: calculateDistance(lat, lng, sLat, sLng) };
        }).filter(Boolean);

        sitesWithDistance.sort((a, b) => a.distance - b.distance);
        setNearestSites(sitesWithDistance.slice(0, 5));
    };

    const clearCoordinateSearch = () => {
        setInputLat(''); setInputLng(''); setSearchCoord(null); setNearestSites([]);
    };

    const classStats = useMemo(() => {
        const stats = {};
        sites.forEach(site => {
            const cls = site.site_class || 'Lainnya';
            stats[cls] = (stats[cls] || 0) + 1;
        });
        return stats;
    }, [sites]);

    const branchStats = useMemo(() => {
        const stats = {};
        sites.forEach(site => {
            const branch = site.branch || 'Unknown';
            stats[branch] = (stats[branch] || 0) + 1;
        });
        return stats;
    }, [sites]);

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    const togglePanel = (panel) => {
        setIsFilterOpen(panel === 'filter' ? !isFilterOpen : false);
        setIsCoordSearchOpen(panel === 'coord' ? !isCoordSearchOpen : false);
    };

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-[999] bg-[var(--bg-base)] flex flex-col' : 'space-y-0 pb-24 md:pb-0 w-full max-w-[100vw] overflow-hidden'} animate-[fadeIn_0.3s_ease_forwards]`}>

            {/* ─── TOP HEADER BAR ─── */}
            <div className={`flex items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-color)] ${isFullscreen ? '' : 'rounded-t-2xl border border-[var(--border-color)]'} shrink-0`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 shrink-0">
                        <FaMapMarkerAlt size={14} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm md:text-base font-black text-[var(--text-primary)] tracking-tight truncate flex items-center gap-2">
                            Peta GIS Site TSEL
                        </h2>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-semibold">
                            {loading ? (
                                <span className="animate-pulse">Memuat data...</span>
                            ) : (
                                <>
                                    <span className="flex items-center gap-1">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {sites.length.toLocaleString()} site aktif
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar">

                    {/* Coordinate Search Toggle */}
                    <button
                        onClick={() => togglePanel('coord')}
                        className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 whitespace-nowrap
                            ${isCoordSearchOpen || searchCoord
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-amber-500/30'
                            }`}
                    >
                        <FaMapPin size={10} />
                        <span className="hidden sm:inline">Cari Titik</span>
                    </button>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => togglePanel('filter')}
                        className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 whitespace-nowrap
                            ${isFilterOpen || branchFilter || classFilter || search
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-blue-500/30'
                            }`}
                    >
                        <FaFilter size={10} />
                        <span className="hidden sm:inline">Filter</span>
                        {(branchFilter || classFilter || search) && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white rounded-full text-[9px] flex items-center justify-center font-black">
                                {[branchFilter, classFilter, search].filter(Boolean).length}
                            </span>
                        )}
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={toggleFullscreen}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-emerald-500/30 transition-all shrink-0"
                        title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? <FaCompress size={10} /> : <FaExpand size={10} />}
                    </button>
                    
                    {/* Database Link */}
                    <Link
                        href="/dashboard/tsel-sites"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-violet-500/30 transition-all shrink-0"
                        title="Buka Database Site"
                    >
                        <FaList size={10} />
                        <span className="hidden sm:inline">Database</span>
                    </Link>
                </div>
            </div>

            {/* ─── PANELS CONTAINER ─── */}
            <div className="relative z-10 shrink-0 border-x border-[var(--border-color)]">
                
                {/* ─── FILTER PANEL ─── */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out bg-[var(--bg-surface)] ${isFilterOpen ? 'max-h-[300px] opacity-100 border-b border-[var(--border-color)]' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4 space-y-3">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-2.5 text-[var(--text-muted)] text-xs" />
                            <input type="text" placeholder="Cari Site ID, Nama, STO..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] pl-9 pr-4 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none" />
                            {searchInput && <button onClick={() => setSearchInput('')} className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-red-500"><FaTimes size={10} /></button>}
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            <div className="flex items-center gap-2 bg-[var(--bg-base)] px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs font-bold min-w-[140px] flex-1 sm:flex-none">
                                <FaLayerGroup className="text-[var(--text-muted)]" size={10} />
                                <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="bg-transparent focus:outline-none w-full text-[var(--text-secondary)]">
                                    <option value="">Semua Branch</option>
                                    {ALL_BRANCHES.map(b => <option key={b} value={b}>{b} {branchStats[b] ? `(${branchStats[b]})` : ''}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 bg-[var(--bg-base)] px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs font-bold min-w-[140px] flex-1 sm:flex-none">
                                <HiSparkles className="text-[var(--text-muted)]" size={10} />
                                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="bg-transparent focus:outline-none w-full text-[var(--text-secondary)]">
                                    <option value="">Semua Class</option>
                                    {ALL_CLASSES.map(c => <option key={c} value={c}>{c} {classStats[c] ? `(${classStats[c]})` : ''}</option>)}
                                </select>
                            </div>
                            {(branchFilter || classFilter || searchInput) && (
                                <button onClick={() => { setBranchFilter(''); setClassFilter(''); setSearchInput(''); setSearch(''); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100">
                                    <FaTimes size={9} /> Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── COORDINATE SEARCH PANEL ─── */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out bg-[var(--bg-surface)] ${isCoordSearchOpen ? 'max-h-[300px] opacity-100 border-b border-[var(--border-color)]' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-2.5 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-wider">Lat</span>
                                    <input type="text" placeholder="-6.2383" value={inputLat} onChange={(e) => setInputLat(e.target.value)} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)] pl-10 pr-3 py-2 text-xs font-mono font-semibold focus:border-amber-500 focus:outline-none" />
                                </div>
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-2.5 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-wider">Lng</span>
                                    <input type="text" placeholder="106.9756" value={inputLng} onChange={(e) => setInputLng(e.target.value)} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)] pl-10 pr-3 py-2 text-xs font-mono font-semibold focus:border-amber-500 focus:outline-none" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSearchCoordinates} disabled={!inputLat || !inputLng} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/20">
                                    <FaCrosshairs size={10} /> Cari Lokasi
                                </button>
                                {searchCoord && (
                                    <button onClick={clearCoordinateSearch} className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100">
                                        <FaTimes size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* ─── MAP & SIDEBAR CONTAINER ─── */}
            <div className={`relative flex flex-1 overflow-hidden border-x border-b border-[var(--border-color)] ${isFullscreen ? 'h-full' : 'h-[calc(100vh-220px)] min-h-[500px] rounded-b-2xl'}`}>
                
                {/* ─── NEAREST SITES SIDEBAR (Tampil jika pencarian koordinat) ─── */}
                <div className={`flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-color)] transition-all duration-300 ease-in-out shrink-0 z-10 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.1)]
                    ${searchCoord ? 'w-[280px] translate-x-0' : 'w-0 -translate-x-full opacity-0'}`}
                >
                    <div className="p-3 border-b border-[var(--border-color)] bg-gradient-to-r from-amber-500/10 to-transparent">
                        <h3 className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <FaRoute size={12} /> Site Terdekat
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {nearestSites.map((site, index) => {
                            const classColor = CLASS_COLORS[site.site_class]?.color || '#6b7280';
                            return (
                                <div key={site.id || `${site.site_id}-${index}`} className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)] hover:border-amber-300 transition-all">
                                    <div className="flex items-start justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-[9px] font-black text-slate-500">{index + 1}</div>
                                            <span className="text-xs font-bold text-[var(--text-primary)]">{site.site_id}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                                            {site.distance < 1 ? `${(site.distance * 1000).toFixed(0)}m` : `${site.distance.toFixed(2)}km`}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-secondary)] font-medium line-clamp-1 mb-2">{site.site_name}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ backgroundColor: classColor }}>{site.site_class || 'Unknown'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── MAP AREA ─── */}
                <div className="flex-1 relative z-0">
                    {error ? (
                        <div className="flex items-center justify-center h-full bg-[var(--bg-base)]">
                            <div className="text-center space-y-3 p-6">
                                <div className="text-4xl">🚫</div>
                                <p className="text-[var(--text-primary)] font-bold">{error}</p>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center h-full bg-[var(--bg-base)]">
                            <div className="h-14 w-14 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                        </div>
                    ) : (
                        <TselGisMap 
                            sites={sites} 
                            searchCoord={searchCoord}
                            nearestSiteIds={nearestSites.map(s => s.site_id)}
                        />
                    )}

                    {/* ─── LEGEND ─── */}
                    {!loading && !error && sites.length > 0 && (
                        <div className="absolute bottom-4 left-4 z-[500] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 p-3 max-w-[180px]">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Site Class</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                {ALL_CLASSES.map(cls => (classStats[cls] || (!classFilter && cls)) ? (
                                    <div key={cls} className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CLASS_COLORS[cls].color, boxShadow: `0 0 0 2px ${CLASS_COLORS[cls].color}25` }} />
                                        <span className="text-[10px] font-semibold text-slate-600 truncate">{cls} <span className="text-slate-400">({classStats[cls] || 0})</span></span>
                                    </div>
                                ) : null)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
