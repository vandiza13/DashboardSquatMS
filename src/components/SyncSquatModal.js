'use client';

import { useState } from 'react';
import { FaTimes, FaCloudUploadAlt, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaTrash, FaTerminal } from 'react-icons/fa';
import * as XLSX from 'xlsx';

// Helper untuk pencarian kolom secara fleksibel (case-insensitive & trim)
const findMatchingColumn = (row, candidates) => {
    if (!row) return null;
    const rowKeys = Object.keys(row);
    for (const cand of candidates) {
        const found = rowKeys.find(k => k.trim().toLowerCase() === cand.toLowerCase());
        if (found) return found;
    }
    return null;
};

// Konfigurasi kandidat nama kolom Simarvel / Insera
const SQUAT_COLUMN_CANDIDATES = {
    id: ['Incident', 'Incident ID', 'Incident_ID', 'ID Tiket', 'Ticket ID', 'No Tiket', 'id_tiket', 'Nomor TT'],
    ttr: ['TTR_Finale', 'TTR Finale', 'TTR', 'TTR_Customer', 'TTR Customer', 'ttr_finale', 'TTR NET (Jam)', 'TTR NET'],
    close_time: ['c_resolve_date', 'Resolve Date', 'c_resolve_time', 'c_close_date', 'Closed Date', 'Req Close', 'Req Close Time', 'Close Time', 'closed_at']
};

export default function SyncSquatModal({ isOpen, onClose, onSuccess }) {
    const [files, setFiles] = useState({
        TSEL: null,
        OLO: null
    });
    const [isUploading, setIsUploading] = useState(false);
    const [logs, setLogs] = useState([]);

    if (!isOpen) return null;

    const addLog = (type, message) => {
        const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
        setLogs(prev => [...prev, { time, type, message }]);
    };

    const handleFileChange = (e, category) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        updateFile(category, {
            file: selectedFile,
            name: selectedFile.name,
            previewData: [],
            status: 'reading',
            message: 'Membaca file...'
        });

        if (e.target) e.target.value = null; // reset input

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { raw: false });

                if (data.length === 0) {
                    updateFile(category, { status: 'error', message: 'File kosong.' });
                    return;
                }

                const firstRow = data[0];
                const idCol = findMatchingColumn(firstRow, SQUAT_COLUMN_CANDIDATES.id);
                const ttrCol = findMatchingColumn(firstRow, SQUAT_COLUMN_CANDIDATES.ttr);
                const closeTimeCol = findMatchingColumn(firstRow, SQUAT_COLUMN_CANDIDATES.close_time);

                if (!idCol || !ttrCol) {
                    const missing = [];
                    if (!idCol) missing.push("Incident / ID Tiket");
                    if (!ttrCol) missing.push("TTR_Finale / TTR");
                    updateFile(category, { status: 'error', message: `Kolom tidak ditemukan: ${missing.join(', ')}` });
                    return;
                }

                const mappedData = data
                    .filter(row => row[idCol])
                    .map(row => ({
                        id_tiket: String(row[idCol]).trim(),
                        ttr: row[ttrCol] !== undefined ? String(row[ttrCol]).trim() : '0',
                        close_time: closeTimeCol && row[closeTimeCol] ? String(row[closeTimeCol]).trim() : null
                    }));

                updateFile(category, { 
                    status: 'ready', 
                    previewData: mappedData, 
                    message: `${mappedData.length} Tiket siap di-sync` 
                });
            } catch (err) {
                updateFile(category, { status: 'error', message: "Bukan file excel valid." });
            }
        };
        reader.readAsBinaryString(selectedFile);
    };

    const updateFile = (category, data) => {
        setFiles(prev => ({
            ...prev,
            [category]: data ? { ...prev[category], ...data } : null
        }));
    };

    const handleUpload = async () => {
        const categoriesToUpload = Object.keys(files).filter(cat => files[cat] && (files[cat].status === 'ready' || files[cat].status === 'error_sync'));
        if (categoriesToUpload.length === 0) return;

        setIsUploading(true);
        setLogs([]);
        addLog('info', 'Memulai proses Sync SQUAT (Simarvel)...');

        let allSuccess = true;

        for (let i = 0; i < categoriesToUpload.length; i++) {
            const cat = categoriesToUpload[i];
            const fObj = files[cat];

            updateFile(cat, { status: 'uploading', message: 'Sinkronisasi...' });
            addLog('info', `Mengirim file SQUAT ${cat} (${fObj.name}) - Total ${fObj.previewData.length} baris...`);

            try {
                const BATCH_SIZE = 2500;
                const totalRows = fObj.previewData.length;
                let totalUpdated = 0;

                for (let b = 0; b < totalRows; b += BATCH_SIZE) {
                    const batch = fObj.previewData.slice(b, b + BATCH_SIZE);
                    const batchNum = Math.floor(b / BATCH_SIZE) + 1;
                    const totalBatches = Math.ceil(totalRows / BATCH_SIZE);

                    if (totalBatches > 1) {
                        addLog('info', `[${cat}] Memproses batch ${batchNum}/${totalBatches} (${batch.length} baris)...`);
                    }

                    const res = await fetch('/api/tickets/sync-squat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            category: cat,
                            data: batch
                        })
                    });

                    const text = await res.text();
                    let result;
                    try {
                        result = JSON.parse(text);
                    } catch (e) {
                        throw new Error(`Gagal respon server (${res.status}): Server timeout atau format respons bukan JSON.`);
                    }

                    if (res.ok) {
                        totalUpdated += (result.updated || 0);
                    } else {
                        throw new Error(result.error || "Gagal dari server.");
                    }
                }

                updateFile(cat, { status: 'success', message: 'Selesai!' });
                addLog('success', `[Sukses ${cat}] Sinkronisasi selesai! ${totalUpdated} tiket SQUAT CLOSED telah diperbarui nilainya.`);
            } catch (error) {
                allSuccess = false;
                updateFile(cat, { status: 'error_sync', message: 'Gagal upload' });
                addLog('error', `[Gagal ${cat}] ${error.message}`);
            }
        }

        addLog(allSuccess ? 'success' : 'warning', allSuccess ? 'Semua file berhasil disinkronisasi.' : 'Proses selesai, namun terdapat error.');
        setIsUploading(false);
        if (allSuccess) onSuccess();
    };

    const handleClose = () => {
        setFiles({ TSEL: null, OLO: null });
        setLogs([]);
        setIsUploading(false);
        onClose();
    };

    const hasFilesToUpload = Object.values(files).some(f => f && (f.status === 'ready' || f.status === 'error_sync'));
    const canUpload = hasFilesToUpload && !isUploading;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-3xl bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden flex flex-col max-h-[95vh]">
                
                <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-slate-900 dark:bg-slate-800 text-white shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-white">Bulk Sync SQUAT</h3>
                        <p className="text-[10px] text-slate-300 dark:text-slate-400 tracking-wider">Sync TTR & Closed Time tiket SQUAT dari Simarvel Insera</p>
                    </div>
                    <button onClick={handleClose} disabled={isUploading} className="text-slate-400 hover:text-red-400 transition disabled:opacity-50">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar bg-[var(--bg-base)]">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 p-3 rounded-lg text-xs text-red-700 dark:text-red-300">
                        <p className="font-bold mb-1">Catatan Penting:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                            <li>Upload file export Insera/Simarvel pada kolom yang sesuai (TSEL atau OLO).</li>
                            <li>Tiket yang cocok akan otomatis disinkronkan nilainya (TTR & Waktu Close) dan dipastikan berstatus <strong>CLOSED</strong>.</li>
                        </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['TSEL', 'OLO'].map((cat) => {
                            const fObj = files[cat];
                            
                            return (
                                <div key={cat} className="flex flex-col gap-2">
                                    <label className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            cat === 'TSEL' ? 'bg-red-500' : 'bg-orange-500'
                                        }`}></div>
                                        File SQUAT {cat}
                                    </label>

                                    {!fObj ? (
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                accept=".xlsx, .xls, .csv" 
                                                onChange={(e) => handleFileChange(e, cat)}
                                                className="hidden" 
                                                id={`upload-squat-${cat}`}
                                                disabled={isUploading}
                                            />
                                            <label 
                                                htmlFor={`upload-squat-${cat}`} 
                                                className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50 bg-[var(--bg-surface)] cursor-pointer rounded-xl transition-colors"
                                            >
                                                <FaCloudUploadAlt className="w-9 h-9 text-slate-400 dark:text-slate-500 mb-2" />
                                                <p className="text-xs font-semibold text-slate-500 text-center px-4">Pilih file SQUAT {cat}</p>
                                                <span className="text-[10px] text-slate-400 mt-1">Format: Insera Closed</span>
                                            </label>
                                        </div>
                                    ) : (
                                        <div className={`flex flex-col justify-between w-full h-36 border-2 border-solid rounded-xl p-3 bg-[var(--bg-surface)] ${
                                            fObj.status === 'success' ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/10' :
                                            fObj.status.includes('error') ? 'border-red-500/50 bg-red-50/50 dark:bg-red-900/10' :
                                            'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10'
                                        }`}>
                                            <div>
                                                <p className="text-sm font-bold text-[var(--text-primary)] truncate" title={fObj.name}>{fObj.name}</p>
                                                <div className="mt-1 flex items-center gap-1.5">
                                                    {fObj.status === 'reading' && <span className="text-xs text-yellow-500 flex items-center gap-1"><FaSpinner className="animate-spin"/> {fObj.message}</span>}
                                                    {fObj.status === 'error' && <span className="text-xs text-red-500 flex items-center gap-1" title={fObj.message}><FaExclamationTriangle/> {fObj.message}</span>}
                                                    {fObj.status === 'error_sync' && <span className="text-xs text-red-500 flex items-center gap-1" title={fObj.message}><FaExclamationTriangle/> {fObj.message}</span>}
                                                    {fObj.status === 'ready' && <span className="text-xs text-emerald-500 flex items-center gap-1"><FaCheckCircle/> {fObj.message}</span>}
                                                    {fObj.status === 'uploading' && <span className="text-xs text-blue-500 flex items-center gap-1"><FaSpinner className="animate-spin"/> {fObj.message}</span>}
                                                    {fObj.status === 'success' && <span className="text-xs text-emerald-600 flex items-center gap-1"><FaCheckCircle/> Selesai</span>}
                                                </div>
                                            </div>
                                            
                                            <div className="flex justify-end border-t border-[var(--border-subtle)] pt-2 mt-2">
                                                <button 
                                                    onClick={() => updateFile(cat, null)}
                                                    disabled={isUploading}
                                                    className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-30 transition flex items-center gap-1"
                                                >
                                                    <FaTrash /> Hapus & Ganti
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {logs.length > 0 && (
                        <div className="mt-4 bg-slate-900 rounded-xl p-3 border border-slate-700 shadow-inner flex flex-col h-40">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700 shrink-0">
                                <FaTerminal className="text-slate-400 text-xs" />
                                <span className="text-xs font-bold text-slate-300">Log Sinkronisasi</span>
                            </div>
                            <div className="overflow-y-auto flex-1 space-y-1.5 custom-scrollbar text-[11px] font-mono leading-relaxed px-1">
                                {logs.map((log, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <span className="text-slate-500 shrink-0">[{log.time}]</span>
                                        <span className={
                                            log.type === 'info' ? 'text-blue-300' :
                                            log.type === 'success' ? 'text-emerald-400' :
                                            log.type === 'warning' ? 'text-yellow-400' :
                                            'text-red-400 font-bold'
                                        }>
                                            {log.message}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                <div className="px-6 py-4 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] flex justify-between shrink-0">
                    <div className="flex items-center">
                         {logs.length > 0 && !isUploading && (
                             <span className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
                                 <FaCheckCircle className="text-emerald-500" /> Proses Selesai
                             </span>
                         )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleClose} disabled={isUploading} className="px-5 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-base)] rounded-lg transition border border-transparent hover:border-[var(--border-color)] disabled:opacity-50">
                            {logs.length > 0 && !isUploading ? 'Tutup' : 'Batal'}
                        </button>
                        <button 
                            onClick={handleUpload} 
                            disabled={!canUpload}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 text-white text-sm font-bold rounded-lg shadow-sm transition flex items-center gap-2"
                        >
                            {isUploading ? <FaSpinner className="animate-spin" /> : <FaCloudUploadAlt />}
                            {isUploading ? 'Menyinkronkan...' : 'Mulai Sync SQUAT'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
