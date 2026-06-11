// src/lib/telegram/auth.js
import { db } from '@/lib/db';

export async function authenticateTelegramUser(chatId) {
  try {
    const [rows] = await db.query(
      `SELECT tu.telegram_chat_id, u.id as user_id, u.username, u.role, u.division 
       FROM telegram_users tu 
       JOIN users u ON tu.user_id = u.id 
       WHERE tu.telegram_chat_id = ? AND tu.is_active = 1`,
      [chatId]
    );
    
    if (rows.length === 0) return null;
    return rows[0]; // { user_id, username, role, division }
  } catch (error) {
    console.error("Auth Error:", error);
    return null;
  }
}
