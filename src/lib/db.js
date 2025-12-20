// src/lib/db.js
import mysql from 'mysql2/promise';

let pool;

if (!pool) {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '4000'), // TiDB port 4000
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+07:00',
    // --- BAGIAN INI SANGAT PENTING UNTUK TIDB ---
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
    // --------------------------------------------
  });
}

export const db = pool;