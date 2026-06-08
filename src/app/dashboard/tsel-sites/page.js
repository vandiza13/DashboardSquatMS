'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    FaSearch, FaSpinner, FaChevronLeft, FaChevronRight, FaPlus,
    FaEdit, FaTrash, FaEye, FaGlobe, FaFilter, FaLock
} from 'react-icons/fa';
import Link from 'next/link';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import TselSiteFormModal from '@/components/TselSiteFormModal';
import TselSiteDetailModal from '@/components/TselSiteDetailModal';

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
            <td className="px-6 py-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-3 w-32" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-16" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
            <td className="px-6 py-4 text-center"><div className="flex justify-center gap-2"><Skeleton className="h-7 w-7 rounded" /><Skeleton className="h-7 w-7 rounded" /><Skeleton className="h-7 w-7 rounded" /></div></td>
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl bg-[var(--bg-surface)] p-4 shadow-sm border border-[var(--border-color)]">
                
                {/* Dropdowns */}
                <div className="flex flex-wrap gap-2.5 w-full lg:w-auto">
                    {/* Filter Branch */}
                    <div className="flex items-center gap-2 bg-[var(--bg-base)] px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-bold flex-1 sm:flex-none">
                        <FaFilter className="text-[var(--text-muted)]" />
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="bg-transparent focus:outline-none cursor-pointer w-full font-bold"
                        >
                            <option value="">Semua Branch</option>
                            <option value="BEKASI">BEKASI</option>
                            <option value="KARAWANG">KARAWANG</option>
                        </select>
                    </div>

                    {/* Filter Class */}
                    <div className="flex items-center gap-2 bg-[var(--bg-base)] px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-bold flex-1 sm:flex-none">
                        <select
                            value={siteClassFilter}
                            onChange={(e) => setSiteClassFilter(e.target.value)}
                            className="bg-transparent focus:outline-none cursor-pointer w-full font-bold"
                        >
                            <option value="">Semua Class</option>
                            <option value="DIAMOND">DIAMOND</option>
                            <option value="GOLD">GOLD</option>
                            <option value="SILVER">SILVER</option>
                            <option value="BRONZE">BRONZE</option>
                        </select>
                    </div>

                    {/* Filter STO */}
                    <div className="flex items-center gap-2 bg-[var(--bg-base)] px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-bold flex-1 sm:flex-none">
                        <input
                            type="text"
                            placeholder="STO (Contoh: CBR)"
                            value={stoFilter}
                            onChange={(e) => setStoFilter(e.target.value)}
                            className="bg-transparent focus:outline-none w-20 font-bold uppercase"
                        />
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative w-full lg:w-auto">
                    <FaSearch className="absolute left-3.5 top-3 text-[var(--text-muted)] text-xs" />
                    <input
                        type="text"
                        placeholder="Cari Site ID, Nama, STO, Metro..."
                        className="w-full lg:w-72 rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] pl-10 pr-4 py-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
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
                                <div>
                                    <span className="font-extrabold text-[var(--text-primary)] text-base block">{site.site_id}</span>
                                    <span className="text-xs text-[var(--text-muted)] mt-0.5 block">{site.site_name || '-'}</span>
                                </div>
                                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50 uppercase">
                                    {site.site_class || 'CLASS -'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><span className="text-[var(--text-muted)] font-semibold block">Branch:</span> <span className="font-bold text-[var(--text-secondary)]">{site.branch || '-'}</span></div>
                                <div><span className="text-[var(--text-muted)] font-semibold block">STO:</span> <span className="font-bold text-[var(--text-secondary)]">{site.sto || '-'}</span></div>
                                <div className="col-span-2">
                                    <span className="text-[var(--text-muted)] font-semibold block mb-1.5">Jaringan & Akses:</span>
                                    <div className="flex flex-col gap-2">
                                        {/* Metro */}
                                        {(site.metro || site.port_metro) && (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">Metro Backbone</span>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {site.metro && <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 px-1.5 py-0.5 rounded text-[10px]">{site.metro}</span>}
                                                    {site.port_metro && <span className="font-bold text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[10px]">Port: {site.port_metro}</span>}
                                                </div>
                                            </div>
                                        )}
                                        {/* GPON */}
                                        {(site.gpon || site.port_gpon) && (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">GPON</span>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {site.gpon && <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded text-[10px]">{site.gpon}</span>}
                                                    {site.port_gpon && <span className="font-bold text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[10px]">Port: {site.port_gpon}</span>}
                                                </div>
                                            </div>
                                        )}
                                        {/* Akses */}
                                        {site.akses && (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">Akses</span>
                                                <span className="font-bold text-[var(--text-secondary)] text-[10px]">{site.akses}</span>
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
            <div className="hidden md:block overflow-hidden rounded-2xl bg-[var(--bg-surface)] shadow-sm border border-[var(--border-color)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--bg-base)] text-[var(--text-muted)] uppercase tracking-wider font-bold border-b border-[var(--border-color)] text-xs">
                            <tr>
                                <th className="px-6 py-4">Site ID</th>
                                <th className="px-6 py-4">Nama Site</th>
                                <th className="px-6 py-4">Class & Branch</th>
                                <th className="px-6 py-4">STO</th>
                                <th className="px-6 py-4">Jaringan & Akses</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                            {loading ? (
                                <TableSkeleton />
                            ) : sites.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-[var(--text-muted)] italic font-semibold">
                                        Data Site TSEL kosong atau pencarian Anda nihil.
                                    </td>
                                </tr>
                            ) : (
                                sites.map((site) => (
                                    <tr key={site.id} className="hover:bg-[var(--bg-base)] transition-colors border-b border-[var(--border-subtle)]">
                                        <td className="px-6 py-4 font-extrabold text-[var(--text-primary)] text-sm">{site.site_id}</td>
                                        <td className="px-6 py-4 text-[var(--text-secondary)] font-medium max-w-xs truncate">{site.site_name || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50 text-[10px] uppercase">{site.site_class || 'CLASS -'}</span>
                                                <span className="text-[10px] text-[var(--text-muted)] font-bold">{site.branch || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-[var(--text-secondary)]">{site.sto || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2 w-max">
                                                {/* Metro */}
                                                {(site.metro || site.port_metro) && (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">Metro Backbone</span>
                                                        <div className="flex items-center gap-1.5">
                                                            {site.metro && <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 px-1.5 py-0.5 rounded text-[10px]">{site.metro}</span>}
                                                            {site.port_metro && <span className="font-bold text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[10px]">Port: {site.port_metro}</span>}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* GPON */}
                                                {(site.gpon || site.port_gpon) && (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">GPON</span>
                                                        <div className="flex items-center gap-1.5">
                                                            {site.gpon && <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded text-[10px]">{site.gpon}</span>}
                                                            {site.port_gpon && <span className="font-bold text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[10px]">Port: {site.port_gpon}</span>}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Akses */}
                                                {site.akses && (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">Akses</span>
                                                        <span className="font-bold text-[var(--text-secondary)] text-[10px]">{site.akses}</span>
                                                    </div>
                                                )}

                                                {!site.metro && !site.gpon && !site.akses && <span className="text-[var(--text-muted)] font-medium italic">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleViewClick(site)}
                                                    className="p-2 text-emerald-500 hover:bg-emerald-500/10 bg-[var(--bg-base)] rounded-xl border border-[var(--border-color)] shadow-sm hover:border-emerald-500/40 transition-colors"
                                                    title="Lihat Detail Site"
                                                >
                                                    <FaEye size={12} />
                                                </button>
                                                {userRole === 'SuperAdmin' || (userRole === 'Admin' && ['ALL', 'SQUAT'].includes(userDivision)) ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditClick(site)}
                                                            className="p-2 text-blue-500 hover:bg-blue-500/10 bg-[var(--bg-base)] rounded-xl border border-[var(--border-color)] shadow-sm hover:border-blue-500/40 transition-colors"
                                                            title="Edit Data Site"
                                                        >
                                                            <FaEdit size={12} />
                                                        </button>
                                                        {userRole === 'SuperAdmin' && (
                                                            <button
                                                                onClick={() => handleDeleteClick(site)}
                                                                className="p-2 text-red-500 hover:bg-red-500/10 bg-[var(--bg-base)] rounded-xl border border-[var(--border-color)] shadow-sm hover:border-red-500/40 transition-colors"
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
