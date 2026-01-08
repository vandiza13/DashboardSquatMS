'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
    FaHome, FaTicketAlt, FaUsers, FaChartLine, 
    FaUserCog, FaBuilding, FaTimes, 
    FaDesktop, FaChevronDown, FaChevronRight, FaNetworkWired, FaExternalLinkAlt 
} from 'react-icons/fa';

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const [user, setUser] = useState({ username: 'Loading...', role: '' });
    const [isTaccOpen, setIsTaccOpen] = useState(false);

    // Kita tetap butuh fetch user hanya untuk cek Role (Admin/Bukan)
    useEffect(() => {
        fetch('/api/me')
            .then(res => res.json())
            .then(data => setUser(data))
            .catch(() => setUser({ username: 'Guest', role: '' }));
    }, []);

    // --- MENU 1: NAVIGATION INTERNAL ---
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

    // --- MENU 2: DASHBOARD TACC ---
    const taccItems = [
        { name: 'VIRTUAL TACC', href: 'https://virtual.tacc.id/login' },
        { name: 'UMT TACC', href: 'https://umt.tacc.id/login' },
        { name: 'MTEL TACC', href: 'https://mtel.tacc.id/login' },
        { name: 'CENTRATAMA TACC', href: 'https://centratama.tacc.id/login' },
        { name: 'NODE-B TACC', href: 'https://nodeb.tacc.id/login' },
    ];

    return (
        <>
            {/* OVERLAY GELAP (Mobile) */}
            <div 
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={onClose}
            />

            {/* SIDEBAR */}
            <aside className={`fixed left-0 top-0 z-50 h-screen w-64 bg-slate-900 text-white transition-transform duration-300 shadow-2xl border-r border-slate-800 
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}
            >
                {/* LOGO HEADER */}
                <div className="flex h-16 items-center justify-between px-6 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                            <FaBuilding size={14} />
                        </div>
                        <h1 className="text-sm font-bold tracking-wide text-white leading-tight">
                            DASHBOARD <br/><span className="text-blue-400 font-extrabold text-[10px] tracking-widest">SQUAT & MS</span>
                        </h1>
                    </div>
                    <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                        <FaTimes />
                    </button>
                </div>

                {/* SCROLLABLE MENU */}
                <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                    
                    {/* Main Menu */}
                    <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-2">Menu Utama</p>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => onClose()}
                                className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 translate-x-1'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                                }`}
                            >
                                <item.icon className={`text-lg transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                                {item.name}
                            </Link>
                        );
                    })}

                    {/* External Menu TACC */}
                    <div className="my-4 border-t border-slate-800 mx-2"></div>
                    <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Eksternal Link</p>
                    
                    <button 
                        onClick={() => setIsTaccOpen(!isTaccOpen)}
                        className={`w-full group relative flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 
                            ${isTaccOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <div className="flex items-center gap-3">
                            <FaDesktop className={`text-lg transition-colors ${isTaccOpen ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`} />
                            <span>Dashboard TACC</span>
                        </div>
                        {isTaccOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    </button>

                    {isTaccOpen && (
                        <div className="mt-1 space-y-1 pl-4 relative">
                            <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-slate-800"></div>
                            {taccItems.map((item) => (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => onClose()}
                                    className="relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200"
                                >
                                    <FaNetworkWired className="text-slate-600" size={10} />
                                    {item.name}
                                    <FaExternalLinkAlt className="ml-auto opacity-30 text-[9px]" />
                                </a>
                            ))}
                        </div>
                    )}
                </nav>

                {/* FOOTER SIDEBAR (Hanya teks copyright kecil agar tidak kosong melompong) */}
                <div className="p-4 border-t border-slate-800 text-center">
                    <p className="text-[10px] text-slate-600">
                        &copy; 2026 Dashboard SQUAT & MS <br/>v2.0.0
                    </p>
                </div>
            </aside>
        </>
    );
}