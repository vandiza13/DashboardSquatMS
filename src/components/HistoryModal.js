import { FaHistory, FaTimes } from 'react-icons/fa';

export default function HistoryModal({ isOpen, onClose, historyData, ticketId }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-[var(--bg-surface)] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4 bg-[var(--bg-surface-2)]">
                    <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                        <FaHistory /> Riwayat: <span className="text-blue-600 dark:text-blue-400">{ticketId}</span>
                    </h3>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-red-500 transition"><FaTimes /></button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {historyData.length === 0 ? (
                        <p className="text-center text-[var(--text-muted)] italic">Belum ada riwayat.</p>
                    ) : (
                        <ol className="relative border-l border-[var(--border-color)] ml-3">
                            {historyData.map((item, idx) => (
                                <li key={idx} className="mb-6 last:mb-0 ml-4">
                                    <div className="absolute w-3 h-3 bg-blue-500 rounded-full mt-1.5 -left-[22px] border border-[var(--bg-surface)]"></div>
                                    <time className="mb-1 text-xs font-normal text-[var(--text-muted)] leading-none">
                                        {item.change_timestamp ? new Date(item.change_timestamp).toLocaleString('id-ID') : '-'}
                                    </time>
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{item.changed_by || 'System'}</h3>
                                    <p className="mb-4 text-sm font-normal text-[var(--text-secondary)] bg-[var(--bg-base)] p-2 rounded border border-[var(--border-subtle)] mt-1">{item.change_details}</p>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>
        </div>
    );
}