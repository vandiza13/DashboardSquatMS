import { db } from '@/lib/db';
import { sendMessage } from '../client';
import { formatTicketDetail, buildInlineKeyboard } from '../helpers';

export async function handleTiket(chatId, text, user) {
  const parts = text.split(' ');
  if (parts.length < 2) {
    return sendMessage(chatId, "⚠️ Berikan ID Tiket. Contoh: `/tiket TR-1234`");
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
      WHERE t.id_tiket = ?
      GROUP BY t.id
    `, [idTiket]);

    if (rows.length === 0) {
      return sendMessage(chatId, `❌ Tiket dengan ID *${idTiket}* tidak ditemukan.`);
    }

    const ticket = rows[0];
    const message = formatTicketDetail(ticket);

    // Tambahkan tombol aksi jika tiket belum CLOSED
    if (ticket.status !== 'CLOSED' && user.role !== 'View') {
      const keyboard = buildInlineKeyboard([
        { text: "✏️ Update Progres", callback_data: `UPDATE_PROG_${ticket.id}` },
        { text: "🔒 Tutup Tiket", callback_data: `CLOSE_TIKET_${ticket.id}` }
      ]);
      await sendMessage(chatId, message, { reply_markup: keyboard });
    } else {
      await sendMessage(chatId, message);
    }
  } catch (error) {
    console.error("Tiket Error:", error);
    await sendMessage(chatId, "❌ Terjadi kesalahan saat mencari tiket.");
  }
}

export async function handleRunning(chatId, user) {
  try {
    const [rows] = await db.query(`
      SELECT id_tiket, category, subcategory, priority, status, tiket_time
      FROM tickets 
      WHERE status IN ('OPEN', 'SC')
      ORDER BY tiket_time DESC
      LIMIT 15
    `);

    if (rows.length === 0) {
      return sendMessage(chatId, "✅ Tidak ada tiket yang sedang aktif saat ini.");
    }

    let text = `📋 *TIKET AKTIF (${rows.length} terbaru)*\n─────────────────────────\n`;
    rows.forEach((t, i) => {
      let icon = t.status === 'SC' ? '⏸️' : '🔴';
      text += `${i + 1}. ${icon} *${t.id_tiket}* | ${t.category}-${t.subcategory} | ${t.priority || '-'}\n`;
    });
    text += `─────────────────────────\nGunakan \`/tiket <ID>\` untuk detail.`;

    await sendMessage(chatId, text);
  } catch (error) {
    console.error("Running Error:", error);
    await sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil daftar tiket aktif.");
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
