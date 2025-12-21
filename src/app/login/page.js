'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEye, FaEyeSlash, FaLock, FaUser, FaTelegramPlane } from 'react-icons/fa';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Login gagal');
            router.push('/dashboard');
            router.refresh(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 relative overflow-hidden">
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

            <div className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden relative z-10 mx-4">
                <div className="bg-slate-900 px-8 py-10 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none" />
                    <h2 className="text-3xl font-extrabold text-white tracking-wide relative z-10">WELCOME BACK!</h2>
                    <p className="text-slate-400 text-sm mt-2 relative z-10">Sign in to Dashboard SQUAT & MS</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold text-center animate-pulse flex items-center justify-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors"><FaUser /></div>
                                <input type="text" required className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium text-slate-700" placeholder="Masukkan username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors"><FaLock /></div>
                                <input type={showPassword ? "text" : "password"} required className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium text-slate-700" placeholder="Masukkan password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-blue-600 transition-colors" tabIndex="-1">
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 disabled:opacity-50 mt-2">
                            {loading ? 'Memproses...' : 'Masuk Dashboard'}
                        </button>
                    </form>
                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400 mb-2 font-medium">Kendala login atau butuh akun baru?</p>
                        <a href="https://t.me/USERNAME_ADMIN_DISINI" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full border border-blue-100">
                            <FaTelegramPlane className="text-lg" /> Hubungi Admin via Telegram
                        </a>
                    </div>
                </div>

                {/* --- CREDIT OPSI 2 (LINKED) --- */}
                <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-medium">
                        &copy; {new Date().getFullYear()} Dashboard Squat & MS. 
                        <span className="mx-1">•</span> 
                        Developed by <a href="https://www.vandiza.my.id" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:text-blue-800 transition-colors">Vandiza</a>
                    </p>
                </div>
            </div>
        </div>
    );
}