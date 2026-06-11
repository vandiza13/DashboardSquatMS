// src/lib/telegram/handler.js
import { db } from '@/lib/db';
import { sendMessage, answerCallbackQuery } from './client';
import { authenticateTelegramUser } from './auth';
import { generateTRText } from './helpers';

// Import command handlers
import { handleStart, handleRegister, handleHelp, handleProfil } from './commands/start';
import { handleStats, handleRunning, handleTiket, handleTR } from './commands/read';
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
  if (text.startsWith('/running')) return handleRunning(chatId, user);
  if (text.startsWith('/tiket')) return handleTiket(chatId, text, user);
  if (text.startsWith('/tr')) return handleTR(chatId, text, user);
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

