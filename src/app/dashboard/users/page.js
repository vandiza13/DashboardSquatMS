'use client';

import { useState, useEffect } from 'react';
import {
    FaUserPlus,
    FaTrash,
    FaKey,
    FaEdit,         // Icon Edit Baru
    FaShieldAlt,
    FaSpinner,
    FaUserCircle,
    FaEye,
    FaTelegramPlane, // Tambahan icon telegram
    FaHardHat
} from 'react-icons/fa';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // State Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE', 'EDIT', 'RESET'
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({ username: '', full_name: '', display_name: '', password: '', role: 'User', division: 'SQUAT' });
    const [nameSuggestions, setNameSuggestions] = useState([]);

    const handleFullNameChange = (val) => {
        setFormData(prev => {
            const updated = { ...prev, full_name: val };
            
            const words = val.trim().split(/\s+/).filter(Boolean);
            if (words.length > 1) {
                const firstWord = words[0];
                const lastWord = words[words.length - 1];
                const uniqueSug = Array.from(new Set([val.trim(), firstWord, lastWord]));
                setNameSuggestions(uniqueSug);
                
                // Auto-fill display_name if it is currently empty
                if (!prev.display_name) {
                    updated.display_name = firstWord;
                }
            } else {
                setNameSuggestions([]);
                if (!prev.display_name) {
                    updated.display_name = val.trim();
                }
            }
            
            return updated;
        });
    };

    // --- FETCH DATA ---
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                const err = await res.json();
                alert('Gagal fetch users: ' + (err.error || err.details || 'Unknown'));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // --- HANDLER ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            let url = '/api/users';
            let method = 'POST';
            let body = formData;

            // Mode EDIT (Ganti Role / Divisi / Detail)
            if (modalMode === 'EDIT') {
                url = `/api/users/${selectedUser.id}`;
                method = 'PUT';
                body = { 
                    role: formData.role, 
                    division: formData.division,
                    full_name: formData.full_name,
                    display_name: formData.display_name
                };
            }
            // Mode RESET PASSWORD
            else if (modalMode === 'RESET') {
                url = `/api/users/${selectedUser.id}`;
                method = 'PUT';
                body = { password: formData.password };
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            alert(result.message);
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus user ini?')) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) fetchUsers();
            else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (error) {
            alert('Gagal hapus');
        }
    };

    const handleRegisterWebhook = async () => {
        if (!confirm('Apakah Anda yakin ingin mendaftarkan URL Webhook Telegram saat ini?')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/telegram/register-webhook', { method: 'POST' });
            const result = await res.json();
            if (res.ok) {
                alert('✅ ' + result.message);
            } else {
                alert('❌ Gagal: ' + result.error);
            }
        } catch (error) {
            alert('❌ Terjadi kesalahan pada server');
        } finally {
            setLoading(false);
        }
    };

    // --- MODAL TRIGGERS ---
    const openCreateModal = () => {
        setModalMode('CREATE');
        setFormData({ username: '', full_name: '', display_name: '', password: '', role: 'User', division: 'SQUAT' });
        setNameSuggestions([]);
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setModalMode('EDIT');
        setSelectedUser(user);
        setFormData({ 
            username: user.username, 
            full_name: user.full_name || '', 
            display_name: user.display_name || '', 
            password: '', 
            role: user.role, 
            division: user.division || 'SQUAT' 
        });
        const words = (user.full_name || '').trim().split(/\s+/).filter(Boolean);
        if (words.length > 1) {
            const uniqueSug = Array.from(new Set([(user.full_name || '').trim(), words[0], words[words.length - 1]]));
            setNameSuggestions(uniqueSug);
        } else {
            setNameSuggestions([]);
        }
        setIsModalOpen(true);
    };

    const openResetModal = (user) => {
        setModalMode('RESET');
        setSelectedUser(user);
        setFormData({ username: user.username, full_name: '', display_name: '', password: '', role: '', division: '' });
        setNameSuggestions([]);
        setIsModalOpen(true);
    };

    // --- HELPER UI ---
    const getRoleBadge = (role) => {
        switch (role) {
            case 'SuperAdmin': return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"><FaShieldAlt /> Super Admin</span>;
            case 'Admin': return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100"><FaShieldAlt /> Administrator</span>;
            case 'Teknisi': return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700/50"><FaHardHat /> Teknisi</span>;
            case 'View': return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><FaEye /> View Only</span>;
            default: return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100"><FaUserCircle /> User Staff</span>;
        }
    };

    const getDivisionBadge = (div) => {
        if (div === 'ALL') return <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">ALL</span>;
        if (div === 'SQUAT') return <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">SQUAT</span>;
        if (div === 'MS') return <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">MS</span>;
        return <span className="text-xs">{div || '-'}</span>;
    };

    // Judul Modal Dinamis
    const getModalTitle = () => {
        if (modalMode === 'CREATE') return 'Tambah Pengguna Baru';
        if (modalMode === 'EDIT') return 'Edit Akses Pengguna';
        return 'Reset Password';
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Manajemen Pengguna</h2>
                    <p className="text-[var(--text-muted)] mt-1">Kontrol akses (SuperAdmin, Admin, User Staff, Teknisi, View Only)</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleRegisterWebhook} className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition-all hover:bg-sky-600 hover:scale-105 active:scale-95">
                        <FaTelegramPlane className="text-lg" /> Setup Bot Webhook
                    </button>
                    <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95">
                        <FaUserPlus /> Tambah User
                    </button>
                </div>
            </div>

            <div className="rounded-2xl bg-[var(--bg-surface)] shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--bg-base)] border-b border-[var(--border-subtle)] text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                                <th className="px-6 py-5">Username</th>
                                <th className="px-6 py-5">Role Akses</th>
                                <th className="px-6 py-5">Divisi</th>
                                <th className="px-6 py-5 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {loading ? (
                                <tr><td colSpan="3" className="p-10 text-center text-[var(--text-muted)]"><FaSpinner className="animate-spin text-2xl mx-auto mb-2" />Memuat data...</td></tr>
                            ) : users.map((u) => (
                                <tr key={u.id} className="group hover:bg-[var(--bg-base)] transition-colors duration-200">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-[var(--bg-base)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                <FaUserCircle className="text-xl" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[var(--text-primary)]">{u.display_name || u.username}</p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {u.full_name && `${u.full_name} | `}Username/NIK: {u.username} | ID: #{u.id}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                                    <td className="px-6 py-4">{getDivisionBadge(u.division)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">

                                            {/* HANYA TAMPILKAN TOMBOL EDIT JIKA BUKAN ID 1 */}
                                            {u.id !== 1 && (
                                                <button onClick={() => openEditModal(u)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100">
                                                    <FaEdit /> Edit
                                                </button>
                                            )}

                                            {/* Tombol Reset Password tetap boleh untuk ID 1 (misal lupa password) */}
                                            <button onClick={() => openResetModal(u)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-100">
                                                <FaKey /> Reset
                                            </button>

                                            {/* HANYA TAMPILKAN TOMBOL HAPUS JIKA BUKAN ID 1 */}
                                            {u.id !== 1 && (
                                                <button onClick={() => handleDelete(u.id)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100">
                                                    <FaTrash /> Hapus
                                                </button>
                                            )}

                                            {/* Tanda Pengaman untuk ID 1 */}
                                            {u.id === 1 && (
                                                <span className="text-[10px] text-[var(--text-muted)] font-bold bg-[var(--bg-base)] border border-[var(--border-color)] px-2 py-1 rounded">LOCKED</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm p-4 transition-all">
                    <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden transform scale-100 transition-transform">
                        <div className="bg-[var(--bg-base)] px-6 py-4 border-b border-[var(--border-subtle)] flex justify-between items-center">
                            <h3 className="font-bold text-[var(--text-primary)]">{getModalTitle()}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-red-500">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">

                            {/* Input Username (Disabled saat Edit/Reset) */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Username / NIK</label>
                                <input
                                    type="text"
                                    required
                                    disabled={modalMode !== 'CREATE'}
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full rounded-lg bg-[var(--bg-base)] border-[var(--border-color)] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all p-2.5 text-sm disabled:opacity-50 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                                    placeholder="Masukkan username atau NIK..."
                                />
                            </div>

                            {/* Input Nama Lengkap & Nama Tampilan (Tampil saat CREATE atau EDIT) */}
                            {(modalMode === 'CREATE' || modalMode === 'EDIT') && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Nama Lengkap</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.full_name}
                                            onChange={e => handleFullNameChange(e.target.value)}
                                            className="w-full rounded-lg bg-[var(--bg-base)] border-[var(--border-color)] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all p-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                                            placeholder="Contoh: Ahmad Syarifudin Jamil"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Nama Tampilan (Name on Display)</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.display_name}
                                            onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                                            className="w-full rounded-lg bg-[var(--bg-base)] border-[var(--border-color)] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all p-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                                            placeholder="Nama panggilan untuk update tiket..."
                                        />
                                        {/* Auto suggestions if full name has multiple words */}
                                        {nameSuggestions.length > 0 && (
                                            <div className="flex gap-2 mt-2 items-center flex-wrap">
                                                <span className="text-[10px] text-[var(--text-muted)] font-semibold">Saran:</span>
                                                {nameSuggestions.map((sug, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, display_name: sug }))}
                                                        className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-100 transition-colors border border-blue-200 dark:border-blue-800/40 font-medium"
                                                    >
                                                        {sug}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Input Role (Tampil saat CREATE atau EDIT) */}
                            {(modalMode === 'CREATE' || modalMode === 'EDIT') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Role Akses</label>
                                        <select
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full rounded-lg bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-primary)] p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="Admin" className="bg-[var(--bg-base)] text-[var(--text-primary)]">Administrator</option>
                                            <option value="User" className="bg-[var(--bg-base)] text-[var(--text-primary)]">User (Staff)</option>
                                            <option value="Teknisi" className="bg-[var(--bg-base)] text-[var(--text-primary)]">Teknisi</option>
                                            <option value="View" className="bg-[var(--bg-base)] text-[var(--text-primary)]">View Only</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Divisi</label>
                                        <select
                                            value={formData.division}
                                            onChange={e => setFormData({ ...formData, division: e.target.value })}
                                            className="w-full rounded-lg bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-primary)] p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="ALL" className="bg-[var(--bg-base)] text-[var(--text-primary)]">ALL (Global)</option>
                                            <option value="SQUAT" className="bg-[var(--bg-base)] text-[var(--text-primary)]">SQUAT (TSEL)</option>
                                            <option value="MS" className="bg-[var(--bg-base)] text-[var(--text-primary)]">MS (MTEL/UMT/FSI)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Input Password (Tampil saat CREATE atau RESET) */}
                            {(modalMode === 'CREATE' || modalMode === 'RESET') && (
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">
                                        {modalMode === 'CREATE' ? 'Password' : 'Password Baru'}
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full rounded-lg bg-[var(--bg-base)] border-[var(--border-color)] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all p-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)] mt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--text-muted)]">Batal</button>
                                <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}