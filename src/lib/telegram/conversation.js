import { db } from '@/lib/db';

export async function getSession(chatId) {
  const [rows] = await db.query('SELECT step, data FROM telegram_sessions WHERE telegram_chat_id = ?', [chatId]);
  if (rows.length === 0) return null;
  return { step: rows[0].step, data: rows[0].data };
}

export async function setSession(chatId, step, data) {
  const [existing] = await db.query('SELECT 1 FROM telegram_sessions WHERE telegram_chat_id = ?', [chatId]);
  if (existing.length > 0) {
    await db.query('UPDATE telegram_sessions SET step = ?, data = ? WHERE telegram_chat_id = ?', 
      [step, JSON.stringify(data), chatId]);
  } else {
    await db.query('INSERT INTO telegram_sessions (telegram_chat_id, step, data) VALUES (?, ?, ?)', 
      [chatId, step, JSON.stringify(data)]);
  }
}

export async function clearSession(chatId) {
  await db.query('DELETE FROM telegram_sessions WHERE telegram_chat_id = ?', [chatId]);
}
