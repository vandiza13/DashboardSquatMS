'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    FaBars, FaUserCircle, FaSignOutAlt, FaUser, FaChevronDown, FaBell, FaQuoteLeft 
} from 'react-icons/fa';
import Skeleton from '@/components/Skeleton';

export default function Header({ onMenuClick }) {
    const router = useRouter();
    const [user, setUser] = useState({ username: 'Loading...', role: '' });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Daftar Kata Motivasi
    const quotes = [
        "Quality means doing it right when no one is looking. - Henry Ford",
        "The only way to do great work is to love what you do. - Steve Jobs",
        "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
        "Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort. - Paul J. Meyer",
        "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
        "Teamwork makes the dream work.",
    ];

    // Menggabungkan quotes menjadi satu string panjang dengan pemisah
    const runningTextContent = quotes.join("  ✦  ");

    useEffect(() => {
        fetch('/api/me')
            .then(res => res.json())
            .then(data => setUser(data))
            .catch(() => setUser({ username: 'Guest', role: '' }));
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
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

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-white px-6 shadow-sm border-b border-slate-200">
            {/* KIRI: Tombol Menu (Mobile) & Running Text */}
            <div className="flex items-center gap-4 flex-1 overflow-hidden mr-4">
                <button 
                    onClick={onMenuClick}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 md:hidden focus:outline-none"
                >
                    <FaBars size={20} />
                </button>
                
                {/* --- AREA RUNNING TEXT ELEGANT --- */}
                <div className="hidden md:flex flex-1 items-center relative h-10 overflow-hidden rounded-full bg-slate-50 border border-slate-100 shadow-inner px-4 max-w-2xl">
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-50 to-transparent z-10"></div> {/* Fade Kiri */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 to-transparent z-10"></div> {/* Fade Kanan */}
                    
                    <div className="flex items-center gap-2 text-slate-400 mr-2 z-0 shrink-0">
                        <FaQuoteLeft size={12} />
                    </div>

                    <div className="w-full overflow-hidden">
                        <div className="animate-marquee whitespace-nowrap text-sm font-medium text-slate-600 italic tracking-wide">
                           {runningTextContent}
                        </div>
                    </div>
                </div>
                {/* ---------------------------------- */}
            </div>

            {/* KANAN: Notifikasi & User Profile */}
            <div className="flex items-center gap-4 shrink-0">
                
                {/* Notifikasi */}
                <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors">
                    <FaBell size={18} />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                </button>

                <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

                {/* USER DROPDOWN */}
                <div className="relative" ref={dropdownRef}>
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 focus:outline-none group"
                    >
                        <div className="text-right hidden sm:block">
                        {user.username === 'Loading...' ? (
                        <>
                        <Skeleton className="h-4 w-24 mb-1 ml-auto" /> {/* Untuk Nama */}
                        </>
                        ) : (
                        <>
                        <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                        {user.username}
                        </p>
                        </>
                        )}
                    </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <FaUserCircle size={24} />
                        </div>
                        <FaChevronDown size={10} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* DROPDOWN MENU */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-3 w-48 origin-top-right rounded-xl bg-white py-1 shadow-xl ring-1 ring-black ring-opacity-5 transition-all">
                            <div className="px-4 py-3 border-b border-slate-100 sm:hidden">
                                <p className="text-sm font-bold text-slate-700">{user.username}</p>
                                <p className="text-xs text-slate-500">{user.role}</p>
                            </div>
                            
                            <Link 
                                href="/dashboard/profile"
                                onClick={() => setIsDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                            >
                                <FaUser className="text-slate-400" /> Profile Saya
                            </Link>
                            
                            <button 
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <FaSignOutAlt /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}