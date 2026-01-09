'use client';

export default function StatusBadge({ status }) {
    // Pastikan status aman (handle null/undefined)
    const label = status ? status.toUpperCase() : 'UNKNOWN';

    // Kamus Warna (Mapping)
    const colorMap = {
        // OPEN / GANGGUAN -> Merah (Darurat)
        'OPEN': 'bg-red-100 text-red-700 border-red-200',
        'DOWN': 'bg-red-100 text-red-700 border-red-200',
        
        // PROGRESS / SC / PENDING -> Kuning/Oranye (Proses)
        'SC': 'bg-amber-100 text-amber-700 border-amber-200',
        'PROGRESS': 'bg-blue-100 text-blue-700 border-blue-200',
        'PENDING': 'bg-orange-100 text-orange-700 border-orange-200',
        
        // CLOSED / DONE -> Hijau (Selesai)
        'CLOSED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'DONE': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'RESOLVED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };

    // Default warna jika status tidak dikenali (Abu-abu)
    const className = colorMap[label] || 'bg-slate-100 text-slate-600 border-slate-200';

    return (
        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wide border uppercase shadow-sm ${className}`}>
            {/* Indikator Titik Kecil (Dot) untuk estetika */}
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-60"></span>
            {label}
        </span>
    );
}