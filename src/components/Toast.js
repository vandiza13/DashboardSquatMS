'use client';

import { useEffect } from 'react';
import { FaCheckCircle, FaInfoCircle, FaExclamationCircle } from 'react-icons/fa';

export default function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        // Otomatis hilang setelah 3 detik
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    if (!message) return null;

    const styles = {
        success: 'bg-emerald-500 border-emerald-600 text-white',
        error: 'bg-red-500 border-red-600 text-white',
        info: 'bg-blue-500 border-blue-600 text-white'
    };

    const icons = {
        success: <FaCheckCircle className="text-xl" />,
        error: <FaExclamationCircle className="text-xl" />,
        info: <FaInfoCircle className="text-xl" />
    };

    return (
        <div className="fixed top-5 right-5 z-[100] animate-fade-in-down">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${styles[type]} min-w-[300px]`}>
                {icons[type]}
                <p className="font-bold text-sm">{message}</p>
            </div>
        </div>
    );
}