'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { FaBars } from 'react-icons/fa';

export default function DashboardLayout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* 1. Sidebar Component */}
            {/* Kita oper state isOpen dan fungsi onClose ke Sidebar */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* 2. Mobile Header (Hanya Muncul di HP) */}
            {/* Ini tombol untuk membuka Sidebar di HP */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold text-slate-800 tracking-tight">DASHBOARD</span>
                </div>
                <button 
                    onClick={() => setIsSidebarOpen(true)} 
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <FaBars size={20} />
                </button>
            </div>

            {/* 3. Konten Utama */}
            {/* ml-0 di HP (Full Width), md:ml-64 di Laptop (Ada Sidebar) */}
            {/* pt-20 di HP (Biar gak ketutup header), md:pt-8 di Laptop */}
            <main className="transition-all duration-300 ml-0 md:ml-64 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
                {children}
            </main>
        </div>
    );
}