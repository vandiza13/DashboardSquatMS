import { db } from '@/lib/db';
import { sendMessage, answerCallbackQuery, editMessageText } from '../client';
import { buildInlineKeyboard, escapeMarkdown } from '../helpers';
import { getSession, setSession, clearSession } from '../conversation';
import { pusherServer } from '@/lib/pusher';

export async function handleTeamCommand(chatId, text, user) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) {
    return sendMessage(chatId, "⚠️ Berikan ID Tiket. Contoh: `/tim INC52753773` atau `/tim 552`");
  }

  const idTiket = parts[1];

  try {
    const [rows] = await db.query(
      `SELECT id, id_tiket, category, subcategory, deskripsi, status 
       FROM tickets 
       WHERE id_tiket = ? OR id_tiket LIKE ? 
       ORDER BY id DESC LIMIT 1`,
      [idTiket, `%${idTiket}`]
    );

    if (rows.length === 0) {
      return sendMessage(chatId, `❌ Tiket dengan ID *${idTiket}* tidak ditemukan.`);
    }

    const ticket = rows[0];

    // Validasi Divisi (jika bukan SuperAdmin)
    if (user.role !== 'SuperAdmin' && user.division && user.division !== 'ALL') {
      const allowedMap = { 
        SQUAT: ['SQUAT'], 
        MS: ['MTEL', 'UMT', 'CENTRATAMA'], 
        ALL: ['SQUAT', 'MTEL', 'UMT', 'CENTRATAMA'] 
      };
      const allowedCategories = allowedMap[user.division] || [];
      if (!allowedCategories.includes(ticket.category)) {
        return sendMessage(chatId, `🚫 Akses ditolak: Tiket kategori *${ticket.category}* bukan divisi Anda (${user.division}).`);
      }
    }

    // Tentukan LENSA (Utama)
    let leadNik = user.nik || null;
    let leadName = user.full_name || user.display_name || user.username;
    let leadPhone = user.phone_number || '';

    // Jika bukan teknisi (misal SuperAdmin/Admin tanpa NIK teknisi), cari lead saat ini di DB
    if (!leadNik) {
      const [currentLead] = await db.query(
        `SELECT tech.nik, tech.name, tech.phone_number 
         FROM ticket_technicians tt 
         JOIN technicians tech ON tt.technician_nik = tech.nik 
         WHERE tt.ticket_id = ? AND tt.role = 'LEAD' LIMIT 1`,
        [ticket.id]
      );
      if (currentLead.length > 0) {
        leadNik = currentLead[0].nik;
        leadName = currentLead[0].name;
        leadPhone = currentLead[0].phone_number || '';
      }
    }

    if (!leadNik) {
      return sendMessage(chatId, "⚠️ Akun Telegram Anda belum ditautkan ke NIK Teknisi. Gunakan `/register <NIK>` terlebih dahulu.");
    }

    // Ambil data partner saat ini di DB
    const [currentPartners] = await db.query(
      `SELECT tech.nik, tech.name, tech.phone_number 
       FROM ticket_technicians tt 
       JOIN technicians tech ON tt.technician_nik = tech.nik 
       WHERE tt.ticket_id = ? AND tt.role = 'PARTNER' 
       ORDER BY tech.name ASC`,
      [ticket.id]
    );

    const partners = currentPartners
      .filter(p => String(p.nik) !== String(leadNik))
      .map(p => ({
        nik: p.nik,
        name: p.name,
        phone: p.phone_number || ''
      }));

    // Simpan ke sesi percakapan
    const sessionData = {
      ticket_id: ticket.id,
      id_tiket: ticket.id_tiket,
      category: ticket.category,
      status: ticket.status,
      deskripsi: ticket.deskripsi || '',
      division: user.division === 'MS' ? 'MS' : (ticket.category === 'SQUAT' ? 'SQUAT' : 'MS'),
      lead_nik: leadNik,
      lead_name: leadName,
      lead_phone: leadPhone,
      partners: partners
    };

    await setSession(chatId, 'TEAM_MANAGE', sessionData);

    const { message, keyboard } = formatTeamCard(sessionData);
    await sendMessage(chatId, message, { reply_markup: keyboard });

  } catch (err) {
    console.error("Team Command Error:", err);
    await sendMessage(chatId, "❌ Terjadi kesalahan saat memproses perintah /tim.");
  }
}

export function formatTeamCard(data) {
  const shortDesc = data.deskripsi 
    ? (data.deskripsi.length > 65 ? data.deskripsi.slice(0, 65) + '...' : data.deskripsi)
    : '-';

  let partnerListText = '';
  if (data.partners && data.partners.length > 0) {
    partnerListText = data.partners.map((p, idx) => `   ${idx + 1}. ${p.name} (${p.nik})`).join('\n');
  } else {
    partnerListText = '   _(Belum ada partner/support)_';
  }

  const message = `👷‍♂️ *LURUSKAN TIM TEKNISI*
🎫 *Tiket*: ${escapeMarkdown(data.id_tiket)} (${data.status})
📝 *Subjek*: ${escapeMarkdown(shortDesc)}
─────────────────────────
🔵 *LENSA (Utama)*:
👉 *${escapeMarkdown(data.lead_name)}* (${escapeMarkdown(data.lead_nik)}) _[Otomatis Akun Anda]_

🟣 *PARTNER (Support)*:
${escapeMarkdown(partnerListText)}
─────────────────────────
_Klik tombol di bawah untuk memilih partner sekaligus:_`;

  const buttons = [
    { text: `👥 Pilih Partner (${data.partners.length}/4)`, callback_data: `TEAM_ADD_PARTNER_${data.ticket_id}` },
    { text: "💾 Simpan & Selesai", callback_data: `TEAM_SAVE_${data.ticket_id}` },
    { text: "❌ Batal", callback_data: `TEAM_CANCEL_${data.ticket_id}` }
  ];

  const keyboard = buildInlineKeyboard(buttons, 1);
  return { message, keyboard };
}

export async function renderPartnerChecklist(sessionData) {
  const division = sessionData.division || (sessionData.category === 'SQUAT' ? 'SQUAT' : 'MS');
  const [techRows] = await db.query(
    `SELECT nik, name, phone_number 
     FROM technicians 
     WHERE is_active = 1 AND division = ? 
     ORDER BY name ASC`,
    [division]
  );

  // Filter: Jangan sertakan Teknisi Utama (LEAD)
  const candidateTechs = techRows.filter(t => String(t.nik) !== String(sessionData.lead_nik));

  const partnerNiks = sessionData.partners.map(p => String(p.nik));

  // Buat tombol toggle untuk setiap teknisi kandidat
  const buttons = candidateTechs.map(t => {
    const isSelected = partnerNiks.includes(String(t.nik));
    const prefix = isSelected ? '✅ ' : '⬜ ';
    return {
      text: `${prefix}${t.name}`,
      callback_data: `TEAM_TOGGLE_${t.nik}`
    };
  });

  const controlButtons = [];
  controlButtons.push({
    text: `✅ Selesai Memilih (${sessionData.partners.length}/4)`,
    callback_data: `TEAM_BACK_${sessionData.ticket_id}`
  });

  if (sessionData.partners.length > 0) {
    controlButtons.push({
      text: "🗑️ Kosongkan Pilihan",
      callback_data: `TEAM_CLEAR_${sessionData.ticket_id}`
    });
  }

  // Keyboard: candidate buttons in 2 columns, control buttons in 1 column
  const candidateGrid = buildInlineKeyboard(buttons, 2).inline_keyboard;
  const controlGrid = buildInlineKeyboard(controlButtons, 1).inline_keyboard;
  const combinedKeyboard = { inline_keyboard: [...candidateGrid, ...controlGrid] };

  let selectedNamesText = '_(Belum ada yang dipilih)_';
  if (sessionData.partners.length > 0) {
    selectedNamesText = sessionData.partners.map((p, i) => `\n   ${i + 1}. *${escapeMarkdown(p.name)}*`).join('');
  }

  const message = `👥 *PILIH PARTNER TEKNISI (${division})*
🎫 Tiket: *${escapeMarkdown(sessionData.id_tiket)}*
─────────────────────────
🟣 *Partner Terpilih (${sessionData.partners.length}/4)*:${selectedNamesText}
─────────────────────────
_Klik nama teknisi di bawah untuk mencentang (✅) / membatalkan (⬜):_`;

  return { message, keyboard: combinedKeyboard };
}

export async function handleTeamCallback(chatId, messageId, callbackData, user, callbackQueryId) {
  const session = await getSession(chatId);
  if (!session || session.step !== 'TEAM_MANAGE' || !session.data) {
    return answerCallbackQuery(callbackQueryId, "Sesi telah berakhir. Silakan ketik /tim <ID_TIKET> kembali.", true);
  }

  const sessionData = session.data;

  // 1. BUKA MENU CHECKLIST PARTNER
  if (callbackData.startsWith('TEAM_ADD_PARTNER_')) {
    try {
      const { message, keyboard } = await renderPartnerChecklist(sessionData);
      await editMessageText(chatId, messageId, message, { reply_markup: keyboard });
      return answerCallbackQuery(callbackQueryId);
    } catch (err) {
      console.error("Open Partner Checklist Error:", err);
      return answerCallbackQuery(callbackQueryId, "Gagal memuat daftar partner.", true);
    }
  }

  // 2. TOGGLE CHECKLIST PARTNER (CENTANG / BATAL SEKALIGUS)
  if (callbackData.startsWith('TEAM_TOGGLE_')) {
    const toggledNik = callbackData.replace('TEAM_TOGGLE_', '');
    const isAlreadySelected = sessionData.partners.some(p => String(p.nik) === String(toggledNik));

    if (isAlreadySelected) {
      // Hapus dari partner
      sessionData.partners = sessionData.partners.filter(p => String(p.nik) !== String(toggledNik));
      await setSession(chatId, 'TEAM_MANAGE', sessionData);

      const { message, keyboard } = await renderPartnerChecklist(sessionData);
      await editMessageText(chatId, messageId, message, { reply_markup: keyboard });
      return answerCallbackQuery(callbackQueryId, "Partner dibatalkan.");
    } else {
      // Cek batas maksimal 4
      if (sessionData.partners.length >= 4) {
        return answerCallbackQuery(callbackQueryId, "⚠️ Maksimal 4 partner!", true);
      }

      try {
        const [rows] = await db.query('SELECT nik, name, phone_number FROM technicians WHERE nik = ?', [toggledNik]);
        if (rows.length > 0) {
          const picked = rows[0];
          sessionData.partners.push({
            nik: picked.nik,
            name: picked.name,
            phone: picked.phone_number || ''
          });

          await setSession(chatId, 'TEAM_MANAGE', sessionData);

          const { message, keyboard } = await renderPartnerChecklist(sessionData);
          await editMessageText(chatId, messageId, message, { reply_markup: keyboard });
          return answerCallbackQuery(callbackQueryId, `${picked.name} ditambahkan! (${sessionData.partners.length}/4)`);
        }
      } catch (err) {
        console.error("Toggle Partner Error:", err);
        return answerCallbackQuery(callbackQueryId, "Gagal menambahkan partner.", true);
      }
    }
  }

  // 3. KOSONGKAN PILIHAN PARTNER
  if (callbackData.startsWith('TEAM_CLEAR_')) {
    sessionData.partners = [];
    await setSession(chatId, 'TEAM_MANAGE', sessionData);

    const { message, keyboard } = await renderPartnerChecklist(sessionData);
    await editMessageText(chatId, messageId, message, { reply_markup: keyboard });
    return answerCallbackQuery(callbackQueryId, "Semua partner dikosongkan.");
  }

  // 4. SELESAI MEMILIH / KEMBALI KE KARTU TIM
  if (callbackData.startsWith('TEAM_BACK_')) {
    const { message, keyboard } = formatTeamCard(sessionData);
    await editMessageText(chatId, messageId, message, { reply_markup: keyboard });
    return answerCallbackQuery(callbackQueryId, "Pilihan partner disimpan.");
  }

  // 5. BATAL
  if (callbackData.startsWith('TEAM_CANCEL_')) {
    await clearSession(chatId);
    await editMessageText(chatId, messageId, `❌ Pengaturan tim untuk tiket *${escapeMarkdown(sessionData.id_tiket)}* dibatalkan.`);
    return answerCallbackQuery(callbackQueryId, "Dibatalkan");
  }

  // 6. SIMPAN KE DATABASE
  if (callbackData.startsWith('TEAM_SAVE_')) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Hapus relasi teknisi lama pada tiket ini
      await connection.query('DELETE FROM ticket_technicians WHERE ticket_id = ?', [sessionData.ticket_id]);

      // Masukkan LEAD (LENSA)
      if (sessionData.lead_nik) {
        await connection.query(
          `INSERT INTO ticket_technicians (ticket_id, technician_nik, role) VALUES (?, ?, 'LEAD')`,
          [sessionData.ticket_id, sessionData.lead_nik]
        );
      }

      // Masukkan PARTNER
      const partnerNames = [];
      for (const p of sessionData.partners) {
        await connection.query(
          `INSERT INTO ticket_technicians (ticket_id, technician_nik, role) VALUES (?, ?, 'PARTNER')`,
          [sessionData.ticket_id, p.nik]
        );
        partnerNames.push(`${p.name}${p.phone ? ` (${p.phone})` : ''}`);
      }

      const partnerString = partnerNames.length > 0 ? partnerNames.join(', ') : null;

      // Update string partner_technicians di tabel tickets
      await connection.query(
        `UPDATE tickets SET partner_technicians = ?, last_update_time = NOW() WHERE id = ?`,
        [partnerString, sessionData.ticket_id]
      );

      // Insert ke history
      const historyNote = `Tim diluruskan via Bot Telegram: LENSA = ${sessionData.lead_name} (${sessionData.lead_nik})${partnerNames.length > 0 ? `, Partner = ${partnerNames.join(', ')}` : ' (Tanpa Partner)'}`;
      await connection.query(
        `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, 'Bot Telegram', NOW())`,
        [sessionData.ticket_id, historyNote]
      );

      await connection.commit();

      // Trigger Pusher
      try {
        await pusherServer.trigger('dashboard-channel', 'ticket-update', {
          message: `Tim tiket ${sessionData.id_tiket} diluruskan via Telegram`,
          type: 'UPDATE_TICKET',
          ticketId: sessionData.ticket_id
        });
      } catch (e) {
        console.error("Pusher error:", e);
      }

      const finishText = `🎉 *BERHASIL DILURUSKAN!*

🎫 Tiket: *${escapeMarkdown(sessionData.id_tiket)}*
🔵 *LENSA (Utama)*: ${escapeMarkdown(sessionData.lead_name)}
🟣 *PARTNER*: ${escapeMarkdown(partnerNames.length > 0 ? partnerNames.join(', ') : '-') }

✅ Data telah disimpan & poin produktifitas otomatis diperbarui di leaderboard.`;

      await editMessageText(chatId, messageId, finishText);
      await clearSession(chatId);
      return answerCallbackQuery(callbackQueryId, "Tim berhasil disimpan!");

    } catch (err) {
      await connection.rollback();
      console.error("Save Team Error:", err);
      return answerCallbackQuery(callbackQueryId, "Gagal menyimpan data tim.", true);
    } finally {
      connection.release();
    }
  }
}
