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
    const [cols] = await db.query("SHOW COLUMNS FROM tickets");
    if (!cols.find(c => c.Field === 'service_area')) {
        console.log("Adding service_area column to tickets...");
        await db.query("ALTER TABLE tickets ADD COLUMN service_area VARCHAR(100) DEFAULT NULL");
    }

    console.log("Updating service_area on existing tickets...");
    const [result] = await db.query(`
        UPDATE tickets t
        JOIN sto_branch_mappings m ON t.sto = m.sto
        SET t.service_area = m.service_area
        WHERE m.service_area IS NOT NULL
    `);
    
    console.log(`Updated ${result.affectedRows} tickets with their service area.`);

    console.log("Migration complete.");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
