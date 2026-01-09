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
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 ${className}`}>
            <div className="bg-white p-4 rounded-full shadow-sm mb-4 ring-1 ring-slate-100">
                <Icon className="text-3xl text-slate-300" />
            </div>
            <h3 className="text-slate-700 font-bold text-base mb-1">{title}</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
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