import React, { useState, useEffect } from 'react';
import { FaTimes, FaCopy, FaCheck, FaSpinner } from 'react-icons/fa';

export default function TRModal({ isOpen, onClose, ticket }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [trText, setTrText] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen || !ticket) {
            setTrText('');
            return;
        }

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/tickets/${ticket.id}/history`);
                if (res.ok) {
                    const data = await res.json();
                    setHistory(data);
                }
            } catch (err) {
                console.error('Failed to fetch history', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [isOpen, ticket]);

    useEffect(() => {
        if (!ticket || loading) return;

        const calculateDuration = (startTime, endTime) => {
            if (!startTime || !endTime) return '-';
            const start = new Date(startTime);
            const end = new Date(endTime);
            const diffMs = end - start;
            if (diffMs < 0) return '-';

            const diffMins = Math.floor(diffMs / 60000);
            const days = Math.floor(diffMins / 1440);
            const hours = Math.floor((diffMins % 1440) / 60);
            const mins = diffMins % 60;

            let result = '';
            if (days > 0) result += `${days} Hari `;
            if (hours > 0) result += `${hours} Jam `;
            result += `${mins} Menit`;
            return result.trim() || '0 Menit';
        };

        const formatTimeOnly = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${hours}.${minutes}`;
        };

        let statusEmoji = '🔴';
        if (ticket.status === 'SC') statusEmoji = '🟡';
        else if (ticket.status === 'CLOSED') statusEmoji = '🟢';

        const timeline = [];
        if (ticket.tiket_time) {
            timeline.push({ time: ticket.tiket_time, text: 'Tiket Open' });
        }

        const sortedHistory = [...history].reverse();
        sortedHistory.forEach(log => {
            const details = log.change_details;
            if (details.includes('Tiket dibuat dengan status OPEN')) return;

            const progressRegex = /Update Progress:\s*"([\s\S]*?)"/;
            const match = details.match(progressRegex);

            if (match && match[1]) {
                timeline.push({ time: log.change_timestamp, text: match[1].trim() });
            } else if (details.startsWith('Status berubah:')) {
                timeline.push({ time: log.change_timestamp, text: details });
            }
        });

        let closeTimeStr = null;
        if (ticket.status === 'CLOSED') {
            const closeLog = history.find(h => h.change_details.includes('➝ CLOSED'));
            const closeTime = closeLog ? closeLog.change_timestamp : ticket.last_update_time;
            closeTimeStr = closeTime;

            const hasClose = timeline.some(item => 
                (item.text.toLowerCase().includes('close') || item.text.toLowerCase().includes('selesai')) &&
                new Date(item.time).getTime() === new Date(closeTime).getTime()
            );

            if (!hasClose) {
                timeline.push({ time: closeTime, text: 'Tiket Close' });
            }
        }

        const timelineText = timeline.map(item => `⏱️ ${formatTimeOnly(item.time)} | ${item.text}`).join('\n');
        const durationEndTime = ticket.status === 'CLOSED' ? (closeTimeStr || ticket.last_update_time) : new Date().toISOString();
        const ttrDuration = calculateDuration(ticket.tiket_time, durationEndTime);

        const subCat = ticket.subcategory ? ticket.subcategory.toUpperCase() : ticket.category;
        
        const generatedText = `🚨 *TIME REPORT (TR) - TICKET ${subCat}* 🚨\n======================================\n\n${ticket.id_tiket}\n${ticket.deskripsi || '-'}\n${ticket.category === 'SQUAT' ? `*Priority:* ${ticket.priority || '-'}` : `*TACC ID:* ${ticket.id_tiket_tacc || '-'}`}\n*Status:* ${statusEmoji} ${ticket.status}\n*STO / Branch:* ${ticket.sto || '-'} / ${ticket.branch || '-'}\n\n*PIC Teknisi:* ${ticket.technician_name || '-'} ${ticket.technician_phone ? '(' + ticket.technician_phone + ')' : ''}\n*Partner:* ${ticket.partner_technicians || '-'}\n\n--------------------------------------\n*ALUR PROGRESS & TIMELINE*\n--------------------------------------\n${timelineText}\n\n⌛ *Durasi Penanganan (TTR):* ${ttrDuration}`;

        setTrText(generatedText);
    }, [history, ticket, loading]);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(trText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--bg-surface)] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-[var(--border-color)] flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2"><FaCopy className="text-blue-500" /> Time Report (TR)</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                        <FaTimes />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <FaSpinner className="animate-spin text-blue-500 text-3xl" />
                        </div>
                    ) : (
                        <textarea
                            readOnly
                            value={trText}
                            className="w-full flex-1 min-h-[350px] p-4 text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none resize-none text-[var(--text-secondary)] shadow-inner"
                        />
                    )}
                </div>

                <div className="p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-base)] flex justify-end">
                    <button
                        disabled={loading || !trText}
                        onClick={handleCopy}
                        className={`w-full py-3 px-4 rounded-xl shadow-sm font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                            copied
                                ? 'bg-green-600 text-white shadow-green-200 hover:bg-green-700'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-50'
                        }`}
                    >
                        {copied ? <FaCheck className="animate-bounce" /> : <FaCopy />}
                        {copied ? 'TR Berhasil Disalin!' : 'Salin TR (WA / Telegram)'}
                    </button>
                </div>
            </div>
        </div>
    );
}
