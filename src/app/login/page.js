'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaUser, FaLock, FaSpinner, FaTelegramPlane } from 'react-icons/fa';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                // Login Sukses
                router.push('/dashboard'); 
                router.refresh();
            } else {
                setError(data.error || 'Login gagal');
            }
        } catch (err) {
            setError('Terjadi kesalahan jaringan.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-[#050510] overflow-hidden font-sans">
            
            {/* --- BACKGROUND EFFECTS (LASER LINES) --- */}
            {/* Kita buat efek garis-garis background menggunakan CSS Gradient */}
            <div className="absolute inset-0 z-0 opacity-20"
                style={{
                    backgroundImage: `
                        linear-gradient(15deg, transparent 49%, #3b82f6 49.5%, #3b82f6 50.5%, transparent 51%),
                        linear-gradient(165deg, transparent 49%, #3b82f6 49.5%, #3b82f6 50.5%, transparent 51%),
                        linear-gradient(185deg, transparent 49%, #8b5cf6 49.5%, #8b5cf6 50.5%, transparent 51%)
                    `,
                    backgroundSize: '120% 120%',
                }}
            ></div>
            
            {/* Efek Glow di tengah belakang kartu */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 blur-[100px] rounded-full z-0"></div>


            {/* --- LOGIN CARD --- */}
            <div className="relative z-10 w-full max-w-sm p-8 rounded-3xl bg-[#0f172a]/90 backdrop-blur-md border border-blue-500/50 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]">
                
                {/* 1. LOGO ATAS */}
                <div className="flex flex-col items-center mb-6 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/40">
                        <span className="text-3xl font-bold text-white">C</span>
                    </div>
                    <h1 className="text-xl font-bold text-white leading-snug">
                        Selamat Datang di <br />
                        Dashboard <br />
                        Monitoring Tiket MS <br />
                        & SQUAT
                    </h1>
                    <p className="mt-2 text-xs text-slate-400">Masuk ke akun Anda</p>
                </div>

                {/* 2. FORM INPUT */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded bg-red-500/20 p-2 text-center text-xs text-red-200 border border-red-500/50">
                            {error}
                        </div>
                    )}

                    {/* Username Input - Background Kuning Muda sesuai gambar */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <FaUser className="text-slate-500/70" />
                        </div>
                        <input
                            type="text"
                            name="username"
                            required
                            placeholder="Username"
                            className="block w-full rounded-lg border-none bg-[#fff9c4] py-3 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                            onChange={handleChange}
                        />
                    </div>

                    {/* Password Input - Background Kuning Muda */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <FaLock className="text-slate-500/70 text-xs" /> {/* Icon kunci sedikit lebih kecil */}
                            <span className="text-[10px] text-slate-500 ml-0.5">●●●</span> 
                        </div>
                        <input
                            type="password"
                            name="password"
                            required
                            placeholder="Password"
                            className="block w-full rounded-lg border-none bg-[#fff9c4] py-3 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                            onChange={handleChange}
                        />
                    </div>

                    {/* Tombol Masuk */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-6 w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition-all transform hover:scale-[1.02]"
                    >
                        {loading ? <FaSpinner className="animate-spin mx-auto" /> : 'Masuk'}
                    </button>
                </form>

                {/* 3. FOOTER LINKS */}
                <div className="mt-6 text-center space-y-4">
                    <a href="https://t.me/vandiza" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        Lupa Kata Sandi?
                    </a>

                    <div className="text-[10px] text-slate-400 leading-relaxed px-4">
                        Kendala login atau butuh akun baru? <br />
                        Hubungi Admin via <a href="https://t.me/vandiza" className="text-blue-400 hover:underline inline-flex items-center gap-1">Telegram</a>.
                    </div>

                    <div className="border-t border-slate-700/50 pt-4 mt-4">
                        <p className="text-[10px] text-slate-500">Created by Tubagus Paradisa</p>
                    </div>
                </div>
            </div>
        </div>
    );
}