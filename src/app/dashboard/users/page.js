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
    FaEye 
} from 'react-icons/fa';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE', 'EDIT', 'RESET'
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({ username: '', password: '', role: 'User' });

    // --- FETCH DATA ---
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
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

            // Mode EDIT (Ganti Role)
            if (modalMode === 'EDIT') {
                url = `/api/users/${selectedUser.id}`;
                method = 'PUT';
                body = { role: formData.role }; // Hanya kirim role
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
        if(!confirm('Yakin ingin menghapus user ini?')) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if(res.ok) fetchUsers();
            else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (error) {
            alert('Gagal hapus');
        }
    };

    // --- MODAL TRIGGERS ---
    const openCreateModal = () => {
        setModalMode('CREATE');
        setFormData({ username: '', password: '', role: 'User' });
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setModalMode('EDIT');
        setSelectedUser(user);
        // Password dikosongkan karena tidak diedit disini
        setFormData({ username: user.username, password: '', role: user.role }); 
        setIsModalOpen(true);
    };

    const openResetModal = (user) => {
        setModalMode('RESET');
        setSelectedUser(user);
        setFormData({ username: user.username, password: '', role: '' });
        setIsModalOpen(true);
    };

    // --- HELPER UI ---
    const getRoleBadge = (role) => {
        switch (role) {
            case 'Admin': return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100"><FaShieldAlt /> Administrator</span>;
            case 'View': return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><FaEye /> View Only</span>;
            default: return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100"><FaUserCircle /> User Staff</span>;
        }
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
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Manajemen Pengguna</h2>
                    <p className="text-slate-500 mt-1">Kontrol akses (Admin, User, View)</p>
                </div>
                <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95">
                    <FaUserPlus /> Tambah User
                </button>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="px-6 py-5">Username</th>
                                <th className="px-6 py-5">Role Akses</th>
                                <th className="px-6 py-5 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="3" className="p-10 text-center text-slate-400"><FaSpinner className="animate-spin text-2xl mx-auto mb-2"/>Memuat data...</td></tr>
                            ) : users.map((u) => (
                                <tr key={u.id} className="group hover:bg-slate-50/80 transition-colors duration-200">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                <FaUserCircle className="text-xl" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700">{u.username}</p>
                                                <p className="text-xs text-slate-400">ID: #{u.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
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
                                                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded">LOCKED</span>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-all">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-transform">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">{getModalTitle()}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            
                            {/* Input Username (Disabled saat Edit/Reset) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                <input 
                                    type="text" 
                                    required 
                                    disabled={modalMode !== 'CREATE'} 
                                    value={formData.username}
                                    onChange={e => setFormData({...formData, username: e.target.value})}
                                    className="w-full rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                                    placeholder="Masukkan username..."
                                />
                            </div>

                            {/* Input Role (Tampil saat CREATE atau EDIT) */}
                            {(modalMode === 'CREATE' || modalMode === 'EDIT') && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role Akses</label>
                                    <select 
                                        value={formData.role}
                                        onChange={e => setFormData({...formData, role: e.target.value})}
                                        className="w-full rounded-lg border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="Admin">Administrator (Full Akses)</option>
                                        <option value="User">User (Staff Teknisi)</option>
                                        <option value="View">View (Monitor Only)</option>
                                    </select>
                                </div>
                            )}

                            {/* Input Password (Tampil saat CREATE atau RESET) */}
                            {(modalMode === 'CREATE' || modalMode === 'RESET') && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        {modalMode === 'CREATE' ? 'Password' : 'Password Baru'}
                                    </label>
                                    <input 
                                        type="password" 
                                        required 
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        className="w-full rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all p-2.5 text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Batal</button>
                                <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}