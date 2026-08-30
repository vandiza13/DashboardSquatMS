'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

// Layout utama Dashboard
export default function DashboardLayout({ children }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isDesktopOpen, setIsDesktopOpen] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('sidebar_desktop_open');
        if (saved !== null) {
            setIsDesktopOpen(saved === 'true');
        }
    }, []);

    const handleToggleSidebar = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsMobileOpen(prev => !prev);
        } else {
            setIsDesktopOpen(prev => {
                const nextVal = !prev;
                localStorage.setItem('sidebar_desktop_open', String(nextVal));
                return nextVal;
            });
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans transition-colors duration-300">

            {/* 1. Sidebar */}
            <Sidebar
                isOpen={isMobileOpen}
                isDesktopOpen={isDesktopOpen}
                onClose={() => setIsMobileOpen(false)}
                onToggleDesktop={() => {
                    setIsDesktopOpen(prev => {
                        const nextVal = !prev;
                        localStorage.setItem('sidebar_desktop_open', String(nextVal));
                        return nextVal;
                    });
                }}
            />

            {/* 2. Wrapper Konten Kanan */}
            <div className={`flex flex-col min-h-screen transition-all duration-300 ${isDesktopOpen ? 'md:ml-[260px]' : 'md:ml-[76px]'}`}>

                {/* Header */}
                <Header 
                    onMenuClick={handleToggleSidebar} 
                    isDesktopSidebarOpen={isDesktopOpen}
                />

                {/* 3. Konten Utama */}
                <main className="flex-1 p-4 md:p-6 bg-[var(--bg-base)]">
                    {children}
                </main>

            </div>
        </div>
    );
}