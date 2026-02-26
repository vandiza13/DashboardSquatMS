'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    FaBars, FaUserCircle, FaSignOutAlt, FaUser, FaChevronDown, FaBell, FaQuoteLeft
} from 'react-icons/fa';
import { HiSun, HiMoon } from 'react-icons/hi2';
import Skeleton from '@/components/Skeleton';
import { useTheme } from '@/context/ThemeContext';

export default function Header({ onMenuClick }) {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState({ username: 'Loading...', role: '' });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const quotes = [
        "Quality means doing it right when no one is looking. - Henry Ford",
        "The only way to do great work is to love what you do. - Steve Jobs",
        "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
        "Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort. - Paul J. Meyer",
        "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
        "Teamwork makes the dream work.",
    ];
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
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-[var(--bg-surface)] px-6 shadow-sm border-b border-[var(--border-color)]">

            {/* KIRI: Tombol Menu (Mobile) & Running Text */}
            <div className="flex items-center gap-4 flex-1 overflow-hidden mr-4">
                <button
                    onClick={onMenuClick}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-base)] md:hidden focus:outline-none transition-colors"
                >
                    <FaBars size={20} />
                </button>

                {/* RUNNING TEXT */}
                <div className="hidden md:flex flex-1 items-center relative h-10 overflow-hidden rounded-full bg-[var(--bg-base)] border border-[var(--border-color)] px-4 max-w-2xl">
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--bg-base)] to-transparent z-10"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--bg-base)] to-transparent z-10"></div>

                    <div className="flex items-center gap-2 text-[var(--text-muted)] mr-2 z-0 shrink-0">
                        <FaQuoteLeft size={12} />
                    </div>

                    <div className="w-full overflow-hidden">
                        <div className="animate-marquee whitespace-nowrap text-sm font-medium text-[var(--text-secondary)] italic tracking-wide">
                            {runningTextContent}
                        </div>
                    </div>
                </div>
            </div>

            {/* KANAN: Theme Toggle, Notifikasi & User Profile */}
            <div className="flex items-center gap-3 shrink-0">

                {/* === THEME TOGGLE BUTTON === */}
                <button
                    onClick={toggleTheme}
                    aria-label="Toggle tema"
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[var(--accent-primary)] bg-[var(--bg-base)] hover:bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] shadow-sm transition-all duration-300 group overflow-hidden"
                >
                    {/* Sun Icon (Light Mode) */}
                    <HiSun
                        size={18}
                        className={`absolute transition-all duration-500 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`}
                    />
                    {/* Moon Icon (Dark Mode) */}
                    <HiMoon
                        size={18}
                        className={`absolute transition-all duration-500 ${theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}
                    />
                </button>

                {/* Notifikasi */}
                <button className="relative p-2 text-[var(--text-muted)] hover:text-blue-500 transition-colors">
                    <FaBell size={18} />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[var(--bg-surface)]"></span>
                </button>

                <div className="h-8 w-[1px] bg-[var(--border-color)] hidden sm:block"></div>

                {/* USER DROPDOWN */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 focus:outline-none group"
                    >
                        <div className="text-right hidden sm:block">
                            {user.username === 'Loading...' ? (
                                <Skeleton className="h-4 w-24 mb-1 ml-auto" />
                            ) : (
                                <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">
                                    {user.username}
                                </p>
                            )}
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-secondary)] group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500 transition-colors">
                            <FaUserCircle size={24} />
                        </div>
                        <FaChevronDown size={10} className={`text-[var(--text-muted)] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* DROPDOWN MENU */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-3 w-52 origin-top-right rounded-2xl bg-[var(--bg-surface)] py-1 shadow-2xl border border-[var(--border-color)] overflow-hidden">
                            <div className="px-4 py-3 border-b border-[var(--border-subtle)] sm:hidden">
                                <p className="text-sm font-bold text-[var(--text-primary)]">{user.username}</p>
                                <p className="text-xs text-[var(--text-muted)]">{user.role}</p>
                            </div>

                            <Link
                                href="/dashboard/profile"
                                onClick={() => setIsDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-blue-500 transition-colors"
                            >
                                <FaUser className="text-[var(--text-muted)]" /> Profile Saya
                            </Link>

                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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