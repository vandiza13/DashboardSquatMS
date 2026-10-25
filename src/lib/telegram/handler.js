// src/lib/telegram/handler.js
import { db } from '@/lib/db';
import { sendMessage, answerCallbackQuery, editMessageText } from './client';
import { authenticateTelegramUser } from './auth';
import { generateTRText, escapeMarkdown, formatTicketDetail, buildInlineKeyboard } from './helpers';
import { pusherServer } from '@/lib/pusher';

// Import command handlers
import { handleStart, handleRegister, handleHelp, handleProfil, handleSwitchCommand } from './commands/start';
import { handleStats, handleRunning, handleTiket, handleTR, handleHapusCommand, sendRunningList } from './commands/read';
import { handleCreateWizard, handleCreateCallback } from './commands/create';
import { handleUpdateWizard, handleUpdateCallback } from './commands/update';
import { handleTeamCommand, handleTeamCallback } from './commands/team';
import { handleAmbilCommand, handleQuickUpdateCommand, handleQuickCloseCommand } from './commands/technician';

export async function handleTelegramMessage(body) {
  if (body.message) {
    await processMessage(body.message);
  } else if (body.callback_query) {
    await processCallbackQuery(body.callback_query);
  }
}

async function processMessage(message) {
  const chatId = message.chat.id;
  const chatType = message.chat.type || 'private'; // 'private', 'group', 'supergroup'
  const isGroup = chatType === 'group' || chatType === 'supergroup';
  const text = message.text || '';

  // 1. Unauthenticated commands
  if (text.startsWith('/start')) {
    return handleStart(chatId);
  }
  if (text.startsWith('/register')) {
    return handleRegister(chatId, text, message.from || {});
  }

  // 2. Authenticate User (Jika di grup, autentikasi berdasarkan message.from.id pengirim)
  const authId = isGroup && message.from ? message.from.id : chatId;
  const user = await authenticateTelegramUser(authId);
  if (!user) {
    if (isGroup) {
      const senderName = message.from?.username ? `@${message.from.username}` : (message.from?.first_name || 'Anda');
      return sendMessage(chatId, `⚠️ ${senderName} belum terdaftar di sistem.\nSilakan japri bot dan ketik:\n\`/register <NIK>\``);
    }
    return sendMessage(chatId, "⚠️ Anda belum terdaftar. Silakan gunakan perintah:\n• Untuk Teknisi: `/register <NIK>`\n• Untuk Staf Dashboard: `/register <username> <password>`");
  }

  // 2a. Validasi perintah khusus grup (/ambil, /update, /close)
  const isGroupOnlyCommand = text.startsWith('/ambil') || text.startsWith('/update') || text.startsWith('/close');
  if (isGroupOnlyCommand && !isGroup) {
    const cmdName = text.split(/\s+/)[0];
    return sendMessage(chatId, `⚠️ Perintah \`${cmdName}\` hanya dapat dilakukan di dalam Grup Koordinasi Teknisi.`);
  }
  if (user.role === 'View' && !text.startsWith('/tiket') && !text.startsWith('/tr') && !text.startsWith('/running') && !text.startsWith('/stats') && !text.startsWith('/help') && !text.startsWith('/profil')) {
    return sendMessage(chatId, "🚫 Akses ditolak. Akun Anda hanya memiliki hak akses 'View'.");
  }

  // 2b. Restrict commands for Teknisi role (allowed: /tiket, /tr, /running, /tim, /ambil, /update, /close, /tutup, /help, /profil, /switch)
  if (user.role === 'Teknisi') {
    const isAllowed = text.startsWith('/tiket') || 
                      text.startsWith('/tr') || 
                      text.startsWith('/running') || 
                      text.startsWith('/tim') || 
                      text.startsWith('/ambil') || 
                      text.startsWith('/update') || 
                      text.startsWith('/close') || 
                      text.startsWith('/tutup') || 
                      text.startsWith('/help') || 
                      text.startsWith('/profil') || 
                      text.startsWith('/start') || 
                      text.startsWith('/switch');
    if (!isAllowed && text.startsWith('/')) {
      return sendMessage(chatId, "🚫 Akses ditolak: Role Teknisi hanya dapat mengakses perintah /ambil, /tim, /update, /close, /tiket, /tr, dan /running.");
    }
  }

  // 3. Routing Authenticated Commands
  if (text.startsWith('/switch')) return handleSwitchCommand(chatId, text, user);
  if (text.startsWith('/help')) return handleHelp(chatId, user);
  if (text.startsWith('/profil')) return handleProfil(chatId, user);
  if (text.startsWith('/stats')) return handleStats(chatId, user);
  if (text.startsWith('/running')) return handleRunning(chatId, text, user);
  if (text.startsWith('/tiket')) return handleTiket(chatId, text, user);
  if (text.startsWith('/tr')) return handleTR(chatId, text, user);
  if (text.startsWith('/tim')) return handleTeamCommand(chatId, text, user);
  if (text.startsWith('/ambil')) return handleAmbilCommand(chatId, text, user, message);
  if (text.startsWith('/close')) return handleQuickCloseCommand(chatId, text, user, message);
  if (text.startsWith('/hapus')) {
    if (user.role !== 'SuperAdmin') {
      return sendMessage(chatId, "🚫 Akses ditolak. Hanya Super Admin yang diperbolehkan menghapus tiket.");
    }
    return handleHapusCommand(chatId, text, user);
  }
  if (text.startsWith('/buat')) return handleCreateWizard(chatId, user, text);
  if (text.startsWith('/close')) return handleQuickCloseCommand(chatId, text, user, message);
  if (text.startsWith('/update')) {
    // Jika format sekali kirim: "/update <ID> <catatan>", langsung eksekusi tanpa wizard
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 3) {
      return handleQuickUpdateCommand(chatId, text, user, message);
    }
    // Jika hanya "/update <ID>", gunakan wizard interaktif
    return handleUpdateWizard(chatId, user, text);
  }
  if (text.startsWith('/tutup')) return handleUpdateWizard(chatId, user, text);
  
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
  const fromId = callbackQuery.from?.id || chatId;
  const data = callbackQuery.data;
  const callbackQueryId = callbackQuery.id;
  const messageId = callbackQuery.message.message_id;

  try {
    // Authenticate User (bisa dari chat grup atau japri)
    const user = await authenticateTelegramUser(fromId);
    if (!user) {
      return answerCallbackQuery(callbackQueryId, "Akses ditolak: Akun Telegram Anda belum terdaftar.", true);
    }

    // Route callback query for TR (Read-only)
    if (data.startsWith('TR_TIKET_')) {
      const ticketId = data.replace('TR_TIKET_', '');
      try {
        const [rows] = await db.query(`
          SELECT t.*, 
                 MAX(CASE WHEN tt.role = 'LEAD' THEN tech.name WHEN tt.role IS NULL THEN tech.name END) as technician_name,
                 MAX(CASE WHEN tt.role = 'LEAD' THEN tech.phone_number WHEN tt.role IS NULL THEN tech.phone_number END) as technician_phone,
                 COALESCE(
                   NULLIF(TRIM(t.partner_technicians), ''),
                   GROUP_CONCAT(
                     DISTINCT CASE 
                       WHEN tt.role = 'PARTNER' 
                       THEN CONCAT(tech.name, IF(tech.phone_number IS NOT NULL AND tech.phone_number != '', CONCAT(' (', tech.phone_number, ')'), ''))
                     END 
                     SEPARATOR ', '
                   )
                 ) as partner_technicians
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
                   MAX(CASE WHEN tt.role = 'LEAD' THEN tech.name WHEN tt.role IS NULL THEN tech.name END) as technician_name,
                   MAX(CASE WHEN tt.role = 'LEAD' THEN tech.phone_number WHEN tt.role IS NULL THEN tech.phone_number END) as technician_phone,
                   COALESCE(
                     NULLIF(TRIM(t.partner_technicians), ''),
                     GROUP_CONCAT(
                       DISTINCT CASE 
                         WHEN tt.role = 'PARTNER' 
                         THEN CONCAT(tech.name, IF(tech.phone_number IS NOT NULL AND tech.phone_number != '', CONCAT(' (', tech.phone_number, ')'), ''))
                       END 
                       SEPARATOR ', '
                     )
                   ) as partner_technicians
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

    // Route callback query for Team Management (/tim)
    if (data.startsWith('TEAM_')) {
      if (user.role === 'View') {
        return answerCallbackQuery(callbackQueryId, "Akses ditolak untuk role View.", true);
      }
      if (data.startsWith('TEAM_START_') || data.startsWith('TEAM_MANAGE_START_')) {
        const ticketId = data.startsWith('TEAM_START_') 
          ? data.replace('TEAM_START_', '') 
          : data.replace('TEAM_MANAGE_START_', '');
        const [tRows] = await db.query('SELECT id_tiket FROM tickets WHERE id = ?', [ticketId]);
        if (tRows.length > 0) {
          return handleTeamCommand(chatId, `/tim ${tRows[0].id_tiket}`, user);
        }
        return answerCallbackQuery(callbackQueryId, "Tiket tidak ditemukan", true);
      }
      return handleTeamCallback(chatId, messageId, data, user, callbackQueryId);
    }

    // Callback untuk tombol [🖐️ Ambil Tiket] dari broadcast grup
    if (data.startsWith('AMBIL_TIKET_')) {
      const ticketId = data.replace('AMBIL_TIKET_', '');
      const [tRows] = await db.query('SELECT id_tiket FROM tickets WHERE id = ?', [ticketId]);
      if (tRows.length === 0) {
        return answerCallbackQuery(callbackQueryId, "Tiket tidak ditemukan", true);
      }
      await answerCallbackQuery(callbackQueryId);
      return handleAmbilCommand(chatId, `/ambil ${tRows[0].id_tiket}`, user, callbackQuery.message);
    }

    // Callback untuk bantuan tombol Close Tiket (HELP_CLOSE_<ID>)
    if (data.startsWith('HELP_CLOSE_')) {
      const idTiket = data.replace('HELP_CLOSE_', '');
      const helpText = 
`🔒 *Format Close Tiket ${escapeMarkdown(idTiket)}:*

Ketik dan kirim format berikut di grup:

\`/close ${idTiket}
Penyebab: <penyebab gangguan>
Perbaikan: <tindakan perbaikan>
Material: <material yang digunakan atau ->
Keterangan Lain: <keterangan tambahan atau ->\``;

      await sendMessage(chatId, helpText);
      return answerCallbackQuery(callbackQueryId);
    }

    // Restrict modifying operations to non-View users
    if (user.role === 'View') {
      return answerCallbackQuery(callbackQueryId, "Akses ditolak untuk role View.", true);
    }

    // Restrict ticket creation and status close/update for Teknisi role
    if (user.role === 'Teknisi' && (data.startsWith('CREATE_') || data.startsWith('UPDATE_') || data.startsWith('CLOSE_'))) {
      return answerCallbackQuery(callbackQueryId, "Akses ditolak untuk role Teknisi.", true);
    }

    // Route callback query for CRUD
    if (data.startsWith('CREATE_')) {
      await handleCreateCallback(chatId, messageId, data, user, callbackQueryId);
    } else if (data.startsWith('UPDATE_') || data.startsWith('CLOSE_')) {
      await handleUpdateCallback(chatId, messageId, data, user, callbackQueryId);
    } else {
      await answerCallbackQuery(callbackQueryId, "Aksi tidak dikenali");
    }
  } catch (globalError) {
    console.error("❌ Global Callback Error:", globalError);
    await answerCallbackQuery(callbackQueryId, "Terjadi kesalahan internal.", true);
  }
}

