// src/lib/telegram/handler.js
import { db } from '@/lib/db';
import { sendMessage, answerCallbackQuery, editMessageText } from './client';
import { authenticateTelegramUser } from './auth';
import { generateTRText, escapeMarkdown, formatTicketDetail, buildInlineKeyboard } from './helpers';
import { pusherServer } from '@/lib/pusher';

// Import command handlers
import { handleStart, handleRegister, handleHelp, handleProfil } from './commands/start';
import { handleStats, handleRunning, handleTiket, handleTR, handleHapusCommand, sendRunningList } from './commands/read';
import { handleCreateWizard, handleCreateCallback } from './commands/create';
import { handleUpdateWizard, handleUpdateCallback } from './commands/update';

export async function handleTelegramMessage(body) {
  if (body.message) {
    await processMessage(body.message);
  } else if (body.callback_query) {
    await processCallbackQuery(body.callback_query);
  }
}

async function processMessage(message) {
  const chatId = message.chat.id;
  const text = message.text || '';

  // 1. Unauthenticated commands
  if (text.startsWith('/start')) {
    return handleStart(chatId);
  }
  if (text.startsWith('/register')) {
    return handleRegister(chatId, text);
  }

  // 2. Authenticate User
  const user = await authenticateTelegramUser(chatId);
  if (!user) {
    return sendMessage(chatId, "⚠️ Anda belum terdaftar. Silakan gunakan perintah:\n`/register <username> <password>`\nuntuk menghubungkan akun dashboard Anda.");
  }
  if (user.role === 'View' && !text.startsWith('/tiket') && !text.startsWith('/tr') && !text.startsWith('/running') && !text.startsWith('/stats') && !text.startsWith('/help') && !text.startsWith('/profil')) {
    return sendMessage(chatId, "🚫 Akses ditolak. Akun Anda hanya memiliki hak akses 'View'.");
  }

  // 3. Routing Authenticated Commands
  if (text.startsWith('/help')) return handleHelp(chatId, user);
  if (text.startsWith('/profil')) return handleProfil(chatId, user);
  if (text.startsWith('/stats')) return handleStats(chatId, user);
  if (text.startsWith('/running')) return handleRunning(chatId, text, user);
  if (text.startsWith('/tiket')) return handleTiket(chatId, text, user);
  if (text.startsWith('/tr')) return handleTR(chatId, text, user);
  if (text.startsWith('/hapus')) {
    if (user.role !== 'SuperAdmin') {
      return sendMessage(chatId, "🚫 Akses ditolak. Hanya Super Admin yang diperbolehkan menghapus tiket.");
    }
    return handleHapusCommand(chatId, text, user);
  }
  if (text.startsWith('/buat')) return handleCreateWizard(chatId, user, text);
  if (text.startsWith('/update') || text.startsWith('/tutup')) return handleUpdateWizard(chatId, user, text);
  
  // 4. Handle Conversation States (Wizard Follow-up)
  // For text inputs during creation or updating (e.g. typing description, RCA)
  const isCreateHandled = await handleCreateWizard(chatId, user, text, true);
  if (isCreateHandled) return;
  
  const isUpdateHandled = await handleUpdateWizard(chatId, user, text, true);
  if (isUpdateHandled) return;

  // 5. Default fallback
  if (text.startsWith('/')) {
    return sendMessage(chatId, "Perintah tidak dikenali. Ketik /help untuk daftar perintah.");
  }
}

async function processCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const callbackQueryId = callbackQuery.id;
  const messageId = callbackQuery.message.message_id;

  // Authenticate User
  const user = await authenticateTelegramUser(chatId);
  if (!user) {
    return answerCallbackQuery(callbackQueryId, "Akses ditolak.", true);
  }

  // Route callback query for TR (Read-only)
  if (data.startsWith('TR_TIKET_')) {
    const ticketId = data.replace('TR_TIKET_', '');
    try {
      const [rows] = await db.query(`
        SELECT t.*, 
               MAX(tech.name) as technician_name,
               MAX(tech.phone_number) as technician_phone
        FROM tickets t
        LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
        LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
        WHERE t.id = ?
        GROUP BY t.id
      `, [ticketId]);

      if (rows.length === 0) {
        await answerCallbackQuery(callbackQueryId, "Tiket tidak ditemukan", true);
        return;
      }

      const ticket = rows[0];

      const [history] = await db.query(`
        SELECT * FROM ticket_history 
        WHERE ticket_id = ? 
        ORDER BY change_timestamp DESC
      `, [ticketId]);

      const message = generateTRText(ticket, history);
      await sendMessage(chatId, message);
      await answerCallbackQuery(callbackQueryId, "Time Report terkirim!");
    } catch (err) {
      console.error("Callback TR Error:", err);
      await answerCallbackQuery(callbackQueryId, "Gagal memproses Time Report", true);
    }
    return;
  }

  // Route callback query for Running list category filters (Read-only)
  if (data.startsWith('RUNNING_FILTER_')) {
    const category = data.replace('RUNNING_FILTER_', '');
    await sendRunningList(chatId, messageId, category, user);
    await answerCallbackQuery(callbackQueryId);
    return;
  }

  // Route callback query for Delete confirmations (SuperAdmin Only)
  if (data.startsWith('DELETE_TIKET_') || data.startsWith('CONFIRM_DELETE_') || data.startsWith('CANCEL_DELETE_')) {
    if (user.role !== 'SuperAdmin') {
      return answerCallbackQuery(callbackQueryId, "Akses ditolak. Hanya Super Admin yang bisa menghapus tiket.", true);
    }

    if (data.startsWith('DELETE_TIKET_')) {
      const ticketId = data.replace('DELETE_TIKET_', '');
      try {
        const [rows] = await db.query('SELECT id_tiket FROM tickets WHERE id = ?', [ticketId]);
        if (rows.length === 0) {
          await answerCallbackQuery(callbackQueryId, "Tiket tidak ditemukan", true);
          return;
        }
        const ticket = rows[0];
        const keyboard = buildInlineKeyboard([
          { text: "🗑️ Ya, Hapus", callback_data: `CONFIRM_DELETE_${ticketId}` },
          { text: "❌ Batal", callback_data: `CANCEL_DELETE_${ticketId}` }
        ], 2);
        await editMessageText(chatId, messageId, `⚠️ Apakah Anda yakin ingin menghapus tiket *${escapeMarkdown(ticket.id_tiket)}* secara permanen?`, { reply_markup: keyboard });
        await answerCallbackQuery(callbackQueryId);
      } catch (err) {
        console.error("Callback delete error:", err);
        await answerCallbackQuery(callbackQueryId, "Gagal memproses permintaan hapus", true);
      }
    } else if (data.startsWith('CONFIRM_DELETE_')) {
      const ticketId = data.replace('CONFIRM_DELETE_', '');
      const connection = await db.getConnection();
      try {
        const [rows] = await connection.query('SELECT id_tiket FROM tickets WHERE id = ?', [ticketId]);
        if (rows.length === 0) {
          await answerCallbackQuery(callbackQueryId, "Tiket tidak ditemukan", true);
          connection.release();
          return;
        }
        const ticket = rows[0];

        await connection.beginTransaction();
        await connection.query('DELETE FROM ticket_technicians WHERE ticket_id = ?', [ticketId]);
        await connection.query('DELETE FROM ticket_history WHERE ticket_id = ?', [ticketId]);
        await connection.query('DELETE FROM tickets WHERE id = ?', [ticketId]);
        await connection.commit();

        // Trigger Pusher
        try {
          await pusherServer.trigger('dashboard-channel', 'ticket-update', {
            message: `Tiket ${ticket.id_tiket} dihapus via Telegram`,
            type: 'DELETE_TICKET',
            ticketId: ticketId
          });
        } catch (e) {
          console.error("Pusher delete trigger error:", e);
        }

        await editMessageText(chatId, messageId, `✅ Tiket *${escapeMarkdown(ticket.id_tiket)}* berhasil dihapus secara permanen.`);
        await answerCallbackQuery(callbackQueryId, "Tiket berhasil dihapus!");
      } catch (err) {
        await connection.rollback();
        console.error("Callback confirm delete error:", err);
        await answerCallbackQuery(callbackQueryId, "Gagal menghapus tiket", true);
      } finally {
        connection.release();
      }
    } else if (data.startsWith('CANCEL_DELETE_')) {
      const ticketId = data.replace('CANCEL_DELETE_', '');
      try {
        const [rows] = await db.query(`
          SELECT t.*, 
                 MAX(tech.name) as technician_name,
                 MAX(tech.phone_number) as technician_phone
          FROM tickets t
          LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
          LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
          WHERE t.id = ?
          GROUP BY t.id
        `, [ticketId]);

        if (rows.length === 0) {
          await editMessageText(chatId, messageId, "❌ Penghapusan tiket dibatalkan.");
          await answerCallbackQuery(callbackQueryId);
          return;
        }

        const ticket = rows[0];
        const message = formatTicketDetail(ticket);

        const buttons = [];
        if (ticket.status !== 'CLOSED') {
          buttons.push({ text: "✏️ Update Progres", callback_data: `UPDATE_PROG_${ticket.id}` });
          buttons.push({ text: "🔒 Tutup Tiket", callback_data: `CLOSE_TIKET_${ticket.id}` });
        }
        buttons.push({ text: "📋 Time Report", callback_data: `TR_TIKET_${ticket.id}` });
        buttons.push({ text: "🗑️ Hapus Tiket", callback_data: `DELETE_TIKET_${ticket.id}` });

        const keyboard = buildInlineKeyboard(buttons, 2);
        await editMessageText(chatId, messageId, message, { reply_markup: keyboard });
        await answerCallbackQuery(callbackQueryId, "Penghapusan dibatalkan.");
      } catch (err) {
        console.error("Callback cancel delete error:", err);
        await editMessageText(chatId, messageId, "❌ Penghapusan tiket dibatalkan.");
        await answerCallbackQuery(callbackQueryId);
      }
    }
    return;
  }

  // Restrict modifying operations to non-View users
  if (user.role === 'View') {
    return answerCallbackQuery(callbackQueryId, "Akses ditolak untuk role View.", true);
  }

  // Route callback query for CRUD
  if (data.startsWith('CREATE_')) {
    await handleCreateCallback(chatId, messageId, data, user, callbackQueryId);
  } else if (data.startsWith('UPDATE_') || data.startsWith('CLOSE_')) {
    await handleUpdateCallback(chatId, messageId, data, user, callbackQueryId);
  } else {
    await answerCallbackQuery(callbackQueryId, "Aksi tidak dikenali");
  }
}

