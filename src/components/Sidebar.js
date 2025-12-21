'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
    FaHome, FaTicketAlt, FaUsers, FaChartLine, FaSignOutAlt, FaUserCircle, FaUserCog, FaBuilding, FaTimes 
} from 'react-icons/fa';

// TERIMA PROPS isOpen & onClose DARI LAYOUT
export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const router = useRouter();
    
    const [user, setUser] = useState({ username: 'Loading...', role: '' });

    useEffect(() => {
        fetch('/api/me')
            .then(res => res.json())
            .then(data => setUser(data))
            .catch(() => setUser({ username: 'Guest', role: '' }));
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            router.push('/login'); 
            router.refresh(); 
        } catch (error) {
            console.error('Logout error', error);
        }
    };

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

    return (
        <>
            {/* OVERLAY GELAP (Hanya muncul di Mobile saat sidebar terbuka) */}
            <div 
                className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={onClose}
            />

            {/* SIDEBAR UTAMA */}
            <aside className={`fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 text-white transition-transform duration-300 shadow-2xl border-r border-slate-800 
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
            >
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

                <div className="flex h-full flex-col relative z-10">
                    {/* LOGO AREA */}
                    <div className="flex items-center justify-between px-6 py-6 mb-2">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white shadow-lg shadow-blue-500/30">
                                <FaBuilding />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold tracking-wide text-white leading-tight">
                                    DASHBOARD <br/><span className="text-blue-400 font-extrabold text-sm tracking-wider">SQUAT & MS</span>
                                </h1>
                            </div>
                        </div>
                        {/* TOMBOL CLOSE (Hanya di Mobile) */}
                        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                            <FaTimes size={24} />
                        </button>
                    </div>

                    {/* MENU NAVIGATION */}
                    <nav className="flex-1 space-y-1 px-4 overflow-y-auto custom-scrollbar">
                        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">Main Menu</p>
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => onClose()} // Tutup sidebar saat menu diklik (UX Mobile)
                                    className={`group relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-300 ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 translate-x-1'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                                    }`}
                                >
                                    {isActive && <div className="absolute left-0 h-6 w-1 rounded-r-full bg-white/30" />}
                                    <item.icon className={`text-lg transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* USER PROFILE & LOGOUT */}
                    <div className="p-4 m-4 rounded-2xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
                        <Link href="/dashboard/profile" onClick={() => onClose()} className="flex items-center gap-3 mb-4 group cursor-pointer">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 text-white font-bold shadow-md group-hover:scale-105 transition-transform">
                                <FaUserCircle />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Login as :</p>
                                <p className="truncate text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                    {user.username}
                                </p>
                            </div>
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                        >
                            <FaSignOutAlt /> Logout
                        </button>

                        <div className="mt-4 text-center pt-4 border-t border-slate-700/50">
                            <p className="text-[10px] text-slate-500">
                                Created by <a href="https://www.vandiza.my.id" target="_blank" rel="noopener noreferrer" className="text-slate-400 font-bold hover:text-blue-400 cursor-pointer transition-colors underline decoration-dotted underline-offset-2">Vandiza</a>
                            </p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}