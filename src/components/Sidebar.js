'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
    FaHome, FaTicketAlt, FaUsers, FaChartLine, FaSignOutAlt, FaUserCircle, FaUserCog 
} from 'react-icons/fa';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    
    // State User
    const [user, setUser] = useState({ username: 'Loading...', role: '' });

    useEffect(() => {
        fetch('/api/me')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Gagal memuat user');
            })
            .then(data => {
                setUser(data);
            })
            .catch(() => {
                setUser({ username: 'Guest', role: '' });
            });
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

    // --- DEFINISI MENU ---
    const menuItems = [
        { name: 'Dashboard', href: '/dashboard', icon: FaHome },
        { name: 'Manajemen Tiket', href: '/dashboard/tickets', icon: FaTicketAlt },
        { name: 'Data Teknisi', href: '/dashboard/technicians', icon: FaUsers },
        // Menu Produktifitas
        { name: 'Produktifitas', href: '/dashboard/productivity', icon: FaChartLine },
    ];

    // LOGIKA TAMBAHAN: Jika Admin, masukkan menu Manajemen User
    if (user.role === 'Admin') {
        // Kita sisipkan di urutan ke-3 (setelah Data Teknisi) atau paling bawah
        // Di sini saya taruh sebelum Produktifitas agar rapi
        menuItems.splice(3, 0, { 
            name: 'Manajemen User', 
            href: '/dashboard/users', 
            icon: FaUserCog 
        });
    }

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#0f172a] text-white transition-transform">
            <div className="flex h-full flex-col">
                {/* LOGO */}
                <div className="flex items-center gap-3 px-6 py-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white shadow-lg shadow-blue-500/50">
                        
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-wide text-white">
                            Dashboard <span className="text-blue-500">SQUAT & MS</span>
                        </h1>
                    </div>
                </div>

                {/* MENU */}
                <nav className="flex-1 space-y-2 px-4 py-4">
                    <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">Main Menu</p>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <item.icon className={isActive ? 'text-white' : 'text-slate-400'} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* USER PROFILE */}
                <div className="p-4 border-t border-slate-800">
                    <Link href="/dashboard/profile">
                        <div className="group mb-3 flex items-center gap-3 rounded-xl bg-slate-800/50 p-3 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 transition-all cursor-pointer">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white shadow-lg">
                                <FaUserCircle className="text-xl" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs text-slate-400">Login sebagai</p>
                                <p className="truncate text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                    {user.username}
                                </p>
                            </div>
                        </div>
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    >
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            </div>
        </aside>
    );
}