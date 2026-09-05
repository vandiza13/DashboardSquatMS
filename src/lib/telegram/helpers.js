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
                   (ticket.status === 'CLOSED' ? `Selesai` : `Berjalan`);
                   
  const picInfo = ticket.technician_name 
    ? `${ticket.technician_name} (${ticket.technician_phone || '-'})` 
    : 'Belum Assign';

  const partnerInfo = ticket.partner_technicians && ticket.partner_technicians.trim() !== ''
    ? ticket.partner_technicians
    : '-';

  const isTaccCategory = ['UMT', 'MTEL', 'CENTRATAMA'].includes(ticket.category);
  const priorityOrTacc = isTaccCategory
    ? `🎯 *TACC ID*: ${escapeMarkdown(ticket.id_tiket_tacc || '-')}`
    : `⚡ *Prioritas*: ${escapeMarkdown(ticket.priority || '-')}`;

  const statusStr = (ticket.category === 'SQUAT' && ticket.status === 'SC') ? 'PENDING' : ticket.status;
  const progressLabel = ticket.status === 'CLOSED' ? 'RCA' : 'Progress';

  return `📋 *DETAIL TIKET ${escapeMarkdown(ticket.id_tiket)}*
─────────────────────────
📌 *Status*: ${statusStr}
🏷️ *Kategori*: ${ticket.category} - ${ticket.subcategory}
${priorityOrTacc}
📝 *Deskripsi*: ${escapeMarkdown(ticket.deskripsi)}
📍 *STO*: ${escapeMarkdown(ticket.sto || '-')} | *Branch*: ${escapeMarkdown(ticket.branch || '-')}
👤 *PIC*: ${escapeMarkdown(picInfo)}
👥 *Partner*: ${escapeMarkdown(partnerInfo)}
⏰ *TIKET OPEN*: ${new Date(ticket.tiket_time).toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})} WIB
⏳ *Info Waktu*: ${agingStr}
📊 *${progressLabel}*: ${escapeMarkdown(ticket.update_progres || '-')}
─────────────────────────`;
}

export function generateTRText(ticket, history = []) {
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
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta'
      }).replace(':', '.');
    } catch (e) {
      return '';
    }
  };

  let statusEmoji = '🔴';
  if (ticket.status === 'SC') statusEmoji = '🟡';
  else if (ticket.status === 'CLOSED') statusEmoji = '🟢';

  const timeline = [];
  if (ticket.tiket_time) {
    timeline.push({ time: ticket.tiket_time, text: 'Tiket Open' });
  }

  // Sorting history chronologically
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

  const timelineText = timeline.map(item => `⏱️ ${formatTimeOnly(item.time)} | ${escapeMarkdown(item.text)}`).join('\n');
  const durationEndTime = ticket.status === 'CLOSED' ? (closeTimeStr || ticket.last_update_time) : new Date().toISOString();
  const ttrDuration = calculateDuration(ticket.tiket_time, durationEndTime);

  const subCat = ticket.subcategory ? ticket.subcategory.toUpperCase() : ticket.category;
  
  const statusStr = (ticket.category === 'SQUAT' && ticket.status === 'SC') ? 'PENDING' : ticket.status;

  // Follow the exact format as TRModal.js, but escape dynamic inputs to avoid Telegram Markdown issues
  const generatedText = `🚨 *TIME REPORT (TR) - TICKET ${escapeMarkdown(subCat)}* 🚨
======================================

${escapeMarkdown(ticket.id_tiket)}
${escapeMarkdown(ticket.deskripsi || '-')}
${ticket.category === 'SQUAT' ? `*Priority:* ${escapeMarkdown(ticket.priority || '-')}` : `*TACC ID:* ${escapeMarkdown(ticket.id_tiket_tacc || '-')}`}
*Status:* ${statusEmoji} ${statusStr}
*STO / Branch:* ${escapeMarkdown(ticket.sto || '-')} / ${escapeMarkdown(ticket.branch || '-')}

*PIC Teknisi:* ${escapeMarkdown(ticket.technician_name || '-')} ${ticket.technician_phone ? '(' + escapeMarkdown(ticket.technician_phone) + ')' : ''}
*Partner:* ${escapeMarkdown(ticket.partner_technicians || '-')}

--------------------------------------
*ALUR PROGRESS & TIMELINE*
--------------------------------------
${timelineText}

⌛ *Durasi Penanganan (TTR):* ${escapeMarkdown(ttrDuration)}`;

  return generatedText;
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

