'use client';

import { useState, useEffect } from 'react';
import { FaUserCircle, FaLock, FaSave, FaSpinner, FaCheckCircle } from 'react-icons/fa';

export default function ProfilePage() {
    // State Data Profil
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // State Form Password
    const [passData, setPassData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [loadingSave, setLoadingSave] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // 1. Fetch Data Profil saat Load
    useEffect(() => {
        fetch('/api/profile')
            .then(res => res.json())
            .then(data => {
                setProfile(data);
                setLoadingProfile(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingProfile(false);
            });
    }, []);

    // 2. Handle Ganti Password
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Validasi Frontend
        if (passData.newPassword !== passData.confirmNewPassword) {
            setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
            return;
        }
        if (passData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password baru minimal 6 karakter.' });
            return;
        }

        setLoadingSave(true);

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passData.currentPassword,
                    newPassword: passData.newPassword
                })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Gagal mengganti password');
            }

            // Sukses
            setMessage({ type: 'success', text: 'Password berhasil diubah!' });
            setPassData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });

        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoadingSave(false);
        }
    };

    if (loadingProfile) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <FaSpinner className="animate-spin text-4xl text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Profil Pengguna</h2>
                <p className="text-sm text-slate-500">Kelola informasi akun dan keamanan Anda</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* KARTU 1: INFO PROFIL */}
                <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
                    <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-5xl mb-4">
                        <FaUserCircle />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{profile?.username}</h3>
                    <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase border border-slate-200">
                        Role: {profile?.role}
                    </span>
                    <p className="mt-4 text-xs text-slate-400">
                        Bergabung sejak: <br/>
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                    </p>
                </div>

                {/* KARTU 2: GANTI PASSWORD */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                        <FaLock className="text-blue-600" />
                        <h3 className="font-bold text-slate-700">Ganti Password</h3>
                    </div>

                    {/* Alert Message */}
                    {message.text && (
                        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                            {message.type === 'success' && <FaCheckCircle />}
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password Saat Ini</label>
                            <input 
                                type="password" 
                                className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="Masukkan password lama..."
                                value={passData.currentPassword}
                                onChange={(e) => setPassData({...passData, currentPassword: e.target.value})}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password Baru</label>
                                <input 
                                    type="password" 
                                    className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="Minimal 6 karakter"
                                    value={passData.newPassword}
                                    onChange={(e) => setPassData({...passData, newPassword: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Konfirmasi Password Baru</label>
                                <input 
                                    type="password" 
                                    className="w-full rounded-lg border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ulangi password baru"
                                    value={passData.confirmNewPassword}
                                    onChange={(e) => setPassData({...passData, confirmNewPassword: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={loadingSave}
                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 disabled:opacity-50"
                            >
                                {loadingSave ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                Simpan Password
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
}