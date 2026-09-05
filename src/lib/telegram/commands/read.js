import { db } from '@/lib/db';
import { sendMessage } from '../client';
import { formatTicketDetail, buildInlineKeyboard, generateTRText, escapeMarkdown } from '../helpers';

export async function handleTiket(chatId, text, user) {
  const parts = text.split(' ');
  if (parts.length < 2) {
    return sendMessage(chatId, "⚠️ Berikan ID Tiket. Contoh: `/tiket TR-1234` (atau ID parsial seperti `/tiket 552`)");
  }

  const idTiket = parts[1];

  try {
    const [rows] = await db.query(`
      SELECT t.*, 
             MAX(tech.name) as technician_name,
             MAX(tech.phone_number) as technician_phone
      FROM tickets t
      LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
      LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
      WHERE t.id_tiket = ? OR t.id_tiket LIKE ?
      GROUP BY t.id
      LIMIT 1
    `, [idTiket, `%${idTiket}`]);

    if (rows.length === 0) {
      return sendMessage(chatId, `❌ Tiket dengan ID *${idTiket}* tidak ditemukan.`);
    }

    const ticket = rows[0];
    const message = formatTicketDetail(ticket);

    const buttons = [];
    if (ticket.status !== 'CLOSED' && user.role !== 'View' && user.role !== 'Teknisi') {
      buttons.push({ text: "✏️ Update Progres", callback_data: `UPDATE_PROG_${ticket.id}` });
      buttons.push({ text: "🔒 Tutup Tiket", callback_data: `CLOSE_TIKET_${ticket.id}` });
    }
    buttons.push({ text: "📋 Time Report", callback_data: `TR_TIKET_${ticket.id}` });

    if (user.role !== 'View') {
      buttons.push({ text: "👷‍♂️ Luruskan Tim", callback_data: `TEAM_START_${ticket.id}` });
    }

    if (user.role === 'SuperAdmin') {
      buttons.push({ text: "🗑️ Hapus Tiket", callback_data: `DELETE_TIKET_${ticket.id}` });
    }

    const keyboard = buildInlineKeyboard(buttons, 2);
    await sendMessage(chatId, message, { reply_markup: keyboard });
  } catch (error) {
    console.error("Tiket Error:", error);
    await sendMessage(chatId, "❌ Terjadi kesalahan saat mencari tiket.");
  }
}

export async function handleRunning(chatId, text, user) {
  const parts = text.split(' ');
  const categoryArg = parts[1] ? parts[1].toUpperCase() : null;
  await sendRunningList(chatId, null, categoryArg, user);
}

export async function sendRunningList(chatId, messageId = null, category = null, user) {
  try {
    let query = `
      SELECT id_tiket, category, subcategory, priority, id_tiket_tacc, status, tiket_time
      FROM tickets 
      WHERE status IN ('OPEN', 'SC')
    `;
    const params = [];
    if (category && category !== 'ALL') {
      query += ` AND category = ? `;
      params.push(category);
    }
    query += ` ORDER BY tiket_time DESC LIMIT 15 `;

    const [rows] = await db.query(query, params);

    const titleCat = category && category !== 'ALL' ? ` KATEGORI ${category}` : '';
    const emptyMsg = `✅ Tidak ada tiket aktif (OPEN/SC) saat ini${titleCat.toLowerCase()}.`;

    const buttons = [
      { text: category === 'SQUAT' ? '🔹 SQUAT' : 'SQUAT', callback_data: 'RUNNING_FILTER_SQUAT' },
      { text: category === 'MTEL' ? '🔹 MTEL' : 'MTEL', callback_data: 'RUNNING_FILTER_MTEL' },
      { text: category === 'UMT' ? '🔹 UMT' : 'UMT', callback_data: 'RUNNING_FILTER_UMT' },
      { text: category === 'CENTRATAMA' ? '🔹 CENTRATAMA' : 'CENTRATAMA', callback_data: 'RUNNING_FILTER_CENTRATAMA' },
      { text: (!category || category === 'ALL') ? '🔹 Semua' : 'Semua', callback_data: 'RUNNING_FILTER_ALL' }
    ];
    const keyboard = buildInlineKeyboard(buttons, 3);

    if (rows.length === 0) {
      if (messageId) {
        await editMessageText(chatId, messageId, emptyMsg, { reply_markup: keyboard });
      } else {
        await sendMessage(chatId, emptyMsg, { reply_markup: keyboard });
      }
      return;
    }

    let textStr = `📋 *TIKET AKTIF (${rows.length} terbaru)${titleCat}*\n─────────────────────────\n`;
    rows.forEach((t, i) => {
      let icon = t.status === 'SC' ? '⏸️' : '🔴';
      const isTaccCategory = ['UMT', 'MTEL', 'CENTRATAMA'].includes(t.category);
      const val = isTaccCategory ? (t.id_tiket_tacc || '-') : (t.priority || '-');
      textStr += `${i + 1}. ${icon} *${escapeMarkdown(t.id_tiket)}* | ${escapeMarkdown(t.category)}-${escapeMarkdown(t.subcategory)} | ${escapeMarkdown(val)}\n`;
    });
    textStr += `─────────────────────────\nGunakan \`/tiket <ID>\` untuk detail.`;

    if (messageId) {
      await editMessageText(chatId, messageId, textStr, { reply_markup: keyboard });
    } else {
      await sendMessage(chatId, textStr, { reply_markup: keyboard });
    }
  } catch (error) {
    console.error("Running Error:", error);
    if (!messageId) {
      await sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil daftar tiket aktif.");
    }
  }
}


export async function handleStats(chatId, user) {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('OPEN', 'SC') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed
      FROM tickets 
      WHERE DATE(tiket_time) = CURDATE()
    `);

    const stats = rows[0];
    
    const text = `📊 *STATISTIK HARI INI*
─────────────────────────
🎫 Total Tiket Masuk: *${stats.total || 0}*
🔴 Sedang Berjalan: *${stats.active || 0}*
✅ Selesai (Closed): *${stats.closed || 0}*
─────────────────────────
Tetap semangat! 💪`;

    await sendMessage(chatId, text);
  } catch (error) {
    console.error("Stats Error:", error);
    await sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil statistik.");
  }
}

export async function handleTR(chatId, text, user) {
  const parts = text.split(' ');
  if (parts.length < 2) {
    return sendMessage(chatId, "⚠️ Berikan ID Tiket. Contoh: `/tr TR-1234` (atau ID parsial seperti `/tr 552`)");
  }

  const idTiketInput = parts[1];

  try {
    const [rows] = await db.query(`
      SELECT t.*, 
             MAX(tech.name) as technician_name,
             MAX(tech.phone_number) as technician_phone
      FROM tickets t
      LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
      LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
      WHERE t.id_tiket = ? OR t.id_tiket LIKE ?
      GROUP BY t.id
      LIMIT 1
    `, [idTiketInput, `%${idTiketInput}`]);

    if (rows.length === 0) {
      return sendMessage(chatId, `❌ Tiket dengan ID *${idTiketInput}* tidak ditemukan.`);
    }

    const ticket = rows[0];
    
    const [history] = await db.query(`
      SELECT * FROM ticket_history 
      WHERE ticket_id = ? 
      ORDER BY change_timestamp DESC
    `, [ticket.id]);

    const message = generateTRText(ticket, history);
    await sendMessage(chatId, message);
  } catch (error) {
    console.error("TR Command Error:", error);
    await sendMessage(chatId, "❌ Terjadi kesalahan saat membuat Time Report.");
  }
}

export async function handleHapusCommand(chatId, text, user) {
  const parts = text.split(' ');
  if (parts.length < 2) {
    return sendMessage(chatId, "⚠️ Berikan ID Tiket. Contoh: `/hapus TR-1234` (atau ID parsial seperti `/hapus 552`)");
  }

  const idTiket = parts[1];

  try {
    const [rows] = await db.query(`SELECT id, id_tiket FROM tickets WHERE id_tiket = ? OR id_tiket LIKE ? LIMIT 1`, [idTiket, `%${idTiket}`]);
    if (rows.length === 0) {
      return sendMessage(chatId, `❌ Tiket dengan ID *${idTiket}* tidak ditemukan.`);
    }

    const ticket = rows[0];

    const keyboard = buildInlineKeyboard([
      { text: "🗑️ Ya, Hapus", callback_data: `CONFIRM_DELETE_${ticket.id}` },
      { text: "❌ Batal", callback_data: `CANCEL_DELETE_${ticket.id}` }
    ], 2);

    await sendMessage(chatId, `⚠️ Apakah Anda yakin ingin menghapus tiket *${escapeMarkdown(ticket.id_tiket)}* secara permanen?`, { reply_markup: keyboard });
  } catch (error) {
    console.error("Hapus Command Error:", error);
    await sendMessage(chatId, "❌ Terjadi kesalahan saat memproses perintah hapus.");
  }
}


