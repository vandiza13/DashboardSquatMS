'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    FaHome, FaTicketAlt, FaUsers, FaChartLine,
    FaUserCog, FaTimes,
    FaDesktop, FaChevronDown, FaExternalLinkAlt, FaGlobe,
    FaMapMarkerAlt, FaDatabase, FaNetworkWired
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const [user, setUser] = useState({ username: 'Loading...', role: '' });
    const [isTaccOpen, setIsTaccOpen] = useState(false);
    const [isDatabaseSiteOpen, setIsDatabaseSiteOpen] = useState(false);

    useEffect(() => {
        fetch('/api/me')
            .then(res => res.json())
            .then(data => setUser(data))
            .catch(() => setUser({ username: 'Guest', role: '' }));
    }, []);

    const menuItems = [
        { name: 'Dashboard', href: '/dashboard', icon: FaHome, color: 'blue' },
        { name: 'Manajemen Tiket', href: '/dashboard/tickets', icon: FaTicketAlt, color: 'violet' },
        { name: 'Data Teknisi', href: '/dashboard/technicians', icon: FaUsers, color: 'emerald' },
        { name: 'Produktifitas', href: '/dashboard/productivity', icon: FaChartLine, color: 'amber' },
    ];

    if (user.role === 'SuperAdmin') {
        menuItems.splice(3, 0, {
            name: 'Manajemen User',
            href: '/dashboard/users',
            icon: FaUserCog,
            color: 'rose'
        });
        menuItems.splice(4, 0, {
            name: 'Mapping STO',
            href: '/dashboard/sto-mappings',
            icon: FaNetworkWired,
            color: 'blue'
        });
    }

    // Auto-open dropdown jika user sedang di halaman terkait
    useEffect(() => {
        if (pathname?.startsWith('/dashboard/tsel-sites') ||
            pathname?.startsWith('/dashboard/fsi-sites') ||
            pathname?.startsWith('/dashboard/mtel-sites') ||
            pathname?.startsWith('/dashboard/umt-sites')) {
            setIsDatabaseSiteOpen(true);
        }
    }, [pathname]);

    // Database Site Groups
    const databaseSiteGroups = [
        {
            provider: 'TSEL',
            theme: {
                title: 'text-emerald-500/80',
                activeText: 'text-emerald-600 dark:text-emerald-400',
                activeBg: 'bg-emerald-50 dark:bg-emerald-950/20',
                activeDot: 'border-emerald-500 bg-emerald-500',
                hoverDot: 'group-hover/sub:border-emerald-500 group-hover/sub:bg-emerald-500'
            },
            items: [
                { name: 'Database Site', href: '/dashboard/tsel-sites', icon: FaDatabase },
                { name: 'Data ODC', href: '/dashboard/tsel-sites/odc', icon: FaNetworkWired },
                { name: 'Peta GIS', href: '/dashboard/tsel-sites/map', icon: FaMapMarkerAlt },
            ]
        },
        {
            provider: 'FSI',
            theme: {
                title: 'text-purple-500/80',
                activeText: 'text-purple-600 dark:text-purple-400',
                activeBg: 'bg-purple-50 dark:bg-purple-950/20',
                activeDot: 'border-purple-500 bg-purple-500',
                hoverDot: 'group-hover/sub:border-purple-500 group-hover/sub:bg-purple-500'
            },
            items: [
                { name: 'Database Site', href: '/dashboard/fsi-sites', icon: FaDatabase },
                { name: 'Peta GIS', href: '/dashboard/fsi-sites/map', icon: FaMapMarkerAlt },
            ]
        },
        {
            provider: 'MTEL',
            theme: {
                title: 'text-red-500/80',
                activeText: 'text-red-600 dark:text-red-400',
                activeBg: 'bg-red-50 dark:bg-red-950/20',
                activeDot: 'border-red-500 bg-red-500',
                hoverDot: 'group-hover/sub:border-red-500 group-hover/sub:bg-red-500'
            },
            items: [
                { name: 'Database Site', href: '/dashboard/mtel-sites', icon: FaDatabase },
                { name: 'Peta GIS', href: '/dashboard/mtel-sites/map', icon: FaMapMarkerAlt },
            ]
        },
        {
            provider: 'UMT',
            theme: {
                title: 'text-orange-500/80',
                activeText: 'text-orange-600 dark:text-orange-400',
                activeBg: 'bg-orange-50 dark:bg-orange-950/20',
                activeDot: 'border-orange-500 bg-orange-500',
                hoverDot: 'group-hover/sub:border-orange-500 group-hover/sub:bg-orange-500'
            },
            items: [
                { name: 'Database Site', href: '/dashboard/umt-sites', icon: FaDatabase },
                { name: 'Peta GIS', href: '/dashboard/umt-sites/map', icon: FaMapMarkerAlt },
            ]
        }
    ];

    const taccItems = [
        { name: 'VIRTUAL TACC', href: 'https://virtual.tacc.id/login' },
        { name: 'UMT TACC', href: 'https://umt.tacc.id/login' },
        { name: 'MTEL TACC', href: 'https://mtel.tacc.id/login' },
        { name: 'CENTRATAMA TACC', href: 'https://centratama.tacc.id/login' },
        { name: 'NODE-B TACC', href: 'https://nodeb.tacc.id/login' },
    ];

    // Map color names to Tailwind classes for active state
    const colorClasses = {
        blue: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', icon: 'bg-blue-500', glow: 'shadow-blue-500/25' },
        violet: { bg: 'bg-violet-500/10 dark:bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400', icon: 'bg-violet-500', glow: 'shadow-violet-500/25' },
        emerald: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', icon: 'bg-emerald-500', glow: 'shadow-emerald-500/25' },
        amber: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', icon: 'bg-amber-500', glow: 'shadow-amber-500/25' },
        rose: { bg: 'bg-rose-500/10 dark:bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', icon: 'bg-rose-500', glow: 'shadow-rose-500/25' },
    };

    return (
        <>
            {/* OVERLAY (Mobile) */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300 md:hidden ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={onClose}
            />

            {/* SIDEBAR */}
            <aside className={`
                fixed left-0 top-0 z-50 h-screen w-[270px] flex flex-col
                transition-transform duration-300 ease-out
                bg-[var(--bg-sidebar)] backdrop-blur-xl
                border-r border-[var(--border-color)]
                shadow-sm md:shadow-none dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3)]
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
            `}>

                {/* ─── LOGO HEADER ─── */}
                <div className="flex h-16 items-center justify-between px-5 border-b border-[var(--border-subtle)] shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Animated gradient logo */}
                        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                            <HiSparkles size={16} />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                        </div>
                        <div className="leading-tight">
                            <h1 className="text-[13px] font-extrabold tracking-tight text-[var(--text-primary)]">
                                DASHBOARD
                            </h1>
                            <span className="text-[10px] font-bold tracking-[0.2em] bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                SQUAT & MS
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-2 rounded-xl hover:bg-[var(--bg-base)]">
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* ─── SCROLLABLE MENU ─── */}
                <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">

                    {/* Section Label */}
                    <p className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] mb-3">
                        Menu Utama
                    </p>

                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        const colors = colorClasses[item.color];
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => onClose()}
                                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200
                                    ${isActive
                                        ? `${colors.bg} ${colors.text}`
                                        : 'text-[var(--text-sidebar)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {/* Active indicator bar */}
                                {isActive && (
                                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${colors.icon} shadow-sm ${colors.glow}`} />
                                )}

                                {/* Icon container */}
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200
                                    ${isActive
                                        ? `${colors.icon} text-white shadow-md ${colors.glow}`
                                        : 'bg-[var(--bg-base)] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] group-hover:bg-[var(--bg-surface)]'
                                    }`}
                                >
                                    <item.icon size={14} />
                                </div>

                                <span>{item.name}</span>
                            </Link>
                        );
                    })}

                    {/* ─── DATABASE SITE DROPDOWN ─── */}
                    <div className="mt-1">
                        <button
                            onClick={() => setIsDatabaseSiteOpen(!isDatabaseSiteOpen)}
                            className={`w-full group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200
                                ${isDatabaseSiteOpen
                                    ? 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                    : 'text-[var(--text-sidebar)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200
                                    ${isDatabaseSiteOpen
                                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                                        : 'bg-[var(--bg-base)] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] group-hover:bg-[var(--bg-surface)]'
                                    }`}
                                >
                                    <FaDatabase size={14} />
                                </div>
                                <span>Database SITE</span>
                            </div>
                            <FaChevronDown
                                size={10}
                                className={`text-[var(--text-muted)] transition-transform duration-300 ${isDatabaseSiteOpen ? 'rotate-180' : 'rotate-0'}`}
                            />
                        </button>

                        {/* Database Site Submenu */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isDatabaseSiteOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="ml-[22px] pl-4 py-3 space-y-4 border-l-2 border-[var(--border-subtle)]">
                                {databaseSiteGroups.map(group => (
                                    <div key={group.provider} className="space-y-1">
                                        <p className={`text-[10px] font-extrabold ${group.theme.title} uppercase tracking-widest pl-1 mb-1.5`}>
                                            Site {group.provider}
                                        </p>
                                        <div className="space-y-0.5">
                                            {group.items.map((item) => {
                                                const isActive = pathname === item.href;
                                                return (
                                                    <Link
                                                        key={item.name}
                                                        href={item.href}
                                                        onClick={() => onClose()}
                                                        className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium transition-all duration-200 group/sub
                                                            ${isActive
                                                                ? `${group.theme.activeText} ${group.theme.activeBg} font-bold`
                                                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
                                                            }`}
                                                    >
                                                        {/* Connector dot */}
                                                        <div className={`absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 transition-colors duration-200
                                                            ${isActive
                                                                ? group.theme.activeDot
                                                                : `border-[var(--border-subtle)] bg-[var(--bg-sidebar)] ${group.theme.hoverDot}`
                                                            }`}
                                                        />
                                                        <item.icon size={11} />
                                                        <span>{item.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ─── DIVIDER ─── */}
                    <div className="my-5 mx-3">
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />
                    </div>

                    {/* Section Label */}
                    <p className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] mb-3">
                        Eksternal
                    </p>

                    {/* Lensa Flow */}
                    <a
                        href="https://flow.telkomakses.co.id"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                        className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[var(--text-sidebar)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] transition-all duration-200"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-base)] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] group-hover:bg-[var(--bg-surface)] transition-all duration-200">
                            <FaGlobe size={14} />
                        </div>
                        <span>Lensa Flow (WFM)</span>
                        <FaExternalLinkAlt className="ml-auto opacity-0 group-hover:opacity-60 text-[9px] transition-opacity" />
                    </a>

                    {/* Dashboard TACC Dropdown */}
                    <button
                        onClick={() => setIsTaccOpen(!isTaccOpen)}
                        className={`w-full group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200
                            ${isTaccOpen
                                ? 'bg-[var(--bg-base)] text-[var(--text-primary)]'
                                : 'text-[var(--text-sidebar)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200
                                ${isTaccOpen
                                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                                    : 'bg-[var(--bg-base)] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] group-hover:bg-[var(--bg-surface)]'
                                }`}
                            >
                                <FaDesktop size={14} />
                            </div>
                            <span>Dashboard TACC</span>
                        </div>
                        <FaChevronDown
                            size={10}
                            className={`text-[var(--text-muted)] transition-transform duration-300 ${isTaccOpen ? 'rotate-180' : 'rotate-0'}`}
                        />
                    </button>

                    {/* TACC Submenu with smooth animation */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isTaccOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="ml-[22px] pl-4 py-1 space-y-0.5 border-l-2 border-[var(--border-subtle)]">
                            {taccItems.map((item) => (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => onClose()}
                                    className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition-all duration-200 group"
                                >
                                    {/* Connector dot */}
                                    <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-[var(--border-subtle)] bg-[var(--bg-sidebar)] group-hover:border-blue-500 group-hover:bg-blue-500 transition-colors duration-200" />
                                    <span>{item.name}</span>
                                    <FaExternalLinkAlt className="ml-auto opacity-0 group-hover:opacity-60 text-[8px] transition-opacity" />
                                </a>
                            ))}
                        </div>
                    </div>

                </nav>

                {/* ─── FOOTER CREDITS ─── */}
                <div className="p-3 border-t border-[var(--border-subtle)] shrink-0">
                    <a
                        href="https://www.vandiza.my.id"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center gap-2 rounded-xl p-2.5 hover:bg-[var(--bg-base)] transition-all duration-200"
                    >
                        <p className="text-[10px] font-medium text-[var(--text-muted)]">
                            Crafted with <span className="text-red-500">♥</span> by
                        </p>
                        <span className="text-[11px] font-extrabold tracking-[0.15em] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-hover:tracking-[0.25em] transition-all duration-300">
                            VANDIZA
                        </span>
                    </a>
                </div>

            </aside>
        </>
    );
}