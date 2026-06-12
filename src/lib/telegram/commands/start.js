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
  let text = `📋 *Daftar Perintah Bot*

*Umum:*
/start - Pesan selamat datang
/help - Bantuan & daftar perintah
/profil - Lihat info akun Anda

*Tiket:*
/buat - Buat tiket baru (Wizard interaktif)
/tiket <ID> - Lihat detail tiket (contoh: /tiket TR-1234 atau /tiket 552)
/tr <ID> - Ambil Time Report (TR) untuk tiket (contoh: /tr TR-1234 atau /tr 552)
/running [kategori] - Lihat daftar tiket aktif (contoh: /running SQUAT)`;

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

export async function handleRegister(chatId, text) {
  const parts = text.split(' ');
  if (parts.length < 3) {
    return sendMessage(chatId, "⚠️ Format salah. Gunakan:\n`/register <username> <password>`");
  }

  const username = parts[1];
  const password = parts.slice(2).join(' ');

  try {
    // Cari user di DB
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
      // Update
      await db.query('UPDATE telegram_users SET user_id = ?, is_active = 1, telegram_username = ? WHERE telegram_chat_id = ?', 
        [user.id, username, chatId]);
    } else {
      // Insert
      await db.query('INSERT INTO telegram_users (user_id, telegram_chat_id, telegram_username) VALUES (?, ?, ?)', 
        [user.id, chatId, username]);
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

