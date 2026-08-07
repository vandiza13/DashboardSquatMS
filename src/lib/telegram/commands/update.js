import { db } from '@/lib/db';
import { sendMessage, answerCallbackQuery, editMessageText } from '../client';
import { buildInlineKeyboard } from '../helpers';
import { getSession, setSession, clearSession } from '../conversation';
import { pusherServer } from '@/lib/pusher';
import { appendTicketToSheet } from '@/lib/googleSheets';

export async function handleUpdateWizard(chatId, user, text, isFollowUp = false) {
  if (!isFollowUp) {
    const parts = text.split(' ');
    if (parts.length < 2) {
      return sendMessage(chatId, "⚠️ Berikan ID Tiket. Contoh: `/update TR-1234` atau `/tutup TR-1234`");
    }

    const idTiket = parts[1];
    const isTutup = text.startsWith('/tutup');

    const [rows] = await db.query(`SELECT * FROM tickets WHERE id_tiket = ?`, [idTiket]);
    if (rows.length === 0) {
      return sendMessage(chatId, `❌ Tiket *${idTiket}* tidak ditemukan.`);
    }

    const ticket = rows[0];

    // Validasi Divisi & Role
    if (ticket.status === 'CLOSED' && user.role !== 'SuperAdmin') {
      return sendMessage(chatId, "🚫 Akses ditolak: Tiket sudah CLOSED, hanya SuperAdmin yang bisa mengedit.");
    }
    const allowedMap = { SQUAT: ['SQUAT'], MS: ['MTEL', 'UMT', 'CENTRATAMA'], ALL: ['SQUAT', 'MTEL', 'UMT', 'CENTRATAMA'] };
    const allowedCategories = allowedMap[user.division] || [];
    if (user.role !== 'SuperAdmin' && !allowedCategories.includes(ticket.category)) {
      return sendMessage(chatId, `🚫 Akses ditolak: Anda tidak memiliki akses ke divisi ${ticket.category}.`);
    }

    if (isTutup) {
      await setSession(chatId, 'UPDATE_RCA', { ticket_id: ticket.id, id_tiket: ticket.id_tiket, status: 'CLOSED' });
      await sendMessage(chatId, `🔒 Menutup tiket *${idTiket}*\n\n📝 Ketikan *Root Cause Analysis (RCA)* / Solusi akhir:`);
    } else {
      await setSession(chatId, 'UPDATE_PROGRES', { ticket_id: ticket.id, id_tiket: ticket.id_tiket, status: ticket.status });
      await sendMessage(chatId, `✏️ Update tiket *${idTiket}*\n\n📝 Ketikan *Update Progres* terbaru:`);
    }
    return true;
  }

  // Handle Text Follow-up
  const session = await getSession(chatId);
  if (!session || !session.step.startsWith('UPDATE_')) return false;

  const { step, data } = session;

  if (step === 'UPDATE_PROGRES' || step === 'UPDATE_RCA') {
    data.update_text = text.trim();
    
    // Save to DB
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      let historyNote = '';
      if (step === 'UPDATE_RCA') {
        historyNote = `Status berubah: ${data.status} ➝ CLOSED. RCA: "${data.update_text}"`;
        await connection.query(
          `UPDATE tickets SET status = 'CLOSED', update_progres = ?, updated_by_user_id = ?, last_update_time = NOW() WHERE id = ?`,
          [data.update_text, user.user_id, data.ticket_id]
        );
      } else {
        historyNote = `Update Progress: "${data.update_text}"`;
        await connection.query(
          `UPDATE tickets SET update_progres = ?, updated_by_user_id = ?, last_update_time = NOW() WHERE id = ?`,
          [data.update_text, user.user_id, data.ticket_id]
        );
      }

      await connection.query(
        `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())`,
        [data.ticket_id, historyNote, user.username]
      );

      // Ambil data terbaru untuk export Google Sheet (jika CLOSED)
      let finalTicketData = null;
      if (step === 'UPDATE_RCA') {
        const [tRows] = await connection.query(`
          SELECT t.*, MAX(tech.name) as technician_name, MAX(tech.phone_number) as technician_phone
          FROM tickets t
          LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
          LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
          WHERE t.id = ? GROUP BY t.id
        `, [data.ticket_id]);
        if (tRows.length > 0) {
          finalTicketData = tRows[0];
        }
      }

      await connection.commit();

      // Trigger Pusher
      try {
        await pusherServer.trigger('dashboard-channel', 'ticket-update', {
          message: `Tiket ${data.id_tiket} diupdate via Telegram`,
          type: 'UPDATE_TICKET',
          ticketId: data.ticket_id,
          status: step === 'UPDATE_RCA' ? 'CLOSED' : data.status
        });
      } catch (e) {
        console.error("Pusher error:", e);
      }

      // Export Google Sheets async
      if (step === 'UPDATE_RCA' && finalTicketData) {
        try {
          let fullTechInfo = finalTicketData.technician_name 
            ? `${finalTicketData.technician_name} (${finalTicketData.technician_phone || '-'})` 
            : 'Belum Assign';
          if (finalTicketData.partner_technicians) fullTechInfo += ` | Partner: ${finalTicketData.partner_technicians}`;

          const sheetData = {
              category: finalTicketData.category,
              subcategory: finalTicketData.subcategory,
              priority: finalTicketData.priority,
              id_tiket: finalTicketData.id_tiket,
              id_tiket_tacc: finalTicketData.id_tiket_tacc,
              deskripsi: finalTicketData.deskripsi,
              sto: finalTicketData.sto,
              branch: finalTicketData.branch,
              tiket_time: finalTicketData.tiket_time,
              close_time: finalTicketData.close_time || new Date().toISOString(),
              root_cause: finalTicketData.update_progres,
              technician_full: fullTechInfo,
              material: finalTicketData.material
          };
          
          await appendTicketToSheet(sheetData);
        } catch (sheetErr) {
          console.error("Sheet Export Error:", sheetErr);
        }
      }

      await sendMessage(chatId, `✅ *Berhasil!* Tiket ${data.id_tiket} telah diupdate.`);
      await clearSession(chatId);
    } catch (e) {
      await connection.rollback();
      console.error("Update DB error:", e);
      await sendMessage(chatId, `❌ Terjadi kesalahan saat menyimpan update.`);
      await clearSession(chatId);
    } finally {
      connection.release();
    }
    
    return true;
  }

  return false;
}

export async function handleUpdateCallback(chatId, messageId, data, user, callbackQueryId) {
  // Callback untuk tombol Inline di tampilan detail /tiket
  if (data.startsWith('UPDATE_PROG_') || data.startsWith('CLOSE_TIKET_')) {
    const isClose = data.startsWith('CLOSE_TIKET_');
    const ticketId = isClose ? data.replace('CLOSE_TIKET_', '') : data.replace('UPDATE_PROG_', '');

    const [rows] = await db.query(`SELECT id, id_tiket, status, category FROM tickets WHERE id = ?`, [ticketId]);
    if (rows.length === 0) {
      return answerCallbackQuery(callbackQueryId, "Tiket tidak ditemukan", true);
    }

    const ticket = rows[0];

    if (ticket.status === 'CLOSED' && user.role !== 'SuperAdmin') {
      return answerCallbackQuery(callbackQueryId, "Akses ditolak. Tiket sudah CLOSED.", true);
    }

    const allowedMap = { SQUAT: ['SQUAT'], MS: ['MTEL', 'UMT', 'CENTRATAMA'], ALL: ['SQUAT', 'MTEL', 'UMT', 'CENTRATAMA'] };
    const allowedCategories = allowedMap[user.division] || [];
    if (user.role !== 'SuperAdmin' && !allowedCategories.includes(ticket.category)) {
      return answerCallbackQuery(callbackQueryId, `Akses ditolak ke divisi ${ticket.category}.`, true);
    }

    if (isClose) {
      await setSession(chatId, 'UPDATE_RCA', { ticket_id: ticket.id, id_tiket: ticket.id_tiket, status: ticket.status });
      await sendMessage(chatId, `🔒 Menutup tiket *${ticket.id_tiket}*\n\n📝 Ketikan *Root Cause Analysis (RCA)* / Solusi akhir:`);
    } else {
      await setSession(chatId, 'UPDATE_PROGRES', { ticket_id: ticket.id, id_tiket: ticket.id_tiket, status: ticket.status });
      await sendMessage(chatId, `✏️ Update tiket *${ticket.id_tiket}*\n\n📝 Ketikan *Update Progres* terbaru:`);
    }

    return answerCallbackQuery(callbackQueryId);
  }
}
