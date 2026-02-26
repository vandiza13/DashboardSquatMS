'use client';

import { FaInbox } from 'react-icons/fa';

export default function EmptyState({
    title = "Data Kosong",
    message = "Belum ada data yang tersedia untuk ditampilkan saat ini.",
    icon: Icon = FaInbox,
    actionLabel,
    onAction,
    className = ""
}) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-surface-2)] ${className}`}>
            <div className="bg-[var(--bg-surface)] p-4 rounded-full shadow-sm mb-4 ring-1 ring-[var(--border-subtle)]">
                <Icon className="text-3xl text-[var(--text-muted)]" />
            </div>
            <h3 className="text-[var(--text-primary)] font-bold text-base mb-1">{title}</h3>
            <p className="text-[var(--text-muted)] text-sm max-w-sm mx-auto mb-6 leading-relaxed">
                {message}
            </p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition shadow-sm active:scale-95 flex items-center gap-2"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}