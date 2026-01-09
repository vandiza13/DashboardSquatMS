'use client';

import { useSearchParams } from 'next/navigation';
import { FaExternalLinkAlt, FaExclamationTriangle, FaShieldAlt } from 'react-icons/fa';
import { Suspense } from 'react';

// Komponen Content Utama
function WebViewContent() {
    const searchParams = useSearchParams();
    const targetUrl = searchParams.get('url');
    const title = searchParams.get('title') || 'External Site';

    if (!targetUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <FaExclamationTriangle className="text-4xl mb-3 opacity-50" />
                <p>URL tidak ditemukan atau parameter salah.</p>
            </div>
        );
    }

    return (
        // Gunakan h-[calc(100vh-...)] agar iframe memenuhi sisa layar tanpa scroll ganda
        <div className="flex flex-col h-[calc(100vh-5rem)] -m-4 md:-m-8 overflow-hidden">
            
            {/* Header WebView Kecil */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex justify-between items-center shadow-sm z-20 shrink-0 h-12">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        {title}
                    </h3>
                    <span className="hidden sm:flex text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 items-center gap-1">
                        <FaShieldAlt size={8} /> Secure WebView
                    </span>
                </div>
                
                <a 
                    href={targetUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition font-medium"
                >
                    Buka Tab Baru <FaExternalLinkAlt size={10} />
                </a>
            </div>

            {/* Area Iframe */}
            <div className="flex-1 bg-slate-100 relative w-full h-full">
                <iframe 
                    src={targetUrl}
                    className="w-full h-full border-0 block"
                    title={title}
                    // Izin keamanan standar agar web target berfungsi normal
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                    allowFullScreen
                />
            </div>
        </div>
    );
}

// Komponen Utama dengan Suspense (Wajib untuk useSearchParams di Next.js)
export default function WebViewPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat WebView...</div>}>
            <WebViewContent />
        </Suspense>
    );
}