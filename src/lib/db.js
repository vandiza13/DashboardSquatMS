// src/lib/db.js
import mysql from 'mysql2/promise';

// Gunakan globalThis untuk mencegah pembuatan pool baru saat hot-reload di development atau across chunks
const globalForDb = globalThis;

export const db = globalForDb.__db_pool || mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '4000'), // TiDB port 4000
  waitForConnections: true,
  connectionLimit: 25,
  queueLimit: 0,
  timezone: '+07:00',
  // --- BAGIAN INI SANGAT PENTING UNTUK TIDB ---
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
  // --------------------------------------------
});

globalForDb.__db_pool = db;
