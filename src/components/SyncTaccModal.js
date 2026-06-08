'use client';

import { useState } from 'react';
import { FaTimes, FaCloudUploadAlt, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaListUl } from 'react-icons/fa';
import * as XLSX from 'xlsx';

// [UPDATE KONFIGURASI] Tambahkan "tiket_col" untuk mengambil ID internal (TR-xxx)
const HEADER_CONFIG = {
    UMT: { id_col: 'Nomor TT', ttr_col: 'TTR NET (Jam)', tiket_col: 'Tiket', close_time_col: 'Req Close' },
    MTEL: { id_col: 'Nomor TT', ttr_col: 'TTR NET (Jam)', tiket_col: 'Tiket', close_time_col: 'Req Close' },
    CENTRATAMA: { id_col: 'Nomor TT', ttr_col: 'TTR NET (Jam)', tiket_col: 'Tiket', close_time_col: 'Req Close' }
};

export default function SyncTaccModal({ isOpen, onClose, onSuccess }) {
    const [dataSource, setDataSource] = useState(''); 
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        
        if (!dataSource) {
            setErrorMsg("⚠️ Silakan pilih 'Sumber Data' terlebih dahulu sebelum upload file!");
            e.target.value = null; 
            return;
        }

        setFile(selectedFile);
        setErrorMsg('');
        setPreviewData([]);

        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws, { raw: false });

                    if (data.length === 0) {
                        setErrorMsg("File Excel kosong.");
                        return;
                    }

                    const config = HEADER_CONFIG[dataSource];
                    const firstRow = data[0];

                    if (!(config.id_col in firstRow) || !(config.ttr_col in firstRow) || !(config.tiket_col in firstRow) || !(config.close_time_col in firstRow)) {
                        setErrorMsg(`Format Excel salah untuk ${dataSource}! Pastikan ada kolom '${config.id_col}', '${config.ttr_col}', '${config.tiket_col}', dan '${config.close_time_col}'.`);
                        return;
                    }

                    // [UPDATE] Ambil juga data tiket_id
                    const mappedData = data
                        .filter(row => row[config.id_col]) 
                        .map(row => ({
                            tacc_id: row[config.id_col],
                            ttr: row[config.ttr_col] || '0',
                            tiket_id: row[config.tiket_col] || '', // Ambil ID Tiket
                            req_close: row[config.close_time_col] ? String(row[config.close_time_col]) : null // Ambil CLOSED TIME dengan aman
                        }));

                    setPreviewData(mappedData);
                } catch (err) {
                    setErrorMsg("Gagal membaca file. Pastikan formatnya .xlsx atau .csv");
                }
            };
            reader.readAsBinaryString(selectedFile);
        }
    };

    const handleSourceChange = (e) => {
        setDataSource(e.target.value);
        setFile(null);
        setPreviewData([]);
        setErrorMsg('');
    };

    const handleUpload = async () => {
        if (previewData.length === 0 || !dataSource) {
            setErrorMsg("Data tidak valid atau sumber belum dipilih.");
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            const res = await fetch('/api/tickets/sync-tacc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    category: dataSource, 
                    data: previewData 
                })
            });

            const result = await res.json();

            if (res.ok) {
                alert(result.message);
                onSuccess(); 
                handleClose(); 
            } else {
                throw new Error(result.error || "Gagal sinkronisasi.");
            }
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setDataSource('');
        setFile(null);
        setPreviewData([]);
        setErrorMsg('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-slate-900 dark:bg-slate-800 text-white shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-white">Sync TTR TACC</h3>
                        <p className="text-[10px] text-slate-300 dark:text-slate-400 tracking-wider">Update durasi tiket otomatis via Excel</p>
                    </div>
                    <button onClick={handleClose} className="text-slate-400 hover:text-red-400 transition">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                        <p className="font-bold mb-1">Cara Penggunaan:</p>
                        <ul className="list-decimal pl-4 space-y-0.5">
                            <li>Pilih Sumber Kategori Data.</li>
                            <li>Upload file Excel asli dari TACC.</li>
                            <li>Sistem otomatis mencari ID TACC / ID Tiket untuk update data TTR.</li>
                        </ul>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5 flex items-center gap-1.5">
                            <FaListUl /> Pilih Sumber Data TACC:
                        </label>
                        <select 
                            className="w-full border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-shadow outline-none font-semibold cursor-pointer"
                            value={dataSource}
                            onChange={handleSourceChange}
                        >
                            <option value="" disabled>-- Pilih Kategori --</option>
                            <option value="UMT">🟢 Data UMT</option>
                            <option value="MTEL">🔵 Data MTEL</option>
                            <option value="CENTRATAMA">🟡 Data CENTRATAMA</option>
                        </select>
                    </div>

                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            onChange={handleFileChange}
                            className="hidden" 
                            id="tacc-upload"
                            disabled={!dataSource} 
                        />
                        <label 
                            htmlFor="tacc-upload" 
                            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-colors 
                                ${!dataSource ? 'border-[var(--border-color)] bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-60' 
                                : file ? 'border-green-400 bg-green-50 dark:border-green-500/50 dark:bg-green-900/20 cursor-pointer' 
                                : 'border-blue-300 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-900/20 bg-[var(--bg-surface)] cursor-pointer'}`}
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {!dataSource ? (
                                    <p className="text-xs font-bold text-[var(--text-muted)]">Pilih Sumber Data di atas dulu</p>
                                ) : file ? (
                                    <>
                                        <FaCheckCircle className="w-8 h-8 text-green-500 mb-2" />
                                        <p className="text-sm font-semibold text-green-700 dark:text-green-400 text-center px-4 line-clamp-1">{file.name}</p>
                                    </>
                                ) : (
                                    <>
                                        <FaCloudUploadAlt className="w-8 h-8 text-blue-400 dark:text-blue-500 mb-2" />
                                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Pilih atau Tarik File Excel</p>
                                    </>
                                )}
                            </div>
                        </label>
                    </div>

                    {errorMsg && (
                        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-xs border border-red-200 dark:border-red-800/50">
                            <FaExclamationTriangle className="mt-0.5 shrink-0" />
                            <p>{errorMsg}</p>
                        </div>
                    )}

                    {previewData.length > 0 && !errorMsg && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 font-extrabold px-2 py-1 rounded text-xs">
                                    {dataSource}
                                </span>
                                <span className="text-xs font-bold text-[var(--text-primary)]">
                                    Siap Sinkronisasi
                                </span>
                            </div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                {previewData.length} Tiket
                            </span>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-[var(--bg-base)] border-t border-[var(--border-subtle)] flex justify-end gap-3 shrink-0">
                    <button onClick={handleClose} className="px-5 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] rounded-lg transition border border-transparent hover:border-[var(--border-color)]">
                        Batal
                    </button>
                    <button 
                        onClick={handleUpload} 
                        disabled={loading || previewData.length === 0 || errorMsg !== '' || !dataSource}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 text-white text-sm font-bold rounded-lg shadow-sm transition flex items-center gap-2"
                    >
                        {loading ? <FaSpinner className="animate-spin" /> : <FaCloudUploadAlt />}
                        Mulai Sync
                    </button>
                </div>
            </div>
        </div>
    );
}