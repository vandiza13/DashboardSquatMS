// src/lib/telegram/helpers.js

export function escapeMarkdown(text) {
  if (!text) return '';
  // Simple markdown escape for Telegram's Markdown (not MarkdownV2 which is stricter, 
  // but we usually use standard Markdown or HTML depending on need. 
  // For standard Markdown, escape `_`, `*`, `[`, `]`
  return String(text).replace(/[_*[\]]/g, '\\$&');
}

export function formatTicketDetail(ticket) {
  const agingStr = ticket.ttr_tacc ? `TTR: ${ticket.ttr_tacc} jam` : 
                   ticket.close_time ? `Selesai` : `Berjalan`;
                   
  const picInfo = ticket.technician_name 
    ? `${ticket.technician_name} (${ticket.technician_phone || '-'})` 
    : 'Belum Assign';

  return `📋 *DETAIL TIKET ${ticket.id_tiket}*
─────────────────────────
📌 *Status*: ${ticket.status}
🏷️ *Kategori*: ${ticket.category} - ${ticket.subcategory}
⚡ *Prioritas*: ${ticket.priority || '-'}
📝 *Deskripsi*: ${escapeMarkdown(ticket.deskripsi)}
📍 *STO*: ${ticket.sto || '-'} | *Branch*: ${ticket.branch || '-'}
👤 *PIC*: ${escapeMarkdown(picInfo)}
⏰ *Masuk*: ${new Date(ticket.tiket_time).toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})} WIB
⏳ *Info Waktu*: ${agingStr}
📊 *Progress*: ${escapeMarkdown(ticket.update_progres || '-')}
─────────────────────────`;
}

export function buildInlineKeyboard(buttonsArray, columns = 2) {
  const inline_keyboard = [];
  let row = [];
  
  for (const btn of buttonsArray) {
    row.push(btn);
    if (row.length === columns) {
      inline_keyboard.push(row);
      row = [];
    }
  }
  if (row.length > 0) {
    inline_keyboard.push(row);
  }
  
  return { inline_keyboard };
}
