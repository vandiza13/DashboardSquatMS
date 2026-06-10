// src/components/BulkTicketModal.js
'use client';

import { useState } from 'react';
import { FaTimes, FaFileUpload, FaDownload, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function BulkTicketModal({ isOpen, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);

    if (!isOpen) return null;

    // 1. [PERBAIKAN] Fungsi Download Template dengan Kolom Baru
    const handleDownloadTemplate = () => {
        const template = [
            {
                "ID Tiket": "TIKET-001",
                "Kategori": "SQUAT",
                "Sub Kategori": "TSEL",
                "STO": "BBL",
                "Branch": "KARAWANG",
                "Priority (SQUAT Only)": "CRITICAL",
                "ID TACC (Non-SQUAT)": "",
                "Waktu Tiket (YYYY-MM-DD HH:MM)": "2024-01-29 10:00",
                "Deskripsi": "Deskripsi masalah..."
            },
            {
                "ID Tiket": "TIKET-002",
                "Kategori": "MTEL",
                "Sub Kategori": "TIS",
                "STO": "",
                "Branch": "",
                "Priority (SQUAT Only)": "",
                "ID TACC (Non-SQUAT)": "TACC-12345",
                "Waktu Tiket (YYYY-MM-DD HH:MM)": "2024-01-29 11:30",
                "Deskripsi": "Power down di site X"
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Template_Import_Tiket_Lengkap.xlsx");
    };

    // 2. Fungsi Baca File Excel
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        const reader = new FileReader();

        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            setPreviewData(data);
            setUploadResult(null);
        };
        reader.readAsBinaryString(selectedFile);
    };

    // 3. Submit ke API
    const handleUpload = async () => {
        if (previewData.length === 0) return;
        setIsUploading(true);

        try {
            // [PERBAIKAN] Mapping Data Excel ke Format Database (Termasuk Priority & TACC)
            const formattedData = previewData.map(row => ({
                id_tiket: row['ID Tiket'],
                category: row['Kategori'],
                subcategory: row['Sub Kategori'],
                sto: row['STO'],
                // Mapping Kolom Baru
                branch: row['Branch'] || null,
                priority: row['Priority (SQUAT Only)'] || null,
                id_tiket_tacc: row['ID TACC (Non-SQUAT)'] || null,

                // Handle tanggal
                tiket_time: row['Waktu Tiket (YYYY-MM-DD HH:MM)'] || new Date().toISOString(),
                deskripsi: row['Deskripsi']
            }));

            const res = await fetch('/api/tickets/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickets: formattedData })
            });

            const result = await res.json();

            if (res.ok) {
                setUploadResult({ success: true, ...result });
                if (result.details.failed === 0) {
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                        setFile(null);
                        setPreviewData([]);
                        setUploadResult(null);
                    }, 2000);
                }
            } else {
                throw new Error(result.error || 'Gagal upload');
            }
        } catch (error) {
            setUploadResult({ success: false, message: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface-2)] shrink-0">
                    <h3 className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
                        <FaFileUpload className="text-blue-600 dark:text-blue-400" /> Import Tiket (Excel)
                    </h3>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-red-500 transition">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">

                    {/* Step 1: Download Template */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                        <div className="text-sm text-blue-800 dark:text-blue-300">
                            <p className="font-bold">Belum punya format?</p>
                            <p className="text-xs opacity-80">Download template terbaru (Updated Priority & TACC).</p>
                        </div>
                        <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold shadow-sm border border-blue-200 dark:border-blue-700 hover:opacity-80 transition">
                            <FaDownload /> Download Template
                        </button>
                    </div>

                    {/* Step 2: Upload File */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Upload File Excel (.xlsx)</label>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-[var(--text-secondary)]
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-xs file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                dark:file:bg-blue-900/30 dark:file:text-blue-300
                                hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50
                            "
                        />
                    </div>

                    {/* Preview Info */}
                    {previewData.length > 0 && (
                        <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-color)]">
                            <p className="font-bold">File Terbaca:</p>
                            <p>Total Data: <b>{previewData.length}</b> tiket siap diimport.</p>
                        </div>
                    )}

                    {/* Result Feedback */}
                    {uploadResult && (
                        <div className={`p-3 rounded-lg text-xs border ${uploadResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                            <p className="font-bold flex items-center gap-2">
                                {uploadResult.success ? <FaCheckCircle /> : <FaExclamationTriangle />}
                                {uploadResult.message || uploadResult.error}
                            </p>
                            {uploadResult.details?.errors?.length > 0 && (
                                <ul className="mt-2 list-disc list-inside opacity-80 max-h-20 overflow-y-auto">
                                    {uploadResult.details.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-[var(--bg-surface-2)] border-t border-[var(--border-color)] flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-base)] transition">
                        Batal
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || previewData.length === 0 || isUploading}
                        className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition disabled:opacity-70 flex items-center gap-2"
                    >
                        {isUploading ? <FaSpinner className="animate-spin" /> : <FaFileUpload />}
                        {isUploading ? 'Mengupload...' : 'Upload Sekarang'}
                    </button>
                </div>
            </div>
        </div>
    );
}