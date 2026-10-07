import mysql from 'mysql2/promise';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

async function run() {
  const db = mysql.createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: parseInt(env.DB_PORT || '4000'),
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });

  try {
    const [rows] = await db.query(`SELECT DATE_FORMAT(tiket_time, '%Y-%m') as month, count(*) as total, SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed, SUM(CASE WHEN outage_hours IS NOT NULL THEN 1 ELSE 0 END) as synced FROM tickets WHERE category='SQUAT' GROUP BY month ORDER BY month DESC`);
    console.table(rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
