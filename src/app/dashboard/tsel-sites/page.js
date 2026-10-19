'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    FaSearch, FaSpinner, FaChevronLeft, FaChevronRight, FaPlus,
    FaEdit, FaTrash, FaEye, FaGlobe, FaFilter, FaLock, FaTimes
} from 'react-icons/fa';
import Link from 'next/link';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import TselSiteFormModal from '@/components/TselSiteFormModal';
import TselSiteDetailModal from '@/components/TselSiteDetailModal';

const SITE_CLASS_BADGES = {
    'DIAMOND': 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    'PLATINUM': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    'GOLD': 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    'SILVER': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'BRONZE': 'bg-sky-500/10 text-sky-400 border-sky-500/30',
};

const getClassBadgeStyle = (siteClass) => {
    if (!siteClass) return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    return SITE_CLASS_BADGES[siteClass.toUpperCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';
};

export default function TselSitesPage() {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [userDivision, setUserDivision] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    
    // Filters
    const [branchFilter, setBranchFilter] = useState('');
    const [siteClassFilter, setSiteClassFilter] = useState('');
    const [stoFilter, setStoFilter] = useState('');

    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [detailedSite, setDetailedSite] = useState(null);

    // Fetch User Role
    useEffect(() => {
        fetch('/api/me')
            .then(res => res.ok ? res.json() : Promise.reject('Auth Error'))
            .then(data => { setUserRole(data.role); setUserDivision(data.division); })
            .catch(() => setUserRole('Guest'));
    }, []);

    // Fetch Sites
    const fetchSites = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                limit: 10,
                search,
                branch: branchFilter,
                siteClass: siteClassFilter,
                sto: stoFilter
            });
            const res = await fetch(`/api/tsel-sites?${params}`);
            const result = await res.json();
            if (res.ok) {
                setSites(result.data || []);
                setPagination(result.pagination || {});
            }
        } catch (error) {
            console.error("Error fetching TSEL Sites:", error);
        } finally {
            setLoading(false);
        }
    }, [page, search, branchFilter, siteClassFilter, stoFilter]);

    useEffect(() => {
        setPage(1);
    }, [search, branchFilter, siteClassFilter, stoFilter]);

    useEffect(() => {
        if (['SuperAdmin', 'Admin', 'User', 'View'].includes(userRole)) {
            const timer = setTimeout(fetchSites, 400);
            return () => clearTimeout(timer);
        }
    }, [page, search, branchFilter, siteClassFilter, stoFilter, userRole, fetchSites]);

    const handleCreateClick = () => {
        setEditingSite(null);
        setIsFormOpen(true);
    };

    const handleEditClick = (site) => {
        setEditingSite(site);
        setIsFormOpen(true);
    };

    const handleViewClick = (site) => {
        setDetailedSite(site);
        setIsDetailOpen(true);
    };

    const handleDeleteClick = async (site) => {
        if (!confirm(`Hapus data Site ${site.site_id} secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;
        try {
            const res = await fetch(`/api/tsel-sites/${site.id}`, { method: 'DELETE' });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menghapus data');
            alert('Site berhasil dihapus');
            fetchSites();
        } catch (err) {
            alert(err.message);
        }
    };

    // Access Loading State
    if (userRole === null) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center flex-col gap-4">
                <div className="h-16 w-16 rounded-full border-4 border-[var(--border-color)] border-t-blue-600 animate-spin"></div>
                <p className="text-[var(--text-muted)] font-medium animate-pulse">Memeriksa Hak Akses...</p>
            </div>
        );
    }

    // Role Guard: Hanya SuperAdmin, Admin, User, View
    if (!['SuperAdmin', 'Admin', 'User', 'View'].includes(userRole)) {
        return (
            <div className="flex h-[80vh] w-full flex-col items-center justify-center text-center px-6 animate-[fadeIn_0.3s_ease_forwards]">
                <div className="bg-red-100 dark:bg-red-900/30 p-5 rounded-full mb-4 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30 shadow-sm animate-pulse">
                    <FaLock size={48} />
                </div>
                <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Akses Ditolak</h2>
                <p className="text-[var(--text-secondary)] mt-2 max-w-sm text-sm">
                    Menu **"Site TSEL"** ini diproteksi dan Anda tidak memiliki wewenang untuk mengaksesnya.
                </p>
                <Link href="/dashboard" className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all">
                    Kembali ke Dashboard
                </Link>
            </div>
        );
    }

    const TableSkeleton = () => ([...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-[var(--border-subtle)]">
            <td className="px-5 py-3.5"><Skeleton className="h-4 w-20" /></td>
            <td className="px-5 py-3.5"><Skeleton className="h-4 w-32" /></td>
            <td className="px-5 py-3.5"><Skeleton className="h-5 w-16 mb-1 rounded-md" /><Skeleton className="h-3 w-12" /></td>
            <td className="px-5 py-3.5 text-center"><Skeleton className="h-6 w-12 mx-auto rounded-lg" /></td>
            <td className="px-5 py-3.5"><Skeleton className="h-4 w-44 mb-1.5" /><Skeleton className="h-4 w-36" /></td>
            <td className="px-5 py-3.5 text-center"><div className="flex justify-center gap-1.5"><Skeleton className="h-8 w-8 rounded-xl" /><Skeleton className="h-8 w-8 rounded-xl" /></div></td>
        </tr>
    )));

    return (
        <div className="space-y-6 pb-24 md:pb-0 w-full max-w-[100vw] overflow-x-hidden">
            
            {/* Modal Elements */}
            <TselSiteFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchSites}
                initialData={editingSite}
            />

            <TselSiteDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                site={detailedSite}
            />

            <div className="space-y-6 animate-[fadeIn_0.3s_ease_forwards]">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
                        <FaGlobe className="text-blue-500" /> Database Site TSEL
                    </h2>
                    <p className="text-[var(--text-secondary)] text-xs md:text-sm mt-0.5">Kelola data Site TSEL, backbone IP, ODC & ODP fiber optic</p>
                </div>
                {(userRole === 'SuperAdmin' || (userRole === 'Admin' && ['ALL', 'SQUAT'].includes(userDivision))) && (
                    <button
                        onClick={handleCreateClick}
                        className="justify-center flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs md:text-sm font-black text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all w-full md:w-auto"
                    >
                        <FaPlus /> Tambah Site
                    </button>
                )}
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl bg-[var(--bg-surface)] p-3.5 shadow-sm border border-[var(--border-color)]">
                {/* Dropdowns & Filters */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* Filter Branch */}
                    <div className="flex items-center gap-2 bg-[var(--bg-base)] px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-bold min-w-[130px] flex-1 sm:flex-none">
                        <FaFilter className="text-[var(--text-muted)] shrink-0" size={10} />
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="bg-transparent focus:outline-none cursor-pointer w-full font-bold text-xs"
                        >
                            <option value="">Semua Branch</option>
                            <option value="BEKASI">BEKASI</option>
                            <option value="KARAWANG">KARAWANG</option>
                        </select>
                    </div>

                    {/* Filter Class */}
                    <div className="flex items-center gap-2 bg-[var(--bg-base)] px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-bold min-w-[130px] flex-1 sm:flex-none">
                        <select
                            value={siteClassFilter}
                            onChange={(e) => setSiteClassFilter(e.target.value)}
                            className="bg-transparent focus:outline-none cursor-pointer w-full font-bold text-xs"
                        >
                            <option value="">Semua Class</option>
                            <option value="DIAMOND">DIAMOND</option>
                            <option value="PLATINUM">PLATINUM</option>
                            <option value="GOLD">GOLD</option>
                            <option value="SILVER">SILVER</option>
                            <option value="BRONZE">BRONZE</option>
                        </select>
                    </div>

                    {/* Filter STO */}
                    <div className="flex items-center gap-2 bg-[var(--bg-base)] px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-bold min-w-[135px] flex-1 sm:flex-none">
                        <input
                            type="text"
                            placeholder="STO (Contoh: KLB)"
                            value={stoFilter}
                            onChange={(e) => setStoFilter(e.target.value)}
                            className="bg-transparent focus:outline-none w-full font-bold uppercase text-xs"
                        />
                        {stoFilter && (
                            <button onClick={() => setStoFilter('')} className="text-[var(--text-muted)] hover:text-red-500 shrink-0">
                                <FaTimes size={10} />
                            </button>
                        )}
                    </div>

                    {/* Reset Button */}
                    {(branchFilter || siteClassFilter || stoFilter || search) && (
                        <button
                            onClick={() => {
                                setBranchFilter('');
                                setSiteClassFilter('');
                                setStoFilter('');
                                setSearch('');
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all shrink-0"
                            title="Reset Semua Filter"
                        >
                            <FaTimes size={10} />
                            <span>Reset</span>
                        </button>
                    )}
                </div>

                {/* Search Input */}
                <div className="relative w-full lg:w-72">
                    <FaSearch className="absolute left-3.5 top-3 text-[var(--text-muted)] text-xs" />
                    <input
                        type="text"
                        placeholder="Cari Site ID, Nama, Metro..."
                        className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] pl-10 pr-8 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                            <FaTimes size={11} />
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Cards (View pada HP) */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-color)] space-y-4">
                                <div className="flex justify-between"><div className="space-y-2 w-2/3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div><Skeleton className="h-6 w-16 rounded-full" /></div>
                                <Skeleton className="h-16 w-full rounded-lg" />
                            </div>
                        ))}
                    </div>
                ) : sites.length === 0 ? (
                    <div className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--border-color)] text-center">
                        <EmptyState title="Tidak Ditemukan" message="Data site TSEL kosong atau pencarian Anda nihil." icon={FaGlobe} />
                    </div>
                ) : (
                    sites.map((site) => (
                        <div key={site.id} className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm space-y-3 flex flex-col justify-between">
                            <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                                    <div>
                                        <span className="font-mono font-extrabold text-[var(--text-primary)] text-base block">{site.site_id}</span>
                                        <span className="text-xs text-[var(--text-muted)] font-medium mt-0.5 block">{site.site_name || '-'}</span>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase ${getClassBadgeStyle(site.site_class)}`}>
                                    {site.site_class || 'CLASS -'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><span className="text-[var(--text-muted)] font-semibold block">Branch:</span> <span className="font-bold text-[var(--text-secondary)]">{site.branch || '-'}</span></div>
                                <div><span className="text-[var(--text-muted)] font-semibold block">STO:</span> <span className="font-bold text-[var(--text-secondary)]">{site.sto || '-'}</span></div>
                                <div className="col-span-2">
                                    <span className="text-[var(--text-muted)] font-semibold block mb-1.5">Jaringan & Akses:</span>
                                    <div className="flex flex-col gap-1.5">
                                        {/* Metro */}
                                        {(site.metro || site.port_metro) && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/30 shrink-0">Metro</span>
                                                <span className="font-mono font-bold text-xs text-[var(--text-primary)] truncate">{site.metro || '-'}</span>
                                                {site.port_metro && <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--bg-base)] px-1.5 py-0.5 rounded border border-[var(--border-color)] shrink-0">{site.port_metro}</span>}
                                            </div>
                                        )}
                                        {/* GPON */}
                                        {(site.gpon || site.port_gpon) && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 shrink-0">GPON</span>
                                                <span className="font-mono font-bold text-xs text-[var(--text-primary)] truncate">{site.gpon || '-'}</span>
                                                {site.port_gpon && <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--bg-base)] px-1.5 py-0.5 rounded border border-[var(--border-color)] shrink-0">{site.port_gpon}</span>}
                                            </div>
                                        )}
                                        {/* Akses */}
                                        {site.akses && !site.metro && !site.gpon && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 shrink-0">Akses</span>
                                                <span className="font-mono font-bold text-xs text-[var(--text-secondary)]">{site.akses}</span>
                                            </div>
                                        )}
                                        {!site.metro && !site.gpon && !site.akses && <span className="text-[var(--text-muted)] font-medium italic text-[10px]">-</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-[var(--border-subtle)] mt-1">
                                <button
                                    onClick={() => handleViewClick(site)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800/30"
                                >
                                    <FaEye /> Detail
                                </button>
                                {userRole === 'SuperAdmin' || (userRole === 'Admin' && ['ALL', 'SQUAT'].includes(userDivision)) ? (
                                    <>
                                        <button
                                            onClick={() => handleEditClick(site)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800/30"
                                        >
                                            <FaEdit /> Edit
                                        </button>
                                        {userRole === 'SuperAdmin' && (
                                            <button
                                                onClick={() => handleDeleteClick(site)}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-800/30"
                                            >
                                                <FaTrash /> Hapus
                                            </button>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table (View pada Desktop) */}
            <div className="hidden md:block overflow-hidden rounded-2xl bg-[var(--bg-surface)] shadow-xs border border-[var(--border-color)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left table-fixed border-collapse">
                        <colgroup>
                            <col className="w-[14%]" />
                            <col className="w-[22%]" />
                            <col className="w-[16%]" />
                            <col className="w-[10%]" />
                            <col className="w-[28%]" />
                            <col className="w-[10%]" />
                        </colgroup>
                        <thead className="bg-[var(--bg-base)] text-[var(--text-muted)] uppercase tracking-wider font-extrabold border-b border-[var(--border-color)] text-[11px]">
                            <tr>
                                <th className="px-5 py-3.5">Site ID</th>
                                <th className="px-5 py-3.5">Nama Site</th>
                                <th className="px-5 py-3.5">Class & Wilayah</th>
                                <th className="px-5 py-3.5 text-center">STO</th>
                                <th className="px-5 py-3.5">Jaringan & Akses</th>
                                <th className="px-5 py-3.5 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                            {loading ? (
                                <TableSkeleton />
                            ) : sites.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-[var(--text-muted)] italic font-semibold text-xs">
                                        Data Site TSEL kosong atau pencarian Anda nihil.
                                    </td>
                                </tr>
                            ) : (
                                sites.map((site) => (
                                    <tr key={site.id} className="hover:bg-[var(--bg-base)]/60 transition-colors group">
                                        {/* 1. Site ID */}
                                        <td className="px-5 py-3.5 align-middle">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-xs shadow-blue-500/50"></span>
                                                <span className="font-mono font-extrabold text-[var(--text-primary)] text-sm tracking-tight truncate">
                                                    {site.site_id}
                                                </span>
                                            </div>
                                        </td>

                                        {/* 2. Nama Site */}
                                        <td className="px-5 py-3.5 align-middle">
                                            <div className="font-bold text-[var(--text-primary)] text-xs truncate leading-snug" title={site.site_name}>
                                                {site.site_name || '-'}
                                            </div>
                                        </td>

                                        {/* 3. Class & Branch */}
                                        <td className="px-5 py-3.5 align-middle">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`inline-block font-extrabold px-2 py-0.5 rounded-md border text-[10px] tracking-wide uppercase ${getClassBadgeStyle(site.site_class)}`}>
                                                    {site.site_class || 'CLASS -'}
                                                </span>
                                                <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-tight">
                                                    {site.branch || '-'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* 4. STO */}
                                        <td className="px-5 py-3.5 align-middle text-center">
                                            <span className="inline-flex items-center justify-center font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-primary)] shadow-2xs">
                                                {site.sto || '-'}
                                            </span>
                                        </td>

                                        {/* 5. Jaringan & Akses (Compact Inline Pills) */}
                                        <td className="px-5 py-3 align-middle">
                                            <div className="flex flex-col gap-1.5 justify-center">
                                                {/* Metro Row */}
                                                {(site.metro || site.port_metro) && (
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0 leading-none">
                                                            Metro
                                                        </span>
                                                        <span className="font-mono font-bold text-[var(--text-primary)] text-[11px] truncate" title={site.metro}>
                                                            {site.metro || '-'}
                                                        </span>
                                                        {site.port_metro && (
                                                            <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--bg-base)] px-1.5 py-0.5 rounded border border-[var(--border-color)] shrink-0 leading-none" title={`Port Metro: ${site.port_metro}`}>
                                                                {site.port_metro}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* GPON Row */}
                                                {(site.gpon || site.port_gpon) && (
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 leading-none">
                                                            GPON
                                                        </span>
                                                        <span className="font-mono font-bold text-[var(--text-primary)] text-[11px] truncate" title={site.gpon}>
                                                            {site.gpon || '-'}
                                                        </span>
                                                        {site.port_gpon && (
                                                            <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--bg-base)] px-1.5 py-0.5 rounded border border-[var(--border-color)] shrink-0 leading-none" title={`Port GPON: ${site.port_gpon}`}>
                                                                {site.port_gpon}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Akses row (if no metro/gpon, or secondary) */}
                                                {site.akses && !site.metro && !site.gpon && (
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 leading-none">
                                                            Akses
                                                        </span>
                                                        <span className="font-mono font-bold text-[var(--text-secondary)] text-[11px] truncate">
                                                            {site.akses}
                                                        </span>
                                                    </div>
                                                )}

                                                {!site.metro && !site.gpon && !site.akses && (
                                                    <span className="text-[var(--text-muted)] text-[11px] italic font-medium">-</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* 6. Aksi */}
                                        <td className="px-5 py-3.5 align-middle text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleViewClick(site)}
                                                    className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 bg-[var(--bg-base)] rounded-xl border border-[var(--border-color)] shadow-2xs hover:border-emerald-500/40 transition-colors"
                                                    title="Lihat Detail Site"
                                                >
                                                    <FaEye size={12} />
                                                </button>
                                                {userRole === 'SuperAdmin' || (userRole === 'Admin' && ['ALL', 'SQUAT'].includes(userDivision)) ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditClick(site)}
                                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 bg-[var(--bg-base)] rounded-xl border border-[var(--border-color)] shadow-2xs hover:border-blue-500/40 transition-colors"
                                                            title="Edit Data Site"
                                                        >
                                                            <FaEdit size={12} />
                                                        </button>
                                                        {userRole === 'SuperAdmin' && (
                                                            <button
                                                                onClick={() => handleDeleteClick(site)}
                                                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-500/15 bg-[var(--bg-base)] rounded-xl border border-[var(--border-color)] shadow-2xs hover:border-red-500/40 transition-colors"
                                                                title="Hapus Site"
                                                            >
                                                                <FaTrash size={12} />
                                                            </button>
                                                        )}
                                                    </>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {!loading && sites.length > 0 && (
                <div className="flex items-center justify-between border-t border-[var(--border-color)] px-4 py-4 bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border-color)]">
                    <span className="text-xs text-[var(--text-muted)] font-semibold">Hal {pagination.currentPage}/{pagination.totalPages} (Total: {pagination.totalItems} Site)</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="rounded-xl p-2 border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)] disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <FaChevronLeft size={12} />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                            className="rounded-xl p-2 border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)] disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <FaChevronRight size={12} />
                        </button>
                    </div>
                </div>
            )}
            
            </div>
        </div>
    );
}
