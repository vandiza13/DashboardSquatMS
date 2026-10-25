import { sendMessage } from '@/lib/telegram/client';
import { buildInlineKeyboard } from '@/lib/telegram/helpers';

/**
 * Format tanggal ke DD/MM/YYYY HH:mm WIB
 */
function formatWibDate(dateInput) {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    // Konversi ke WIB (+7)
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (3600000 * 7));

    const dd = String(wib.getDate()).padStart(2, '0');
    const mm = String(wib.getMonth() + 1).padStart(2, '0');
    const yyyy = wib.getFullYear();
    const hh = String(wib.getHours()).padStart(2, '0');
    const min = String(wib.getMinutes()).padStart(2, '0');

    return `${dd}/${mm}/${yyyy} ${hh}:${min} WIB`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Broadcast notifikasi tiket baru SQUAT (TSEL / OLO) ke grup Telegram
 */
export async function broadcastNewSquatTicket(ticket) {
  // Hanya proses jika kategori SQUAT
  if (!ticket || ticket.category !== 'SQUAT') return;

  const targetGroupId = process.env.TELEGRAM_SQUAT_GROUP_ID || '-5096464712';
  if (!targetGroupId) return;

  const sub = (ticket.subcategory || 'SQUAT').toUpperCase();
  const waktuStr = formatWibDate(ticket.tiket_time || new Date());

  const messageText = 
`Tiket Baru ${sub}

No. Tiket : ${ticket.id_tiket}
Deskripsi : ${ticket.deskripsi || '-'}
STO : ${ticket.sto || '-'}
Waktu : ${waktuStr}

Silahkan Ambil tiket ini
(Sebelum ambil tiket, pastikan sudah absen Lensa)`;

  const keyboard = buildInlineKeyboard([
    { text: "🖐️ Ambil Tiket", callback_data: `AMBIL_TIKET_${ticket.id}` }
  ], 1);

  try {
    // Matikan parse_mode Markdown agar karakter garis bawah (_) di deskripsi tidak error
    await sendMessage(targetGroupId, messageText, { 
      parse_mode: '', 
      reply_markup: keyboard 
    });
    console.log(`>>> Broadcast tiket baru SQUAT (${ticket.id_tiket}) ke grup ${targetGroupId} berhasil.`);
  } catch (err) {
    console.error(`>>> Gagal broadcast tiket baru SQUAT (${ticket.id_tiket}):`, err.message);
  }
}
