'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header'; // Pastikan sudah import ini

export default function DashboardLayout({ children }) {
    // State untuk Buka/Tutup Sidebar di HP
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            
            {/* 1. Sidebar */}
            {/* Posisi Fixed (Overlay di HP, Tetap di Kiri di Desktop) */}
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />

            {/* 2. Wrapper Konten Kanan */}
            {/* KUNCI RAPIH: md:ml-64 memberi jarak 256px di kiri KHUSUS Desktop agar tidak tertutup Sidebar */}
            <div className="flex flex-col min-h-screen transition-all duration-300 md:ml-64">
                
                {/* Header (Berisi Tombol Menu HP & Profil Desktop) */}
                {/* Fungsi onMenuClick akan memicu state sidebar terbuka */}
                <Header onMenuClick={() => setIsSidebarOpen(true)} />

                {/* 3. Konten Utama */}
                <main className="flex-1 p-4 md:p-8 bg-slate-50">
                    {children}
                </main>

            </div>
        </div>
    );
}