'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    FaHome, FaTicketAlt, FaUsers, FaChartLine,
    FaUserCog, FaBuilding, FaTimes,
    FaDesktop, FaChevronDown, FaChevronRight, FaNetworkWired, FaExternalLinkAlt, FaGlobe
} from 'react-icons/fa';

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const [user, setUser] = useState({ username: 'Loading...', role: '' });
    const [isTaccOpen, setIsTaccOpen] = useState(false);

    useEffect(() => {
        fetch('/api/me')
            .then(res => res.json())
            .then(data => setUser(data))
            .catch(() => setUser({ username: 'Guest', role: '' }));
    }, []);

    const menuItems = [
        { name: 'Dashboard', href: '/dashboard', icon: FaHome },
        { name: 'Manajemen Tiket', href: '/dashboard/tickets', icon: FaTicketAlt },
        { name: 'Data Teknisi', href: '/dashboard/technicians', icon: FaUsers },
        { name: 'Produktifitas', href: '/dashboard/productivity', icon: FaChartLine },
    ];

    if (user.role === 'Admin') {
        menuItems.splice(3, 0, {
            name: 'Manajemen User',
            href: '/dashboard/users',
            icon: FaUserCog
        });
    }

    const taccItems = [
        { name: 'VIRTUAL TACC', href: 'https://virtual.tacc.id/login' },
        { name: 'UMT TACC', href: 'https://umt.tacc.id/login' },
        { name: 'MTEL TACC', href: 'https://mtel.tacc.id/login' },
        { name: 'CENTRATAMA TACC', href: 'https://centratama.tacc.id/login' },
        { name: 'NODE-B TACC', href: 'https://nodeb.tacc.id/login' },
    ];

    return (
        <>
            {/* OVERLAY (Mobile) */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={onClose}
            />

            {/* SIDEBAR */}
            <aside className={`
                fixed left-0 top-0 z-50 h-screen w-64 flex flex-col
                transition-transform duration-300 shadow-2xl
                bg-[var(--bg-sidebar)]
                border-r border-[var(--border-color)]
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
            `}>

                {/* LOGO HEADER */}
                <div className="flex h-16 items-center justify-between px-5 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500 text-white shadow-sm shadow-blue-500/20">
                            <FaBuilding size={12} />
                        </div>
                        <h1 className="text-sm font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                            DASHBOARD <br />
                            <span className="text-blue-600 dark:text-blue-400 font-extrabold text-[10px] tracking-widest">SQUAT & MS</span>
                        </h1>
                    </div>
                    <button onClick={onClose} className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-2 rounded-lg hover:bg-[var(--bg-base)]">
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* SCROLLABLE MENU */}
                <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-0.5">

                    {/* Label */}
                    <p className="px-3 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 mt-2">Menu Utama</p>

                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => onClose()}
                                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${isActive
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                        : 'text-[var(--text-sidebar)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <item.icon className={`text-base transition-colors ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`} />
                                {item.name}
                            </Link>
                        );
                    })}

                    {/* Divider */}
                    <div className="my-5 border-t border-[var(--border-subtle)] mx-3"></div>
                    <p className="px-3 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Eksternal Link</p>

                    {/* Lensa Flow */}
                    <a
                        href="https://flow.telkomakses.co.id"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                        className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-sidebar)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] transition-colors duration-200"
                    >
                        <FaGlobe className="text-base transition-colors text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]" />
                        <span>Lensa Flow (WFM)</span>
                        <FaExternalLinkAlt className="ml-auto opacity-40 text-[10px] group-hover:opacity-100" />
                    </a>

                    {/* Dashboard TACC Dropdown */}
                    <button
                        onClick={() => setIsTaccOpen(!isTaccOpen)}
                        className={`w-full group relative flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 mt-0.5
                            ${isTaccOpen
                                ? 'bg-[var(--bg-base)] text-[var(--text-primary)]'
                                : 'text-[var(--text-sidebar)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <FaDesktop className={`text-base transition-colors ${isTaccOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`} />
                            <span>Dashboard TACC</span>
                        </div>
                        <div className="flex items-center justify-center w-5 h-5">
                            {isTaccOpen ? <FaChevronDown size={10} className="text-[var(--text-muted)]" /> : <FaChevronRight size={10} className="text-[var(--text-muted)]" />}
                        </div>
                    </button>

                    {isTaccOpen && (
                        <div className="mt-1 space-y-0.5 pl-3 relative">
                            <div className="absolute left-[21px] top-1 bottom-1 w-[2px] bg-[var(--border-subtle)] rounded-full"></div>
                            {taccItems.map((item) => (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => onClose()}
                                    className="relative flex items-center gap-3 rounded-lg px-3 py-2 pl-7 text-[13px] font-medium text-[var(--text-sidebar)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition-colors duration-200 group"
                                >
                                    {/* Indicator Dot connected to line */}
                                    <div className="absolute left-[19px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--border-color)] group-hover:bg-blue-500 transition-colors"></div>
                                    <span>{item.name}</span>
                                    <FaExternalLinkAlt className="ml-auto opacity-0 group-hover:opacity-100 text-[10px] text-[var(--text-muted)] transition-opacity" />
                                </a>
                            ))}
                        </div>
                    )}
                </nav>

                {/* FOOTER CREDITS */}
                <div className="p-4 border-t border-[var(--border-subtle)] mt-auto shrink-0 bg-[var(--bg-surface)]">
                    <a
                        href="https://www.vandiza.my.id"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col items-center justify-center gap-1 rounded-lg p-2.5 hover:bg-[var(--bg-base)] transition-colors duration-200 border border-transparent"
                    >
                        <p className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)] transition-colors">
                            Crafted with <span className="text-red-500 animate-pulse">❤</span> by
                        </p>
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                            <span className="text-xs font-bold tracking-[0.2em] transition-all duration-300">VANDIZA</span>
                        </div>
                    </a>
                </div>

            </aside>
        </>
    );
}