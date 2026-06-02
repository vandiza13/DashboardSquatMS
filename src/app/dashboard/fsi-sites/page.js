'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    FaSearch, FaChevronLeft, FaChevronRight, FaPlus,
    FaEdit, FaTrash, FaEye, FaGlobe, FaLock, FaMapMarkedAlt
} from 'react-icons/fa';
import Link from 'next/link';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import FsiSiteFormModal from '@/components/FsiSiteFormModal';
import FsiSiteDetailModal from '@/components/FsiSiteDetailModal';

export default function FsiSitesPage() {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [userDivision, setUserDivision] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});

    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [detailedSite, setDetailedSite] = useState(null);

    // View Mode
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'map'

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
                search
            });
            const res = await fetch(`/api/fsi-sites?${params}`);
            const result = await res.json();
            if (res.ok) {
                setSites(result.data || []);
                setPagination(result.pagination || {});
            }
        } catch (error) {
            console.error("Error fetching FSI Sites:", error);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        setPage(1);
    }, [search]);

    useEffect(() => {
        if (['Admin', 'User', 'View'].includes(userRole)) {
            const timer = setTimeout(fetchSites, 400);
            return () => clearTimeout(timer);
        }
    }, [page, search, userRole, fetchSites]);

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
        if (!confirm(`Hapus data Site FSI ${site.site_id} secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;
        try {
            const res = await fetch(`/api/fsi-sites/${site.id}`, { method: 'DELETE' });
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
                <div className="h-16 w-16 rounded-full border-4 border-[var(--border-color)] border-t-purple-600 animate-spin"></div>
                <p className="text-[var(--text-muted)] font-medium animate-pulse">Memeriksa Hak Akses...</p>
            </div>
        );
    }

    // Role Guard: Hanya Admin, User, View
    if (!['Admin', 'User', 'View'].includes(userRole)) {
        return (
            <div className="flex h-[80vh] w-full flex-col items-center justify-center text-center px-6 animate-[fadeIn_0.3s_ease_forwards]">
                <div className="bg-red-100 dark:bg-red-900/30 p-5 rounded-full mb-4 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30 shadow-sm animate-pulse">
                    <FaLock size={48} />
                </div>
                <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Akses Ditolak</h2>
                <p className="text-[var(--text-secondary)] mt-2 max-w-sm text-sm">
                    Menu ini diproteksi dan Anda tidak memiliki wewenang untuk mengaksesnya.
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
            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
            <td className="px-6 py-4 text-center"><div className="flex justify-center gap-2"><Skeleton className="h-7 w-7 rounded" /><Skeleton className="h-7 w-7 rounded" /><Skeleton className="h-7 w-7 rounded" /></div></td>
        </tr>
    )));

    return (
        <div className="space-y-6 pb-24 md:pb-0 w-full max-w-[100vw] overflow-x-hidden">
            
            <FsiSiteFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchSites}
                initialData={editingSite}
            />

            <FsiSiteDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                site={detailedSite}
            />

            <div className="space-y-6 animate-[fadeIn_0.3s_ease_forwards]">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
                            <span className="text-purple-600"><FaGlobe /></span> Database Site FSI
                        </h2>
                        <p className="text-[var(--text-secondary)] text-xs md:text-sm mt-0.5">Kelola data Site FSI & Infrastruktur</p>
                    </div>
                    {(userRole === 'SuperAdmin' || (userRole === 'Admin' && ['ALL', 'MS'].includes(userDivision))) && (
                        <button
                            onClick={handleCreateClick}
                            className="justify-center flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs md:text-sm font-black text-white hover:bg-purple-700 shadow-lg shadow-purple-500/25 transition-all w-full md:w-auto"
                        >
                            <FaPlus /> Tambah Site FSI
                        </button>
                    )}
                </div>

                {/* Tabs & Search Bar */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl bg-[var(--bg-surface)] p-4 shadow-sm border border-[var(--border-color)]">
                    
                    {/* View Tabs */}
                    <div className="flex bg-[var(--bg-base)] p-1 rounded-xl border border-[var(--border-color)] w-full md:w-auto">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-purple-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            <FaGlobe /> Data Tabel
                        </button>
                        <Link
                            href="/dashboard/fsi-sites/map"
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                        >
                            <FaMapMarkedAlt /> Peta GIS
                        </Link>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full md:w-auto">
                        <FaSearch className="absolute left-3.5 top-3 text-[var(--text-muted)] text-xs" />
                        <input
                            type="text"
                            placeholder="Cari ID, Nama, STO, Ring..."
                            className="w-full md:w-72 rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] pl-10 pr-4 py-2.5 text-xs font-semibold focus:border-purple-500 focus:outline-none transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-color)] space-y-4">
                                    <Skeleton className="h-16 w-full rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : sites.length === 0 ? (
                        <div className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--border-color)] text-center">
                            <EmptyState title="Tidak Ditemukan" message="Data site FSI kosong atau pencarian Anda nihil." icon={FaGlobe} />
                        </div>
                    ) : (
                        sites.map((site) => (
                            <div key={site.id} className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm space-y-3 flex flex-col justify-between">
                                <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-2">
                                    <div>
                                        <span className="font-extrabold text-[var(--text-primary)] text-base block">{site.site_id}</span>
                                        <span className="text-xs text-[var(--text-muted)] mt-0.5 block">{site.site_name || '-'}</span>
                                    </div>
                                    <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-100 dark:border-purple-800/50 uppercase">
                                        FSI
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div><span className="text-[var(--text-muted)] font-semibold block">STO:</span> <span className="font-bold text-[var(--text-secondary)]">{site.sto || '-'}</span></div>
                                    <div><span className="text-[var(--text-muted)] font-semibold block">Ring:</span> <span className="font-bold text-[var(--text-secondary)]">{site.ring || '-'}</span></div>
                                </div>
                                <div className="flex gap-2 pt-3 border-t border-[var(--border-subtle)] mt-1">
                                    <button onClick={() => handleViewClick(site)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                                        <FaEye /> Detail
                                    </button>
                                    {(userRole === 'SuperAdmin' || (userRole === 'Admin' && ['ALL', 'MS'].includes(userDivision))) ? (
                                        <>
                                            <button onClick={() => handleEditClick(site)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                                <FaEdit /> Edit
                                            </button>
                                            {userRole === 'SuperAdmin' && (
                                                <button onClick={() => handleDeleteClick(site)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-800/30">
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

                {/* Desktop Table */}
                <div className="hidden md:block overflow-hidden rounded-2xl bg-[var(--bg-surface)] shadow-sm border border-[var(--border-color)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[var(--bg-base)] text-[var(--text-muted)] uppercase tracking-wider font-bold border-b border-[var(--border-color)] text-xs">
                                <tr>
                                    <th className="px-6 py-4">Site ID</th>
                                    <th className="px-6 py-4">Nama Site</th>
                                    <th className="px-6 py-4">STO</th>
                                    <th className="px-6 py-4">Ring</th>
                                    <th className="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                                {loading ? (
                                    <TableSkeleton />
                                ) : sites.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center text-[var(--text-muted)] italic font-semibold">
                                            Data Site FSI kosong atau pencarian Anda nihil.
                                        </td>
                                    </tr>
                                ) : (
                                    sites.map((site) => (
                                        <tr key={site.id} className="hover:bg-[var(--bg-base)] transition-colors border-b border-[var(--border-subtle)]">
                                            <td className="px-6 py-4 font-extrabold text-[var(--text-primary)] text-sm">{site.site_id}</td>
                                            <td className="px-6 py-4 text-[var(--text-secondary)] font-medium max-w-xs truncate">{site.site_name || '-'}</td>
                                            <td className="px-6 py-4 font-bold text-[var(--text-secondary)]">{site.sto || '-'}</td>
                                            <td className="px-6 py-4 font-bold text-[var(--text-secondary)]">{site.ring || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => handleViewClick(site)} className="p-2 text-emerald-500 hover:bg-emerald-500/10 bg-[var(--bg-base)] rounded-xl border border-[var(--border-color)] shadow-sm hover:border-emerald-500/40 transition-colors" title="Lihat Detail Site"><FaEye size={12} /></button>
                                                    {(userRole === 'SuperAdmin' || (userRole === 'Admin' && ['ALL', 'MS'].includes(userDivision))) ? (
                                                        <>
                                                            <button onClick={() => handleEditClick(site)} className="p-2 text-blue-500 hover:bg-blue-500/10 bg-[var(--bg-base)] rounded-xl border border-[var(--border-color)] shadow-sm hover:border-blue-500/40 transition-colors" title="Edit Data Site"><FaEdit size={12} /></button>
                                                            {userRole === 'SuperAdmin' && (
                                                                <button onClick={() => handleDeleteClick(site)} className="p-2 text-red-500 hover:bg-red-500/10 bg-[var(--bg-base)] rounded-xl border border-[var(--border-color)] shadow-sm hover:border-red-500/40 transition-colors" title="Hapus Site"><FaTrash size={12} /></button>
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
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl p-2 border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)] disabled:opacity-50 disabled:cursor-not-allowed transition"><FaChevronLeft size={12} /></button>
                            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="rounded-xl p-2 border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)] disabled:opacity-50 disabled:cursor-not-allowed transition"><FaChevronRight size={12} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
