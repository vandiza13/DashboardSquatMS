'use client';

export default function StatusBadge({ status }) {
    // Pastikan status aman (handle null/undefined)
    const label = status ? status.toUpperCase() : 'UNKNOWN';

    // Kamus Warna (Mapping) — dengan dark mode variants
    const colorMap = {
        // OPEN / GANGGUAN -> Merah (Darurat)
        'OPEN': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
        'DOWN': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',

        // PROGRESS / SC / PENDING -> Kuning/Oranye (Proses)
        'SC': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        'PROGRESS': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        'PENDING': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',

        // CLOSED / DONE -> Hijau (Selesai)
        'CLOSED': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        'DONE': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        'RESOLVED': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    };

    // Default warna jika status tidak dikenali (Abu-abu)
    const className = colorMap[label] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';

    return (
        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wide border uppercase shadow-sm ${className}`}>
            {/* Indikator Titik Kecil (Dot) untuk estetika */}
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-60"></span>
            {label}
        </span>
    );
}