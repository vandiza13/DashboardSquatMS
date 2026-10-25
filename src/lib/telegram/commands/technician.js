import { db } from '@/lib/db';
import { sendMessage } from '../client';
import { buildInlineKeyboard } from '../helpers';
import { pusherServer } from '@/lib/pusher';
import { appendTicketToSheet } from '@/lib/googleSheets';

/**
 * Helper untuk menembak API Lensa
 */
async function hitLensaAPI(sto, ticket, nik) {
  const lensaApiUrl = process.env.LENSA_API_URL || 'http://36.93.188.84:8793/process';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const payload = {
      sto: sto || '',
      ticket: ticket,
      nik: nik
    };

    const res = await fetch(lensaApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return { success: true };
    }
    return { success: false, reason: `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

/**
 * 1. COMMAND: /ambil <ID_TIKET>
 */
export async function handleAmbilCommand(chatId, text, user, rawMessage = {}) {
  // Hanya teknisi atau admin/superadmin yang bisa ambil
  const techNik = user.nik;
  const techName = user.full_name || user.display_name || user.username;

  if (!techNik && user.role !== 'SuperAdmin' && user.role !== 'Admin') {
    return sendMessage(chatId, "⚠️ Akun Telegram Anda belum tertaut ke NIK Teknisi. Gunakan `/register <NIK>` terlebih dahulu.");
  }

  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) {
    return sendMessage(chatId, "⚠️ Format salah.\nContoh: `/ambil INC54326005`");
  }

  const idTiketInput = parts[1];
  const isForce = parts.includes('force');

  try {
    // Cari tiket berdasarkan id_tiket
    const [rows] = await db.query(
      `SELECT t.*, 
              (SELECT tt.technician_nik FROM ticket_technicians tt WHERE tt.ticket_id = t.id AND tt.role = 'LEAD' LIMIT 1) as current_lead_nik,
              (SELECT tech.name FROM ticket_technicians tt JOIN technicians tech ON tt.technician_nik = tech.nik WHERE tt.ticket_id = t.id AND tt.role = 'LEAD' LIMIT 1) as current_lead_name
       FROM tickets t 
       WHERE t.id_tiket = ? OR t.id_tiket LIKE ? 
       ORDER BY t.id DESC LIMIT 1`,
      [idTiketInput, `%${idTiketInput}`]
    );

    if (rows.length === 0) {
      return sendMessage(chatId, `❌ Tiket *${idTiketInput}* tidak ditemukan di sistem.`);
    }

    const ticket = rows[0];

    // Cek jika sudah closed
    if (ticket.status === 'CLOSED') {
      return sendMessage(chatId, `⚠️ Tiket *${ticket.id_tiket}* sudah berstatus CLOSED.`);
    }

    // Cek apakah sudah ada teknisi lain yang memegang tiket ini
    const assignedNik = techNik || ticket.current_lead_nik;
    if (!assignedNik) {
      return sendMessage(chatId, "⚠️ NIK Teknisi tidak ditemukan.");
    }

    if (ticket.current_lead_nik && String(ticket.current_lead_nik) !== String(assignedNik) && !isForce) {
      return sendMessage(
        chatId, 
        `⚠️ Tiket *${ticket.id_tiket}* saat ini sudah dipegang oleh *${ticket.current_lead_name || ticket.current_lead_nik}*.\n\nJika ingin mengambil alih, ketik:\n\`/ambil ${ticket.id_tiket} force\``
      );
    }

    // Update database dalam transaksi
    const connection = await db.getConnection();
    let lensaStatusResult = 'SUCCESS';
    try {
      await connection.beginTransaction();

      // Hapus lead lama dan masukkan lead baru
      await connection.query("DELETE FROM ticket_technicians WHERE ticket_id = ? AND role = 'LEAD'", [ticket.id]);
      await connection.query("INSERT INTO ticket_technicians (ticket_id, technician_nik, role) VALUES (?, ?, 'LEAD')", [ticket.id, assignedNik]);

      // Status di database adalah ENUM('OPEN','SC','CLOSED')
      // Tetap pertahankan status saat ini (misal OPEN atau SC), tidak diubah ke string 'PROGRESS' (panjang 8 karakter)
      await connection.query(
        "UPDATE tickets SET last_update_time = NOW() WHERE id = ?",
        [ticket.id]
      );

      // Catat riwayat
      const updaterName = techName + (assignedNik ? ` (${assignedNik})` : '');
      await connection.query(
        "INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())",
        [ticket.id, `Tiket diambil via Bot Telegram oleh ${updaterName}`, updaterName]
      );

      await connection.commit();

      // Hit API Lensa jika kategori SQUAT
      if (ticket.category === 'SQUAT') {
        const lensaRes = await hitLensaAPI(ticket.sto, ticket.id_tiket, assignedNik);
        if (!lensaRes.success) {
          lensaStatusResult = 'FAILED';
          await db.query("UPDATE ticket_technicians SET lensa_status = 'FAILED' WHERE ticket_id = ? AND role = 'LEAD'", [ticket.id]).catch(() => {});
        } else {
          await db.query("UPDATE ticket_technicians SET lensa_status = 'SUCCESS' WHERE ticket_id = ? AND role = 'LEAD'", [ticket.id]).catch(() => {});
        }
      }

      // Trigger Pusher ke web dashboard
      try {
        await pusherServer.trigger('dashboard-channel', 'ticket-update', {
          message: `Tiket ${ticket.id_tiket} diambil oleh ${techName}`,
          type: 'UPDATE_TICKET',
          ticketId: ticket.id
        });
      } catch (pe) {
        console.error("Pusher trigger error:", pe);
      }

    } catch (dbErr) {
      await connection.rollback();
      throw dbErr;
    } finally {
      connection.release();
    }

    // Feedback pesan bot sesuai permintaan
    const lensaNote = ticket.category === 'SQUAT'
      ? (lensaStatusResult === 'SUCCESS' ? 'Silahkan cek Lensa' : '⚠️ Gagal terhubung ke Lensa (Timeout)')
      : 'Tiket Non-SQUAT (Tidak dikirim ke Lensa)';

    const replyText = 
`✅ Berhasil ambil tiket ${ticket.id_tiket}
Deskripsi: ${ticket.deskripsi || '-'}
STO : ${ticket.sto || '-'}
Oleh : ${techName} (${assignedNik})
${lensaNote}`;

    const keyboard = buildInlineKeyboard([
      { text: "👥 Atur Partner / Tim", callback_data: `TEAM_MANAGE_START_${ticket.id}` }
    ], 1);

    return sendMessage(chatId, replyText, { reply_markup: keyboard });

  } catch (err) {
    console.error("Error handleAmbilCommand:", err);
    return sendMessage(chatId, `❌ Gagal mengambil tiket: ${err.message}`);
  }
}

/**
 * 2. COMMAND: /update <ID_TIKET> <CATATAN>
 */
export async function handleQuickUpdateCommand(chatId, text, user, rawMessage = {}) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) {
    return sendMessage(chatId, "⚠️ Format salah.\nContoh:\n`/update INC54326005 Sedang penarikan kabel dropcore`");
  }

  const idTiketInput = parts[1];
  const catatan = parts.slice(2).join(' ').trim();

  if (!catatan) {
    return sendMessage(chatId, `⚠️ Harap sertakan catatan progres.\nContoh:\n\`/update ${idTiketInput} Sedang penarikan dropcore tiang 4 ke 5\``);
  }

  try {
    const [rows] = await db.query(
      `SELECT id, id_tiket, status, category FROM tickets WHERE id_tiket = ? OR id_tiket LIKE ? ORDER BY id DESC LIMIT 1`,
      [idTiketInput, `%${idTiketInput}`]
    );

    if (rows.length === 0) {
      return sendMessage(chatId, `❌ Tiket *${idTiketInput}* tidak ditemukan.`);
    }

    const ticket = rows[0];

    if (ticket.status === 'CLOSED' && user.role !== 'SuperAdmin') {
      return sendMessage(chatId, `❌ Gagal: Tiket *${ticket.id_tiket}* sudah CLOSED.`);
    }

    const updaterName = user.full_name || user.display_name || user.username || 'Teknisi';

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        "UPDATE tickets SET update_progres = ?, last_update_time = NOW() WHERE id = ?",
        [catatan, ticket.id]
      );

      await connection.query(
        "INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())",
        [ticket.id, `Update Progress: "${catatan}"`, updaterName]
      );

      await connection.commit();

      try {
        await pusherServer.trigger('dashboard-channel', 'ticket-update', {
          message: `Update progres tiket ${ticket.id_tiket}`,
          type: 'UPDATE_TICKET',
          ticketId: ticket.id
        });
      } catch (pe) {
        console.error("Pusher error:", pe);
      }

    } catch (dbErr) {
      await connection.rollback();
      throw dbErr;
    } finally {
      connection.release();
    }

    const replyText = 
`✅ Progres tiket ${ticket.id_tiket} diupdate:
"${catatan}"`;

    return sendMessage(chatId, replyText);

  } catch (err) {
    console.error("Error handleQuickUpdateCommand:", err);
    return sendMessage(chatId, `❌ Gagal update progres: ${err.message}`);
  }
}

/**
 * 3. COMMAND: /close <ID_TIKET> (Format Sekali Kirim)
 */
export async function handleQuickCloseCommand(chatId, text, user, rawMessage = {}) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const firstLineParts = lines[0].split(/\s+/);

  if (firstLineParts.length < 2) {
    return sendCloseTemplateHelp(chatId);
  }

  const idTiketInput = firstLineParts[1];

  // Jika teknisi hanya ketik `/close INCxxx` tanpa menyertakan field penyebab / perbaikan
  if (lines.length === 1 && firstLineParts.length <= 2) {
    return sendCloseTemplateHelp(chatId, idTiketInput);
  }

  // Parse field dari pesan
  let penyebab = '';
  let perbaikan = '';
  let material = '-';
  let keteranganLain = '-';

  // Gabungkan sisa teks dari baris pertama jika ada
  const remainingFirstLine = firstLineParts.slice(2).join(' ').trim();
  const allLines = remainingFirstLine ? [remainingFirstLine, ...lines.slice(1)] : lines.slice(1);

  let currentKey = '';
  for (const line of allLines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('penyebab:') || lower.startsWith('penyebab gangguan:')) {
      currentKey = 'penyebab';
      penyebab = line.substring(line.indexOf(':') + 1).trim();
    } else if (lower.startsWith('perbaikan:') || lower.startsWith('tindakan:')) {
      currentKey = 'perbaikan';
      perbaikan = line.substring(line.indexOf(':') + 1).trim();
    } else if (lower.startsWith('material:') || lower.startsWith('material pekerjaan:')) {
      currentKey = 'material';
      material = line.substring(line.indexOf(':') + 1).trim() || '-';
    } else if (lower.startsWith('keterangan lain:') || lower.startsWith('ket lain:') || lower.startsWith('ket:')) {
      currentKey = 'keteranganLain';
      keteranganLain = line.substring(line.indexOf(':') + 1).trim() || '-';
    } else {
      // Baris lanjutan dari baris sebelumnya
      if (currentKey === 'penyebab') penyebab += ' ' + line;
      else if (currentKey === 'perbaikan') perbaikan += ' ' + line;
      else if (currentKey === 'material') material += ' ' + line;
      else if (currentKey === 'keteranganLain') keteranganLain += ' ' + line;
      else if (!penyebab) penyebab = line;
    }
  }

  if (!penyebab || !perbaikan) {
    return sendMessage(chatId, 
`⚠️ Format belum lengkap. Harap sertakan *Penyebab:* dan *Perbaikan:*

Contoh format:
\`/close ${idTiketInput}
Penyebab: Core 2 putus di tikungan tiang 4
Perbaikan: Splicing ulang di closure dan rapikan kabel
Material: 1 pcs Protection Sleeve, 20m Dropcore
Keterangan Lain: Redaman normal -18.2 dB\``);
  }

  try {
    // Ambil data tiket lengkap beserta teknisi LEAD dan PARTNER
    const [rows] = await db.query(`
      SELECT t.*,
             MAX(CASE WHEN tt.role = 'LEAD' THEN tech.name END) as lead_name,
             MAX(CASE WHEN tt.role = 'LEAD' THEN tech.nik END) as lead_nik,
             MAX(CASE WHEN tt.role = 'LEAD' THEN tech.phone_number END) as lead_phone,
             COALESCE(
               NULLIF(TRIM(t.partner_technicians), ''),
               GROUP_CONCAT(
                 DISTINCT CASE 
                   WHEN tt.role = 'PARTNER' 
                   THEN tech.name
                 END 
                 SEPARATOR ', '
               )
             ) as partners_list
      FROM tickets t
      LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
      LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
      WHERE t.id_tiket = ? OR t.id_tiket LIKE ?
      GROUP BY t.id
      ORDER BY t.id DESC LIMIT 1
    `, [idTiketInput, `%${idTiketInput}`]);

    if (rows.length === 0) {
      return sendMessage(chatId, `❌ Tiket *${idTiketInput}* tidak ditemukan.`);
    }

    const ticket = rows[0];

    if (ticket.status === 'CLOSED') {
      return sendMessage(chatId, `⚠️ Tiket *${ticket.id_tiket}* sudah berstatus CLOSED sebelumnya.`);
    }

    // Susun format RCA standar
    const formattedRCA = `Penyebab gangguan akibat ${penyebab}\nNormal kembali setelah dilakukan ${perbaikan}`;
    const fullProgresNotes = keteranganLain && keteranganLain !== '-'
      ? `${formattedRCA}\n(Ket Lain: ${keteranganLain})`
      : formattedRCA;

    // Database update
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(`
        UPDATE tickets 
        SET status = 'CLOSED',
            update_progres = ?,
            material = ?,
            closed_at = NOW(),
            last_update_time = NOW()
        WHERE id = ?
      `, [fullProgresNotes, material, ticket.id]);

      // Catat History
      const teleUserDisplay = rawMessage.from?.username 
        ? `@${rawMessage.from.username}`
        : (user.full_name || user.display_name || user.username || 'Teknisi');

      await connection.query(
        "INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())",
        [ticket.id, `Status berubah: ${ticket.status} ➝ CLOSED. RCA: "${formattedRCA}"`, teleUserDisplay]
      );

      await connection.commit();

      // Sinkronisasi ke Google Sheets jika ada konfigurasi
      try {
        const ticketForSheet = {
          ...ticket,
          status: 'CLOSED',
          close_time: new Date(),
          root_cause: formattedRCA,
          material: material,
          technician_full: ticket.lead_name ? `${ticket.lead_name} (${ticket.lead_nik})` : '-'
        };
        await appendTicketToSheet(ticketForSheet);
      } catch (gsErr) {
        console.error("GSheet append error on close:", gsErr.message);
      }

      // Pusher realtime update
      try {
        await pusherServer.trigger('dashboard-channel', 'ticket-update', {
          message: `Tiket ${ticket.id_tiket} ditutup oleh ${teleUserDisplay}`,
          type: 'TICKET_CLOSED',
          ticketId: ticket.id
        });
      } catch (pe) {
        console.error("Pusher error:", pe);
      }

    } catch (dbErr) {
      await connection.rollback();
      throw dbErr;
    } finally {
      connection.release();
    }

    // Nama Lensa dan Partner dari DB
    const lensaDisplay = ticket.lead_name 
      ? `${ticket.lead_name}${ticket.lead_nik ? ` (${ticket.lead_nik})` : ''}`
      : (user.nik ? `${user.full_name || user.display_name} (${user.nik})` : '-');

    const partnerDisplay = ticket.partners_list || '-';
    const senderDisplay = rawMessage.from?.username 
      ? `@${rawMessage.from.username} (${user.full_name || user.display_name || user.username})`
      : (user.full_name || user.display_name || user.username);

    // Format output persis sesuai permintaan
    const replyText = 
`✅ Menerima Update Closed Tiket
No. Tiket : ${ticket.id_tiket}
Lensa : ${lensaDisplay}
Partner : ${partnerDisplay}
Ket. Close : 
Penyebab gangguan akibat ${penyebab}
Normal kembali setelah dilakukan ${perbaikan}
Material : ${material}
Keterangan Lain : ${keteranganLain}

Oleh : ${senderDisplay}`;

    return sendMessage(chatId, replyText);

  } catch (err) {
    console.error("Error handleQuickCloseCommand:", err);
    return sendMessage(chatId, `❌ Gagal menutup tiket: ${err.message}`);
  }
}

function sendCloseTemplateHelp(chatId, idTiket = 'INC54326005') {
  const helpText = 
`⚠️ Gunakan format sekali kirim berikut:

\`/close ${idTiket}
Penyebab: <penyebab gangguan>
Perbaikan: <tindakan perbaikan>
Material: <material yang digunakan atau ->
Keterangan Lain: <keterangan tambahan atau ->\`

*Contoh:*
\`/close ${idTiket}
Penyebab: Core 2 putus di tikungan tiang 4
Perbaikan: Splicing ulang di closure dan rapikan kabel
Material: 1 pcs Protection Sleeve, 20m Dropcore
Keterangan Lain: Redaman normal -18.2 dB\``;

  return sendMessage(chatId, helpText);
}
