import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* 1. Sidebar (Fixed di Kiri) */}
            <Sidebar />

            {/* 2. Konten Utama (Di Sebelah Kanan Sidebar) */}
            {/* margin-left-64 (ml-64) dipakai karena sidebar lebarnya 64 */}
            <main className="ml-64 min-h-screen p-8">
                {children}
            </main>
        </div>
    );
}