'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaGlobe, FaServer, FaCodeBranch, FaHdd } from 'react-icons/fa';

export default function TselSiteFormModal({ isOpen, onClose, onSuccess, initialData }) {
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({
        site_id: '',
        site_name: '',
        latitude: '',
        longitude: '',
        site_class: '',
        branch: '',
        sto: '',
        metro: '',
        port_metro: '',
        akses: '',
        port_connection: '',
        ip_olt: '',
        gpon: '',
        port_gpon: '',
        ip_ont: '',
        sn_ont: '',
        ea_subrack_core: '',
        oa_subrack_core: '',
        site_name_odc: '',
        capacity_odc: '',
        bastray_feeder_odc: '',
        core_feeder_odc: '',
        bastray_distribusi: '',
        distribusi_core: '',
        latitude_odc: '',
        longitude_odc: '',
        site_name_odp: '',
        latitude_odp: '',
        longitude_odp: '',
        keterangan: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveTab('general');
            if (initialData) {
                setFormData({
                    site_id: initialData.site_id || '',
                    site_name: initialData.site_name || '',
                    latitude: initialData.latitude || '',
                    longitude: initialData.longitude || '',
                    site_class: initialData.site_class || '',
                    branch: initialData.branch || '',
                    sto: initialData.sto || '',
                    metro: initialData.metro || '',
                    port_metro: initialData.port_metro || '',
                    akses: initialData.akses || '',
                    port_connection: initialData.port_connection || '',
                    ip_olt: initialData.ip_olt || '',
                    gpon: initialData.gpon || '',
                    port_gpon: initialData.port_gpon || '',
                    ip_ont: initialData.ip_ont || '',
                    sn_ont: initialData.sn_ont || '',
                    ea_subrack_core: initialData.ea_subrack_core || '',
                    oa_subrack_core: initialData.oa_subrack_core || '',
                    site_name_odc: initialData.site_name_odc || '',
                    capacity_odc: initialData.capacity_odc || '',
                    bastray_feeder_odc: initialData.bastray_feeder_odc || '',
                    core_feeder_odc: initialData.core_feeder_odc || '',
                    bastray_distribusi: initialData.bastray_distribusi || '',
                    distribusi_core: initialData.distribusi_core || '',
                    latitude_odc: initialData.latitude_odc || '',
                    longitude_odc: initialData.longitude_odc || '',
                    site_name_odp: initialData.site_name_odp || '',
                    latitude_odp: initialData.latitude_odp || '',
                    longitude_odp: initialData.longitude_odp || '',
                    keterangan: initialData.keterangan || ''
                });
            } else {
                setFormData({
                    site_id: '',
                    site_name: '',
                    latitude: '',
                    longitude: '',
                    site_class: '',
                    branch: '',
                    sto: '',
                    metro: '',
                    port_metro: '',
                    akses: '',
                    port_connection: '',
                    ip_olt: '',
                    gpon: '',
                    port_gpon: '',
                    ip_ont: '',
                    sn_ont: '',
                    ea_subrack_core: '',
                    oa_subrack_core: '',
                    site_name_odc: '',
                    capacity_odc: '',
                    bastray_feeder_odc: '',
                    core_feeder_odc: '',
                    bastray_distribusi: '',
                    distribusi_core: '',
                    latitude_odc: '',
                    longitude_odc: '',
                    site_name_odp: '',
                    latitude_odp: '',
                    longitude_odp: '',
                    keterangan: ''
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const url = initialData ? `/api/tsel-sites/${initialData.id}` : '/api/tsel-sites';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan data');

            alert(initialData ? 'Data site berhasil diperbarui' : 'Site berhasil ditambahkan');
            onSuccess();
            onClose();
        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease_forwards] overflow-y-auto">
            <div className="w-full max-w-3xl bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto relative border border-[var(--border-color)]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface-2)]">
                    <div>
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">
                            {initialData ? `Edit Site: ${formData.site_id}` : 'Tambah Site TSEL Baru'}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Kelola data terintegrasi Supabase & Google Sheets</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-red-500 transition p-1.5 rounded-full hover:bg-[var(--bg-base)]">
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Tabs Selector */}
                <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-base)] overflow-x-auto no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all uppercase whitespace-nowrap ${
                            activeTab === 'general'
                                ? 'border-blue-500 text-blue-500 bg-[var(--bg-surface)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <FaGlobe size={13} /> General & GPS
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('backbone')}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all uppercase whitespace-nowrap ${
                            activeTab === 'backbone'
                                ? 'border-blue-500 text-blue-500 bg-[var(--bg-surface)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <FaServer size={13} /> Backbone & IP
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('subrack')}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all uppercase whitespace-nowrap ${
                            activeTab === 'subrack'
                                ? 'border-blue-500 text-blue-500 bg-[var(--bg-surface)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <FaHdd size={13} /> Core Subrack
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('odcodp')}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all uppercase whitespace-nowrap ${
                            activeTab === 'odcodp'
                                ? 'border-blue-500 text-blue-500 bg-[var(--bg-surface)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <FaCodeBranch size={13} /> ODC & ODP Fiber
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-4">
                        
                        {/* === TAB 1: GENERAL === */}
                        {activeTab === 'general' && (
                            <div className="space-y-4 animate-[fadeIn_0.2s_ease_forwards]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Site ID <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.site_id}
                                            onChange={e => setFormData({ ...formData, site_id: e.target.value })}
                                            placeholder="Contoh: BKS123"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Nama Site</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.site_name}
                                            onChange={e => setFormData({ ...formData, site_name: e.target.value })}
                                            placeholder="Contoh: Bekasi Cyber Park"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Site Class</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.site_class}
                                            onChange={e => setFormData({ ...formData, site_class: e.target.value })}
                                            placeholder="Contoh: DIAMOND, GOLD"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Branch</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.branch}
                                            onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                            placeholder="Contoh: Bekasi, Karawang"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">STO</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.sto}
                                            onChange={e => setFormData({ ...formData, sto: e.target.value })}
                                            placeholder="Contoh: CBR, BBL"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Latitude (Koordinat Site)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.latitude}
                                            onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                            placeholder="Contoh: -6.234900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Longitude (Koordinat Site)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.longitude}
                                            onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                            placeholder="Contoh: 106.989200"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Keterangan / Notes</label>
                                    <textarea
                                        rows="3"
                                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.keterangan}
                                        onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                                        placeholder="Keterangan tambahan..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* === TAB 2: BACKBONE & IP === */}
                        {activeTab === 'backbone' && (
                            <div className="space-y-4 animate-[fadeIn_0.2s_ease_forwards]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Metro Backbone</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.metro}
                                            onChange={e => setFormData({ ...formData, metro: e.target.value })}
                                            placeholder="Contoh: METRO-BKS-01"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Port Metro</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.port_metro}
                                            onChange={e => setFormData({ ...formData, port_metro: e.target.value })}
                                            placeholder="Contoh: 1/1/1"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Link Akses</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.akses}
                                            onChange={e => setFormData({ ...formData, akses: e.target.value })}
                                            placeholder="Contoh: PT2, GPON-OLT"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Port Connection</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.port_connection}
                                            onChange={e => setFormData({ ...formData, port_connection: e.target.value })}
                                            placeholder="Port ODF / Patchcord..."
                                        />
                                    </div>
                                </div>

                                <hr className="border-[var(--border-color)]" />
                                <h4 className="text-xs font-black text-blue-500 uppercase tracking-wide">OLT & GPON Routing</h4>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">IP OLT (Inet)</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                            value={formData.ip_olt}
                                            onChange={e => setFormData({ ...formData, ip_olt: e.target.value })}
                                            placeholder="Contoh: 10.23.4.1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">GPON / Subrack</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.gpon}
                                            onChange={e => setFormData({ ...formData, gpon: e.target.value })}
                                            placeholder="Contoh: GPON-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Port GPON</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.port_gpon}
                                            onChange={e => setFormData({ ...formData, port_gpon: e.target.value })}
                                            placeholder="Contoh: 1/1/2"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">IP ONT (Inet)</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                            value={formData.ip_ont}
                                            onChange={e => setFormData({ ...formData, ip_ont: e.target.value })}
                                            placeholder="Contoh: 10.23.4.200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">SN ONT</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                            value={formData.sn_ont}
                                            onChange={e => setFormData({ ...formData, sn_ont: e.target.value })}
                                            placeholder="Contoh: ZTEG12345678"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === TAB 3: SUBRACK === */}
                        {activeTab === 'subrack' && (
                            <div className="space-y-4 animate-[fadeIn_0.2s_ease_forwards]">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">EA Subrack Core (Equipment Address)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                        value={formData.ea_subrack_core}
                                        onChange={e => setFormData({ ...formData, ea_subrack_core: e.target.value })}
                                        placeholder="Contoh: Rack-01/Shelf-02/Slot-03"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">OA Subrack Core (Optical Address)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                        value={formData.oa_subrack_core}
                                        onChange={e => setFormData({ ...formData, oa_subrack_core: e.target.value })}
                                        placeholder="Optical Address Core ODF..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* === TAB 4: ODC & ODP === */}
                        {activeTab === 'odcodp' && (
                            <div className="space-y-6 animate-[fadeIn_0.2s_ease_forwards]">
                                
                                {/* SECTION ODC */}
                                <div className="space-y-4 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">Infrastruktur ODC (Optical Distribution Cabinet)</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Nama Site ODC</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.site_name_odc}
                                                onChange={e => setFormData({ ...formData, site_name_odc: e.target.value })}
                                                placeholder="Contoh: ODC-BKS-A"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Kapasitas ODC (Core)</label>
                                            <input
                                                type="number"
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.capacity_odc}
                                                onChange={e => setFormData({ ...formData, capacity_odc: e.target.value })}
                                                placeholder="Contoh: 144, 288"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Bastray Feeder ODC</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.bastray_feeder_odc}
                                                onChange={e => setFormData({ ...formData, bastray_feeder_odc: e.target.value })}
                                                placeholder="Keterangan Bastray Feeder..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Core Feeder ODC</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.core_feeder_odc}
                                                onChange={e => setFormData({ ...formData, core_feeder_odc: e.target.value })}
                                                placeholder="Detail Core..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Bastray Distribusi</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.bastray_distribusi}
                                                onChange={e => setFormData({ ...formData, bastray_distribusi: e.target.value })}
                                                placeholder="Bastray panel distribusi..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Distribusi Core</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.distribusi_core}
                                                onChange={e => setFormData({ ...formData, distribusi_core: e.target.value })}
                                                placeholder="Detail distribusi core..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Latitude ODC</label>
                                            <input
                                                type="number"
                                                step="any"
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.latitude_odc}
                                                onChange={e => setFormData({ ...formData, latitude_odc: e.target.value })}
                                                placeholder="Contoh: -6.234950"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Longitude ODC</label>
                                            <input
                                                type="number"
                                                step="any"
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.longitude_odc}
                                                onChange={e => setFormData({ ...formData, longitude_odc: e.target.value })}
                                                placeholder="Contoh: 106.989250"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION ODP */}
                                <div className="space-y-4 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                    <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Infrastruktur ODP (Optical Distribution Point)</h4>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Nama Site ODP</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.site_name_odp}
                                            onChange={e => setFormData({ ...formData, site_name_odp: e.target.value })}
                                            placeholder="Contoh: ODP-BKS-01"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Latitude ODP</label>
                                            <input
                                                type="number"
                                                step="any"
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.latitude_odp}
                                                onChange={e => setFormData({ ...formData, latitude_odp: e.target.value })}
                                                placeholder="Contoh: -6.235100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Longitude ODP</label>
                                            <input
                                                type="number"
                                                step="any"
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.longitude_odp}
                                                onChange={e => setFormData({ ...formData, longitude_odp: e.target.value })}
                                                placeholder="Contoh: 106.989400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-[var(--bg-surface-2)] border-t border-[var(--border-color)] flex justify-between items-center sticky bottom-0 z-10">
                        <div className="flex gap-1">
                            {activeTab !== 'general' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (activeTab === 'backbone') setActiveTab('general');
                                        else if (activeTab === 'subrack') setActiveTab('backbone');
                                        else if (activeTab === 'odcodp') setActiveTab('subrack');
                                    }}
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-base)] transition"
                                >
                                    Sebelumnya
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-base)] transition"
                            >
                                Batal
                            </button>

                            {activeTab !== 'odcodp' ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (activeTab === 'general') setActiveTab('backbone');
                                        else if (activeTab === 'backbone') setActiveTab('subrack');
                                        else if (activeTab === 'subrack') setActiveTab('odcodp');
                                    }}
                                    className="px-5 py-2 rounded-lg text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                                >
                                    Selanjutnya
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 rounded-lg text-xs font-black text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/25 transition disabled:opacity-75 flex items-center gap-1.5"
                                >
                                    {isSubmitting ? <FaSpinner className="animate-spin" /> : null}
                                    {initialData ? 'Simpan Perubahan' : 'Buat Site'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
