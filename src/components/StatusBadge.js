'use client';

export default function StatusBadge({ status }) {
    const label = status ? status.toUpperCase() : 'UNKNOWN';

    // Kamus Warna (Mapping) — Translucent glass pill dengan dot halus
    const colorMap = {
        // OPEN / GANGGUAN -> Crimson
        'OPEN': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        'DOWN': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',

        // SC / PENDING -> Amber / Gold
        'SC': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
        'PROGRESS': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
        'PENDING': 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',

        // CLOSED / DONE -> Emerald Mint
        'CLOSED': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        'DONE': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        'RESOLVED': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    };

    const isOpen = ['OPEN', 'DOWN'].includes(label);
    const style = colorMap[label] || 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20';

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider border backdrop-blur-xs shadow-2xs uppercase ${style}`}>
            <span className="relative flex h-1.5 w-1.5">
                {isOpen && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                )}
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
            </span>
            {label}
        </span>
    );
}