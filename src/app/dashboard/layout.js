'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

// Layout utama Dashboard (Force Reload)
export default function DashboardLayout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans transition-colors duration-300">

            {/* 1. Sidebar */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* 2. Wrapper Konten Kanan */}
            <div className="flex flex-col min-h-screen transition-all duration-300 md:ml-64">

                {/* Header */}
                <Header onMenuClick={() => setIsSidebarOpen(true)} />

                {/* 3. Konten Utama */}
                <main className="flex-1 p-4 md:p-8 bg-[var(--bg-base)]">
                    {children}
                </main>

            </div>
        </div>
    );
}