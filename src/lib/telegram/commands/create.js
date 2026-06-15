import { db } from '@/lib/db';
import { sendMessage, answerCallbackQuery, editMessageText } from '../client';
import { buildInlineKeyboard, escapeMarkdown } from '../helpers';
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
    await sendMessage(chatId, `📝 Kategori: ${escapeMarkdown(data.category)} - ${escapeMarkdown(data.subcategory)}\nID Tiket: *${escapeMarkdown(data.id_tiket)}*\n\nKetikan *Deskripsi Gangguan*:`);
    return true;
  }

  if (step === 'CREATE_DESKRIPSI') {
    data.deskripsi = text.trim();
    await setSession(chatId, 'CREATE_STO', data);
    await sendMessage(chatId, "📝 Ketikan kode *STO* (contoh: CBG). Jika tidak ada, ketik `-`:");
    return true;
  }

  if (step === 'CREATE_STO') {
    try {
      console.log(`[DEBUG] CREATE_STO input: ${text.trim()}`);
      data.sto = text.trim() === '-' ? null : text.trim().toUpperCase();
      await setSession(chatId, 'CREATE_TIKET_TIME', data);
      await sendMessage(chatId, "⏰ Ketikan Waktu Tiket Open (format: YYYY-MM-DD HH:mm, contoh: 2026-06-15 14:30):");
      return true;
    } catch (e) {
      console.error(`[ERROR CREATE_STO]:`, e);
      await sendMessage(chatId, "❌ Terjadi kesalahan pada server saat memproses STO.");
      return true;
    }
  }

  if (step === 'CREATE_TIKET_TIME') {
    try {
      const timeText = text.trim();
      console.log(`[DEBUG] CREATE_TIKET_TIME input: ${timeText}`);
      // Validasi format YYYY-MM-DD HH:mm
      const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      if (!regex.test(timeText)) {
        await sendMessage(chatId, "❌ Format salah! Harap masukkan dengan format YYYY-MM-DD HH:mm (contoh: 2026-06-15 14:30):");
        return true;
      }
      data.tiket_time = timeText;
      await askTechnician(chatId, data);
      return true;
    } catch (e) {
      console.error(`[ERROR CREATE_TIKET_TIME]:`, e);
      await sendMessage(chatId, "❌ Terjadi kesalahan pada server saat memproses Waktu Tiket.");
      return true;
    }
  }

  return false;
}

async function askTechnician(chatId, sessionData) {
  const div = sessionData.category === 'SQUAT' ? 'SQUAT' : 'MS';
  const [techs] = await db.query(
    'SELECT nik, name, phone_number FROM technicians WHERE is_active = 1 AND division = ? ORDER BY name ASC',
    [div]
  );
  
  const buttons = techs.map(t => ({
    text: t.name,
    callback_data: `CREATE_TECH_${t.nik}`
  }));
  
  buttons.push({ text: "⏩ Belum Assign (Lewati)", callback_data: "CREATE_TECH_NONE" });
  buttons.push({ text: "❌ Batal", callback_data: "CREATE_CANCEL" });
  
  // Build keyboard dengan 2 kolom
  const inline_keyboard = [];
  let row = [];
  for (const btn of buttons) {
    row.push(btn);
    if (row.length === 2) {
      inline_keyboard.push(row);
      row = [];
    }
  }
  if (row.length > 0) {
    inline_keyboard.push(row);
  }
  
  await setSession(chatId, 'CREATE_SELECT_TECH', sessionData);
  await sendMessage(chatId, "👷 *Pilih/Assign Teknisi Utama (LENSA):*", {
    reply_markup: { inline_keyboard }
  });
}

async function showPartnerSelection(chatId, messageId, sessionData) {
  const div = sessionData.category === 'SQUAT' ? 'SQUAT' : 'MS';
  const [techs] = await db.query(
    'SELECT nik, name, phone_number FROM technicians WHERE is_active = 1 AND division = ? ORDER BY name ASC',
    [div]
  );
  
  // Filter out the main technician and already selected partners
  const availableTechs = techs.filter(t => 
    String(t.nik) !== String(sessionData.technician_nik) && 
    !(sessionData.partner_niks || []).includes(String(t.nik))
  );
  
  // Map selected NIKs to names for display
  const partnerNames = (sessionData.partner_niks || []).map(nik => {
    const t = techs.find(tech => String(tech.nik) === String(nik));
    return t ? t.name : nik;
  });
  
  const partnerListStr = partnerNames.length > 0 ? partnerNames.join(', ') : 'Tidak ada';
  
  // Build keyboard buttons
  const buttons = [];
  
  // If we haven't reached max 4 partners, show remaining available techs
  if ((sessionData.partner_niks || []).length < 4) {
    availableTechs.forEach(t => {
      buttons.push({
        text: `+ ${t.name}`,
        callback_data: `CREATE_PART_ADD_${t.nik}`
      });
    });
  }
  
  const inline_keyboard = [];
  let row = [];
  for (const btn of buttons) {
    row.push(btn);
    if (row.length === 2) {
      inline_keyboard.push(row);
      row = [];
    }
  }
  if (row.length > 0) {
    inline_keyboard.push(row);
  }
  
  // Control buttons
  const controlRow = [];
  controlRow.push({ text: "✅ Selesai", callback_data: "CREATE_PART_DONE" });
  if ((sessionData.partner_niks || []).length === 0) {
    controlRow.push({ text: "⏩ Tanpa Partner (Lewati)", callback_data: "CREATE_PART_DONE" });
  }
  controlRow.push({ text: "❌ Batal", callback_data: "CREATE_CANCEL" });
  
  inline_keyboard.push(controlRow);
  
  await setSession(chatId, 'CREATE_SELECT_PARTNER', sessionData);
  
  const mainTechObj = techs.find(t => String(t.nik) === String(sessionData.technician_nik));
  const mainTechName = mainTechObj ? mainTechObj.name : 'Belum Assign';
  
  const textMsg = `👥 *Pilih Partner / Support (Maksimal 4)*\n\n` +
                  `*Teknisi Utama:* ${escapeMarkdown(mainTechName)}\n` +
                  `*Partner Terpilih:* ${escapeMarkdown(partnerListStr)}\n\n` +
                  `Silakan ketuk nama teknisi di bawah untuk menambahkannya sebagai partner:`;
                  
  await editMessageText(chatId, messageId, textMsg, {
    reply_markup: { inline_keyboard }
  });
}

async function showFinalConfirmation(chatId, messageId, sessionData) {
  const [techs] = await db.query('SELECT nik, name, phone_number FROM technicians WHERE is_active = 1');
  
  const mainTechObj = techs.find(t => String(t.nik) === String(sessionData.technician_nik));
  const mainTechStr = mainTechObj ? `${mainTechObj.name} (${mainTechObj.phone_number || '-'})` : 'Belum Assign';
  
  const partnerNames = (sessionData.partner_niks || []).map(nik => {
    const t = techs.find(tech => String(tech.nik) === String(nik));
    return t ? `${t.name} (${t.phone_number || '-'})` : nik;
  });
  const partnerStr = partnerNames.length > 0 ? partnerNames.join(', ') : '-';
  
  // Format partner_technicians exact string for DB insertion
  sessionData.partner_technicians = partnerNames.length > 0 ? partnerNames.join(', ') : null;

  const confirmText = `✅ *KONFIRMASI TIKET BARU*
─────────────────
Kategori: ${escapeMarkdown(sessionData.category)} \\- ${escapeMarkdown(sessionData.subcategory)}
Prioritas: ${escapeMarkdown(sessionData.priority || '-')}
ID Tiket: ${escapeMarkdown(sessionData.id_tiket)}
Waktu Tiket Open: ${escapeMarkdown(sessionData.tiket_time)}
STO: ${escapeMarkdown(sessionData.sto || '-')}
Deskripsi: ${escapeMarkdown(sessionData.deskripsi)}
Teknisi Utama: ${escapeMarkdown(mainTechStr)}
Partner: ${escapeMarkdown(partnerStr)}
─────────────────`;

  const keyboard = buildInlineKeyboard([
    { text: "✅ Simpan", callback_data: "CREATE_SAVE" },
    { text: "❌ Batal", callback_data: "CREATE_CANCEL" }
  ]);

  await editMessageText(chatId, messageId, confirmText, { reply_markup: keyboard });
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

  if (data.startsWith('CREATE_TECH_')) {
    const nik = data.replace('CREATE_TECH_', '');
    sessionData.technician_nik = nik === 'NONE' ? null : nik;
    sessionData.partner_niks = [];
    await showPartnerSelection(chatId, messageId, sessionData);
    return answerCallbackQuery(callbackQueryId);
  }

  if (data.startsWith('CREATE_PART_ADD_')) {
    const nik = data.replace('CREATE_PART_ADD_', '');
    if (!sessionData.partner_niks) {
      sessionData.partner_niks = [];
    }
    if (sessionData.partner_niks.length < 4 && !sessionData.partner_niks.includes(nik)) {
      sessionData.partner_niks.push(nik);
    }
    await showPartnerSelection(chatId, messageId, sessionData);
    return answerCallbackQuery(callbackQueryId);
  }

  if (data === 'CREATE_PART_DONE') {
    await showFinalConfirmation(chatId, messageId, sessionData);
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

      const formattedTime = sessionData.tiket_time ? `${sessionData.tiket_time}:00` : new Date();

      const [result] = await connection.query(
        `INSERT INTO tickets 
        (category, subcategory, priority, id_tiket, tiket_time, deskripsi, status, created_by_user_id, updated_by_user_id, last_update_time, partner_technicians, sto, branch) 
        VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, NOW(), ?, ?, ?)`,
        [
          sessionData.category, sessionData.subcategory, sessionData.priority || null, 
          sessionData.id_tiket, formattedTime, sessionData.deskripsi, user.user_id, user.user_id, 
          sessionData.partner_technicians || null, sessionData.sto, finalBranch
        ]
      );

      const ticketId = result.insertId;

      if (sessionData.technician_nik) {
        await connection.query(
          'INSERT INTO ticket_technicians (ticket_id, technician_nik) VALUES (?, ?)',
          [ticketId, sessionData.technician_nik]
        );
      }

      await connection.query(
        `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())`,
        [ticketId, `Tiket dibuat via Telegram (OPEN)`, user.username]
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

      await editMessageText(chatId, messageId, `✅ *TIKET BERHASIL DIBUAT!*\nID Tiket: ${escapeMarkdown(sessionData.id_tiket)}`);
      await clearSession(chatId);
    } catch (e) {
      await connection.rollback();
      console.error("Create DB error:", e);
      if (e.code === 'ER_DUP_ENTRY') {
        await editMessageText(chatId, messageId, `❌ Gagal: ID Tiket *${escapeMarkdown(sessionData.id_tiket)}* sudah ada.`);
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
