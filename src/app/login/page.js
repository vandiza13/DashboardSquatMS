'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaEye, FaEyeSlash, FaLock, FaUser, FaTelegramPlane, FaBroadcastTower } from 'react-icons/fa';
import { HiSun, HiMoon } from 'react-icons/hi2';
import { useTheme } from '@/context/ThemeContext';

// ─── SUBTLE PARTICLE OVERLAY ───────────────────────────────────────────
function ParticleOverlay({ theme }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        
        let width, height;
        const particles = [];

        const initScene = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;

            // Generate Particles (Dust / Tiny Signals)
            particles.length = 0;
            const numParticles = Math.floor((width * height) / 12000);
            for (let i = 0; i < numParticles; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: Math.random() * 1.5 + 0.5,
                    speedY: -Math.random() * 0.3 - 0.1,
                    speedX: (Math.random() - 0.5) * 0.2,
                    opacity: Math.random() * 0.5 + 0.1,
                    wobbleSpeed: Math.random() * 0.02 + 0.01,
                    wobblePhase: Math.random() * Math.PI * 2,
                });
            }
        };

        initScene();
        window.addEventListener('resize', initScene);

        let time = 0;
        const animate = () => {
            time += 1;
            ctx.clearRect(0, 0, width, height);

            // In light mode, particles are a bit darker/blue, in dark mode they are light blue/glowing
            const isDark = theme === 'dark';
            const baseColor = isDark ? '147, 197, 253' : '37, 99, 235'; 

            particles.forEach(p => {
                p.y += p.speedY;
                p.x += p.speedX + Math.sin(time * p.wobbleSpeed + p.wobblePhase) * 0.2;

                if (p.y < -10) p.y = height + 10;
                if (p.x < -10) p.x = width + 10;
                if (p.x > width + 10) p.x = -10;

                const flicker = 0.7 + 0.3 * Math.sin(time * 0.05 + p.wobblePhase);
                ctx.fillStyle = `rgba(${baseColor}, ${p.opacity * flicker})`;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                
                if (p.size > 1.2 && isDark) {
                    ctx.shadowColor = `rgba(${baseColor}, 0.4)`;
                    ctx.shadowBlur = 4;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', initScene);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [theme]);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none ${theme === 'dark' ? 'mix-blend-screen' : 'mix-blend-multiply opacity-50'}`}
            style={{ zIndex: 1 }}
        />
    );
}

// ─── LOGIN PAGE ────────────────────────────────────────────────────────
export default function LoginPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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

    // Fallback UI to prevent hydration mismatch before theme context is available
    if (!mounted) return <div className="min-h-screen bg-slate-900"></div>;

    const isDark = theme === 'dark';

    return (
        <div className={`min-h-screen flex items-center justify-center lg:justify-end lg:pr-[12%] relative overflow-hidden transition-colors duration-700 ${isDark ? 'bg-[#040810]' : 'bg-blue-50'}`}>
            
            {/* 1. Static Photo Background (Day/Night transition) */}
            <div className="absolute inset-0 z-0">
                {/* Dark Mode Background */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
                    <Image
                        src="/bg-tower-night-final.jpg"
                        alt="BTS Tower Night"
                        fill
                        priority
                        quality={100}
                        className="object-cover object-center"
                    />
                </div>
                {/* Light Mode Background */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${isDark ? 'opacity-0' : 'opacity-100'}`}>
                    <Image
                        src="/bg-tower-day-final.jpg"
                        alt="BTS Tower Day"
                        fill
                        priority
                        quality={100}
                        className="object-cover object-center"
                    />
                </div>
            </div>

            {/* 1.5 Cinematic Sun Animation (Super Smooth GPU-Accelerated Sunrise & Sunset) */}
            {/* Kontainer dengan Masking Horizon agar matahari "terpotong" dan terlihat tenggelam di balik bukit belakang */}
            <div 
                className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
                style={{ 
                    WebkitMaskImage: 'linear-gradient(to bottom, black 59%, transparent 62%)', 
                    maskImage: 'linear-gradient(to bottom, black 59%, transparent 62%)' 
                }}
            >
                <div 
                    className={`absolute top-[15%] left-[25%] transition-all duration-[3000ms] ease-in-out ${
                        isDark 
                        ? 'translate-y-[80vh] -translate-x-[20vw] scale-50 opacity-0' 
                        : 'translate-y-0 translate-x-0 scale-100 opacity-100'
                    }`}
                >
                    {/* Sun Core (Berubah warna: Oranye saat di ufuk, Putih saat di atas) */}
                    <div 
                        className={`absolute -ml-12 -mt-12 w-24 h-24 rounded-full blur-[2px] transition-colors duration-[3000ms] ${
                            isDark 
                            ? 'bg-orange-500 shadow-[0_0_100px_50px_rgba(255,100,0,1)]' 
                            : 'bg-white shadow-[0_0_120px_50px_rgba(255,255,220,1)]'
                        }`} 
                    />
                    
                    {/* Sun Glow */}
                    <div 
                        className={`absolute -ml-32 -mt-32 w-64 h-64 rounded-full mix-blend-screen transition-opacity duration-[3000ms] blur-[50px] ${
                            isDark ? 'bg-orange-400 opacity-0' : 'bg-yellow-200 opacity-60'
                        }`} 
                    />
                    
                    {/* Lens Flare (Cahaya menyebar) */}
                    <div 
                        className={`absolute -ml-64 -mt-64 w-[32rem] h-[32rem] rounded-full mix-blend-screen transition-opacity duration-[3000ms] blur-[100px] ${
                            isDark ? 'bg-red-500 opacity-0' : 'bg-orange-200 opacity-30'
                        }`} 
                    />
                </div>
            </div>
            
            {/* 2. Overlays (Dibuat sangat transparan agar gambar asli terlihat jelas) */}
            <div className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-1000 ${
                isDark 
                ? 'bg-gradient-to-t from-black/50 via-black/20 to-transparent' 
                : 'bg-gradient-to-t from-white/10 to-transparent'
            }`} />
            
            {isDark && <div className="absolute inset-0 z-0 bg-blue-900/10 mix-blend-overlay pointer-events-none" />}

            {/* 3. Subtle Particle Animation */}
            <ParticleOverlay theme={theme} />

            {/* Theme Toggle Button */}
            <div className="absolute top-6 right-6 z-20">
                <button
                    onClick={toggleTheme}
                    aria-label="Toggle tema"
                    className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border border-white/40 dark:border-slate-700/50 text-slate-700 dark:text-blue-100 hover:text-blue-600 dark:hover:text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 group overflow-hidden"
                >
                    <HiSun
                        size={24}
                        className={`absolute transition-all duration-500 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`}
                    />
                    <HiMoon
                        size={22}
                        className={`absolute transition-all duration-500 ${!isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}
                    />
                </button>
            </div>

            {/* Login Card */}
            <div
                className={`w-full max-w-[420px] relative z-10 mx-4 transition-all duration-1000 ease-out translate-y-0 scale-100`}
            >
                <div className={`relative rounded-3xl overflow-hidden backdrop-blur-xl border shadow-2xl transition-all duration-700 ${
                    isDark 
                    ? 'bg-slate-900/70 border-slate-700/50 shadow-black/50' 
                    : 'bg-white/70 border-white shadow-blue-900/10'
                }`}>
                    
                    {/* Header Section */}
                    <div className="relative px-8 pt-10 pb-6 text-center">
                        <div className="relative z-10">
                            <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
                                <FaBroadcastTower className="text-white text-2xl" />
                            </div>
                            <h2 className={`text-2xl font-black tracking-wide ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                WELCOME BACK!
                            </h2>
                            <p className={`text-sm mt-1.5 font-medium ${isDark ? 'text-slate-300/80' : 'text-slate-500'}`}>
                                Sign in to Dashboard SQUAT & MS
                            </p>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="px-8 pb-10">
                        {error && (
                            <div className="mb-6 p-3 rounded-xl bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-bold text-center flex items-center justify-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Username Field */}
                            <div className="space-y-1.5">
                                <label className={`text-[11px] font-bold uppercase tracking-wider ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Username</label>
                                <div className="relative group">
                                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-600'}`}>
                                        <FaUser size={14} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border outline-none transition-all duration-300 text-sm font-semibold ${
                                            isDark 
                                            ? 'border-slate-700/60 bg-slate-800/40 focus:bg-slate-800/80 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 text-white placeholder:text-slate-500' 
                                            : 'border-slate-200 bg-white/60 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder:text-slate-400'
                                        }`}
                                        placeholder="Enter your username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <label className={`text-[11px] font-bold uppercase tracking-wider ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Password</label>
                                <div className="relative group">
                                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-600'}`}>
                                        <FaLock size={14} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className={`w-full pl-11 pr-12 py-3.5 rounded-xl border outline-none transition-all duration-300 text-sm font-semibold ${
                                            isDark 
                                            ? 'border-slate-700/60 bg-slate-800/40 focus:bg-slate-800/80 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 text-white placeholder:text-slate-500' 
                                            : 'border-slate-200 bg-white/60 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder:text-slate-400'
                                        }`}
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer transition-colors ${isDark ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-600'}`}
                                        tabIndex="-1"
                                    >
                                        {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative group mt-4 overflow-hidden rounded-xl"
                            >
                                <div className="relative bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30">
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        'Login to Dashboard'
                                    )}
                                </div>
                            </button>
                        </form>

                        {/* Telegram Contact */}
                        <div className={`mt-8 pt-5 border-t text-center ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                            <p className={`text-[11px] font-medium mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Kendala login atau butuh akun baru?</p>
                            <a
                                href="https://t.me/vandiza"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-2 text-xs font-bold transition-all duration-300 px-4 py-2 rounded-full border ${
                                    isDark 
                                    ? 'text-blue-400 hover:text-white bg-slate-800/50 hover:bg-blue-600/20 border-slate-700/50 hover:border-blue-500/50' 
                                    : 'text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border-blue-100 hover:border-blue-600'
                                }`}
                            >
                                <FaTelegramPlane className="text-sm" /> Hubungi Admin via Telegram
                            </a>
                        </div>
                    </div>

                    {/* Footer Credit */}
                    <div className={`p-3 text-center border-t ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>
                        <p className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            &copy; {new Date().getFullYear()} Dashboard Squat & MS.
                            <span className="mx-2 opacity-30">|</span>
                            Developed by <a href="https://www.vandiza.my.id" target="_blank" rel="noopener noreferrer" className={`font-bold transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>Vandiza</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}