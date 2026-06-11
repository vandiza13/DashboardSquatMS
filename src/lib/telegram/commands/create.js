import { db } from '@/lib/db';
import { sendMessage, answerCallbackQuery, editMessageText } from '../client';
import { buildInlineKeyboard } from '../helpers';
import { getSession, setSession, clearSession } from '../conversation';
import { pusherServer } from '@/lib/pusher';

export async function handleCreateWizard(chatId, user, text, isFollowUp = false) {
  if (!isFollowUp) {
    // Mulai Wizard
    await setSession(chatId, 'CREATE_CATEGORY', {});
    
    const categories = ['SQUAT', 'MTEL', 'UMT', 'CENTRATAMA'];
    
    // Filter divisi if needed
    let allowedCategories = categories;
    if (user.role !== 'SuperAdmin' && user.division !== 'ALL') {
      const allowedMap = { SQUAT: ['SQUAT'], MS: ['MTEL', 'UMT', 'CENTRATAMA'] };
      allowedCategories = allowedMap[user.division] || [];
    }

    if (allowedCategories.length === 0) {
      await clearSession(chatId);
      return sendMessage(chatId, "🚫 Anda tidak memiliki akses untuk membuat tiket di kategori apa pun.");
    }

    const buttons = allowedCategories.map(c => ({ text: c, callback_data: `CREATE_CAT_${c}` }));
    buttons.push({ text: "❌ Batal", callback_data: `CREATE_CANCEL` });

    const keyboard = buildInlineKeyboard(buttons);
    await sendMessage(chatId, "📋 *Pilih Kategori Tiket:*", { reply_markup: keyboard });
    return true;
  }

  // Handle Text inputs during Wizard
  const session = await getSession(chatId);
  if (!session || !session.step.startsWith('CREATE_')) return false;

  const { step, data } = session;

  if (step === 'CREATE_ID_TIKET') {
    data.id_tiket = text.trim();
    await setSession(chatId, 'CREATE_DESKRIPSI', data);
    await sendMessage(chatId, `📝 Kategori: ${data.category} - ${data.subcategory}\nID Tiket: *${data.id_tiket}*\n\nKetikan *Deskripsi Gangguan*:`);
    return true;
  }

  if (step === 'CREATE_DESKRIPSI') {
    data.deskripsi = text.trim();
    await setSession(chatId, 'CREATE_STO', data);
    await sendMessage(chatId, "📝 Ketikan kode *STO* (contoh: CBG). Jika tidak ada, ketik `-`:");
    return true;
  }

  if (step === 'CREATE_STO') {
    data.sto = text.trim() === '-' ? null : text.trim().toUpperCase();
    await setSession(chatId, 'CREATE_CONFIRM', data);
    
    // Konfirmasi Akhir
    let confirmText = `✅ *KONFIRMASI TIKET BARU*
─────────────────
Kategori: ${data.category} - ${data.subcategory}
Prioritas: ${data.priority || '-'}
ID Tiket: ${data.id_tiket}
STO: ${data.sto || '-'}
Deskripsi: ${data.deskripsi}
─────────────────`;

    const keyboard = buildInlineKeyboard([
      { text: "✅ Simpan", callback_data: "CREATE_SAVE" },
      { text: "❌ Batal", callback_data: "CREATE_CANCEL" }
    ]);

    await sendMessage(chatId, confirmText, { reply_markup: keyboard });
    return true;
  }

  return false;
}

export async function handleCreateCallback(chatId, messageId, data, user, callbackQueryId) {
  const session = await getSession(chatId);
  if (!session || !session.step.startsWith('CREATE_')) {
    return answerCallbackQuery(callbackQueryId, "Sesi kadaluarsa. Silakan mulai ulang /buat.", true);
  }

  let sessionData = session.data;

  if (data === 'CREATE_CANCEL') {
    await clearSession(chatId);
    await editMessageText(chatId, messageId, "❌ Pembuatan tiket dibatalkan.");
    return answerCallbackQuery(callbackQueryId);
  }

  if (data.startsWith('CREATE_CAT_')) {
    const cat = data.replace('CREATE_CAT_', '');
    sessionData.category = cat;

    let subcats = [];
    if (cat === 'SQUAT') subcats = ['TSEL', 'OLO'];
    else if (cat === 'MTEL') subcats = ['TIS', 'MMP', 'FIBERISASI'];
    else if (cat === 'UMT') subcats = ['UMT'];
    else if (cat === 'CENTRATAMA') subcats = ['FSI'];

    const buttons = subcats.map(s => ({ text: s, callback_data: `CREATE_SUB_${s}` }));
    buttons.push({ text: "❌ Batal", callback_data: `CREATE_CANCEL` });

    await setSession(chatId, 'CREATE_SUBCATEGORY', sessionData);
    await editMessageText(chatId, messageId, `Kategori: *${cat}*\n\n📋 *Pilih Subkategori:*`, { reply_markup: buildInlineKeyboard(buttons) });
    return answerCallbackQuery(callbackQueryId);
  }

  if (data.startsWith('CREATE_SUB_')) {
    const subcat = data.replace('CREATE_SUB_', '');
    sessionData.subcategory = subcat;

    if (sessionData.category === 'SQUAT' && subcat === 'TSEL') {
      const priorities = ['PREMIUM', 'CRITICAL', 'MAJOR', 'MINOR', 'LOW', 'CNQ'];
      const buttons = priorities.map(p => ({ text: p, callback_data: `CREATE_PRI_${p}` }));
      
      await setSession(chatId, 'CREATE_PRIORITY', sessionData);
      await editMessageText(chatId, messageId, `Subkategori: *${subcat}*\n\n📋 *Pilih Prioritas:*`, { reply_markup: buildInlineKeyboard(buttons) });
    } else if (sessionData.category === 'SQUAT' && subcat === 'OLO') {
      const priorities = ['NON-GAMAS', 'GAMAS', 'QUALITY'];
      const buttons = priorities.map(p => ({ text: p, callback_data: `CREATE_PRI_${p}` }));
      
      await setSession(chatId, 'CREATE_PRIORITY', sessionData);
      await editMessageText(chatId, messageId, `Subkategori: *${subcat}*\n\n📋 *Pilih Prioritas:*`, { reply_markup: buildInlineKeyboard(buttons) });
    } else {
      // Langsung ke ID Tiket
      await setSession(chatId, 'CREATE_ID_TIKET', sessionData);
      await editMessageText(chatId, messageId, `Subkategori: *${subcat}*\n\n📝 Ketikan *ID Tiket* (contoh: TR-1234):`);
    }
    return answerCallbackQuery(callbackQueryId);
  }

  if (data.startsWith('CREATE_PRI_')) {
    const pri = data.replace('CREATE_PRI_', '');
    sessionData.priority = pri;
    await setSession(chatId, 'CREATE_ID_TIKET', sessionData);
    await editMessageText(chatId, messageId, `Prioritas: *${pri}*\n\n📝 Ketikan *ID Tiket* (contoh: TR-1234):`);
    return answerCallbackQuery(callbackQueryId);
  }

  if (data === 'CREATE_SAVE') {
    // 1. Simpan ke database
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      let finalBranch = null;
      if (sessionData.sto) {
        const [mappingRes] = await connection.query('SELECT branch FROM sto_branch_mappings WHERE sto = ?', [sessionData.sto]);
        if (mappingRes.length > 0) {
          finalBranch = mappingRes[0].branch;
        }
      }

      const [result] = await connection.query(
        `INSERT INTO tickets 
        (category, subcategory, priority, id_tiket, tiket_time, deskripsi, status, created_by_user_id, updated_by_user_id, last_update_time, sto, branch) 
        VALUES (?, ?, ?, ?, NOW(), ?, 'OPEN', ?, ?, NOW(), ?, ?)`,
        [
          sessionData.category, sessionData.subcategory, sessionData.priority || null, 
          sessionData.id_tiket, sessionData.deskripsi, user.user_id, user.user_id, 
          sessionData.sto, finalBranch
        ]
      );

      await connection.query(
        `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())`,
        [result.insertId, `Tiket dibuat via Telegram (OPEN)`, user.username]
      );

      await connection.commit();

      // Trigger Pusher
      try {
        await pusherServer.trigger('dashboard-channel', 'ticket-update', {
          message: `Tiket ${sessionData.id_tiket} dibuat via Telegram`,
          type: 'NEW_TICKET',
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.error("Pusher error:", e);
      }

      await editMessageText(chatId, messageId, `✅ *TIKET BERHASIL DIBUAT!*\nID Tiket: ${sessionData.id_tiket}`);
      await clearSession(chatId);
    } catch (e) {
      await connection.rollback();
      console.error("Create DB error:", e);
      if (e.code === 'ER_DUP_ENTRY') {
        await editMessageText(chatId, messageId, `❌ Gagal: ID Tiket *${sessionData.id_tiket}* sudah ada.`);
      } else {
        await editMessageText(chatId, messageId, `❌ Terjadi kesalahan saat menyimpan ke database.`);
      }
      await clearSession(chatId);
    } finally {
      connection.release();
    }
    return answerCallbackQuery(callbackQueryId);
  }
}
