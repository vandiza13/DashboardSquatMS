// src/lib/telegram/auth.js
import { db } from '@/lib/db';

export async function authenticateTelegramUser(chatId) {
  try {
    // 1. Check in telegram_users (dashboard staff / admin / superadmin)
    const [rows] = await db.query(
      `SELECT tu.telegram_chat_id, tu.registered_at, tu.simulated_tech_nik, u.id as user_id, u.username, u.role, u.division, u.full_name, u.display_name 
       FROM telegram_users tu 
       JOIN users u ON tu.user_id = u.id 
       WHERE tu.telegram_chat_id = ? AND tu.is_active = 1`,
      [chatId]
    );
    
    if (rows.length > 0) {
      const u = rows[0];
      // Jika SuperAdmin sedang mengaktifkan mode simulasi teknisi
      if (u.role === 'SuperAdmin' && u.simulated_tech_nik) {
        const [techRows] = await db.query(
          `SELECT nik, name, division, position_name, phone_number 
           FROM technicians WHERE nik = ?`,
          [u.simulated_tech_nik]
        );
        if (techRows.length > 0) {
          const tech = techRows[0];
          return {
            user_id: u.user_id,
            username: tech.nik,
            role: 'Teknisi',
            division: tech.division,
            full_name: tech.name,
            display_name: tech.name,
            is_technician: true,
            nik: tech.nik,
            phone_number: tech.phone_number,
            registered_at: u.registered_at,
            real_role: 'SuperAdmin',
            is_simulating: true
          };
        }
      }
      return u;
    }

    // 2. Check in technicians table
    const [techRows] = await db.query(
      `SELECT nik, name, division, position_name, phone_number, telegram_chat_id, telegram_username, telegram_registered_at
       FROM technicians
       WHERE telegram_chat_id = ? AND is_active = 1 AND telegram_is_active = 1`,
      [chatId]
    );

    if (techRows.length > 0) {
      const tech = techRows[0];
      return {
        user_id: null,
        username: tech.nik,
        role: 'Teknisi',
        division: tech.division,
        full_name: tech.name,
        display_name: tech.name,
        is_technician: true,
        nik: tech.nik,
        phone_number: tech.phone_number,
        registered_at: tech.telegram_registered_at
      };
    }

    return null;
  } catch (error) {
    console.error("Auth Error:", error);
    return null;
  }
}
