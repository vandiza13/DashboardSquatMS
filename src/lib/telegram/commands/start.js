import { db } from '@/lib/db';
import { sendMessage } from '../client';
import bcrypt from 'bcryptjs';

export async function handleStart(chatId) {
  const text = `👋 *Selamat Datang di Bot Dashboard Tiket SQUATMS*!

Bot ini membantu Anda memantau dan mengelola tiket gangguan secara langsung dari Telegram.

Gunakan perintah /help untuk melihat daftar fitur yang tersedia.

*Penting*: Jika Anda belum menghubungkan akun, silakan gunakan perintah:
\`/register <username_dashboard> <password>\``;

  await sendMessage(chatId, text);
}

export async function handleHelp(chatId, user) {
  if (user.role === 'Teknisi') {
    const text = `📋 *Daftar Perintah Bot Teknisi*

*Umum:*
/start - Pesan selamat datang
/help - Bantuan & daftar perintah
/profil - Lihat info akun Anda

*Tiket & Pekerjaan:*
/tiket <ID> - Detail tiket gangguan
/tr <ID> - Ambil Time Report (TR) siap copas ke grup WA
/running - Pantau tiket aktif di divisi ${user.division || ''}
/tim <ID> - Luruskan tim LENSA & Partner tiket

_Anda terhubung sebagai: ${user.full_name || user.username} (Teknisi ${user.division || '-'})_`;
    return sendMessage(chatId, text);
  }

  let text = `📋 *Daftar Perintah Bot*

*Umum:*
/start - Pesan selamat datang
/help - Bantuan & daftar perintah
/profil - Lihat info akun Anda

*Tiket:*
/buat - Buat tiket baru (Wizard interaktif)
/tiket <ID> - Lihat detail tiket (contoh: /tiket TR-1234 atau /tiket 552)
/tr <ID> - Ambil Time Report (TR) untuk tiket (contoh: /tr TR-1234 atau /tr 552)
/running [kategori] - Lihat daftar tiket aktif (contoh: /running SQUAT)
/tim <ID> - Luruskan tim LENSA & Partner tiket`;

  if (user.role === 'SuperAdmin') {
    text += `\n/hapus <ID> - Hapus tiket secara permanen (Super Admin Only)`;
  }

  text += `\n/update <ID> - Update progres atau status tiket
/tutup <ID> - Tutup tiket & ekspor ke GSheet

*Statistik:*
/stats - Ringkasan performa dan tiket hari ini

_Anda login sebagai: ${user.username} (${user.role})_`;

  await sendMessage(chatId, text);
}

export async function handleRegister(chatId, text, msgInfo = {}) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) {
    return sendMessage(chatId, "⚠️ Format salah.\n\n• Untuk Teknisi:\n`/register <NIK>` (contoh: `/register 18930183`)\n\n• Untuk Staf Dashboard:\n`/register <username> <password>`");
  }

  const telegramUsername = msgInfo.username || null;

  // 1. CEK REGISTRASI TEKNISI DENGAN NIK (1 parameter setelah /register)
  if (parts.length === 2) {
    const inputNik = parts[1].trim();

    try {
      const [techRows] = await db.query('SELECT * FROM technicians WHERE nik = ?', [inputNik]);
      if (techRows.length > 0) {
        const tech = techRows[0];

        if (tech.is_active === 0) {
          return sendMessage(chatId, `🚫 NIK *${tech.nik}* (${tech.name}) berstatus non-aktif di sistem.`);
        }

        if (tech.telegram_is_active === 0) {
          return sendMessage(chatId, `🚫 Akses Telegram untuk NIK *${tech.nik}* dinonaktifkan oleh Administrator. Hubungi Super Admin.`);
        }

        // Cek apakah NIK sudah dipakai oleh Chat ID lain
        if (tech.telegram_chat_id && String(tech.telegram_chat_id) !== String(chatId)) {
          return sendMessage(chatId, `⚠️ NIK *${tech.nik}* (${tech.name}) sudah terhubung dengan akun Telegram lain.\n\nJika Anda mengganti akun atau smartphone, hubungi Super Admin untuk mereset akun Telegram Anda.`);
        }

        // Lepaskan jika chatId ini sebelumnya terikat ke teknisi lain
        await db.query('UPDATE technicians SET telegram_chat_id = NULL, telegram_username = NULL WHERE telegram_chat_id = ?', [chatId]);

        // Tautkan Chat ID ke teknisi ini
        await db.query(
          'UPDATE technicians SET telegram_chat_id = ?, telegram_username = ?, telegram_is_active = 1, telegram_registered_at = NOW() WHERE nik = ?',
          [chatId, telegramUsername, tech.nik]
        );

        const successText = `✅ *Berhasil Terhubung!*
Halo *${tech.name}* (NIK: ${tech.nik})!
Divisi: *${tech.division}*

Akun Telegram Anda telah aktif sebagai *Teknisi*. Anda sekarang dapat:
• Melihat tiket: \`/tiket <ID>\`
• Mengambil Time Report: \`/tr <ID>\`
• Memantau tiket berjalan: \`/running\`
• Meluruskan tim: \`/tim <ID>\`

Ketik /help untuk panduan lengkap.`;

        return sendMessage(chatId, successText);
      }
    } catch (err) {
      console.error("Register Tech Error:", err);
      return sendMessage(chatId, "❌ Terjadi kesalahan saat memproses pendaftaran teknisi.");
    }
  }

  // 2. CEK REGISTRASI USER DASHBOARD (Format /register <username> <password>)
  const username = parts[1];
  const password = parts.slice(2).join(' ');

  if (!password) {
    return sendMessage(chatId, `❌ NIK/Username *${username}* tidak ditemukan dalam data teknisi.\n\nJika Anda staf dashboard, sertakan password:\n\`/register <username> <password>\``);
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return sendMessage(chatId, "❌ Username tidak ditemukan di dashboard.");
    }

    const user = rows[0];

    // Cek password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendMessage(chatId, "❌ Password salah.");
    }

    // Cek apakah sudah terdaftar
    const [existing] = await db.query('SELECT * FROM telegram_users WHERE telegram_chat_id = ?', [chatId]);
    if (existing.length > 0) {
      await db.query('UPDATE telegram_users SET user_id = ?, is_active = 1, telegram_username = ? WHERE telegram_chat_id = ?', 
        [user.id, telegramUsername || username, chatId]);
    } else {
      await db.query('INSERT INTO telegram_users (user_id, telegram_chat_id, telegram_username) VALUES (?, ?, ?)', 
        [user.id, chatId, telegramUsername || username]);
    }

    await sendMessage(chatId, `✅ *Berhasil!* Akun Telegram Anda sekarang terhubung dengan user dashboard: *${username}* (${user.role}).\n\nKetik /help untuk mulai menggunakan bot.`);

  } catch (error) {
    console.error("Register Error:", error);
    await sendMessage(chatId, "❌ Terjadi kesalahan pada server saat registrasi.");
  }
}

export async function handleProfil(chatId, user) {
  const timeStr = user.registered_at
    ? new Date(user.registered_at).toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}) + ' WIB'
    : '-';

  if (user.role === 'Teknisi' || user.is_technician) {
    const text = `👤 *Info Akun Teknisi*
─────────────────────────
👤 *Nama*: ${user.full_name || user.display_name}
🆔 *NIK*: ${user.nik || user.username}
💼 *Divisi*: ${user.division || '-'}
📱 *No HP*: ${user.phone_number || '-'}
🔑 *Role*: Teknisi Lapangan
⏰ *Terhubung Pada*: ${timeStr}
─────────────────────────`;
    return sendMessage(chatId, text);
  }

  const nameLine = user.display_name 
    ? `\n👤 *Nama*: ${user.display_name}${user.full_name ? ` (${user.full_name})` : ''}` 
    : '';
  const text = `👤 *Info Akun Anda*
─────────────────────────${nameLine}
👤 *Username*: ${user.username}
🔑 *Role*: ${user.role}
💼 *Divisi*: ${user.division || '-'}
⏰ *Terhubung Pada*: ${timeStr}
─────────────────────────`;

  await sendMessage(chatId, text);
}

export async function handleSwitchCommand(chatId, text, user) {
  // Hanya boleh jika role asli adalah SuperAdmin
  const isSuperAdmin = user.role === 'SuperAdmin' || user.real_role === 'SuperAdmin';
  if (!isSuperAdmin) {
    return sendMessage(chatId, "🚫 Perintah ini hanya dapat digunakan oleh SuperAdmin.");
  }

  const parts = text.trim().split(/\s+/);
  const target = parts[1] ? parts[1].toLowerCase() : '';

  if (!target || target === 'status') {
    if (user.is_simulating) {
      return sendMessage(chatId, `🔄 *Mode Simulasi Aktif*\nAnda sedang menyamar sebagai:\n👤 *${user.full_name}* (NIK: ${user.nik})\n💼 Divisi: *${user.division}*\n\nKetik \`/switch off\` untuk kembali menjadi SuperAdmin.`);
    }
    return sendMessage(chatId, "ℹ️ *Mode Penyamaran SuperAdmin*\n\nFormat penggunaan:\n• `/switch <NIK>` : Menyamar menjadi teknisi tertentu\n• `/switch off` : Kembali menjadi SuperAdmin normal\n\nContoh:\n`/switch 18930183` (Agung Prasetio N - SQUAT)");
  }

  if (target === 'off' || target === 'reset' || target === 'admin' || target === 'stop') {
    await db.query('UPDATE telegram_users SET simulated_tech_nik = NULL WHERE telegram_chat_id = ?', [chatId]);
    return sendMessage(chatId, "✅ *Mode Simulasi Dimatikan!* Anda kini telah kembali ke akun **SuperAdmin**.");
  }

  // Cari teknisi berdasarkan NIK atau Nama
  const [techRows] = await db.query(
    'SELECT nik, name, division FROM technicians WHERE nik = ? OR name LIKE ? LIMIT 1',
    [parts[1], `%${parts[1]}%`]
  );

  if (techRows.length === 0) {
    return sendMessage(chatId, `❌ Teknisi dengan NIK/Nama "*${parts[1]}*" tidak ditemukan.`);
  }

  const tech = techRows[0];
  await db.query('UPDATE telegram_users SET simulated_tech_nik = ? WHERE telegram_chat_id = ?', [tech.nik, chatId]);

  const switchSuccessMsg = `🔄 *Mode Teknisi Aktif!*
Anda sekarang menyamar sebagai:
👤 *${tech.name}* (NIK: ${tech.nik})
💼 Divisi: *${tech.division}*

Hak akses Anda sekarang persis seperti role *Teknisi*. Anda dapat mencoba:
• \`/tim <ID_TIKET>\` (Meluruskan LENSA & Partner)
• \`/tiket <ID_TIKET>\` (Detail tiket)
• \`/tr <ID_TIKET>\` (Time Report)
• \`/running\` (Tiket berjalan)

_Ketik \`/switch off\` kapan saja untuk kembali menjadi SuperAdmin._`;

  return sendMessage(chatId, switchSuccessMsg);
}

