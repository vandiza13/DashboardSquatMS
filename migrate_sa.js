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
    const [cols] = await db.query("SHOW COLUMNS FROM sto_branch_mappings");
    if (!cols.find(c => c.Field === 'service_area')) {
        console.log("Adding service_area column...");
        await db.query("ALTER TABLE sto_branch_mappings ADD COLUMN service_area VARCHAR(100) DEFAULT NULL");
    }

    const saMap = {
        'Pondokgede': ['PDE'],
        'Pekayon': ['PKY'],
        'Bekasi': ['BEK'],
        'Kranji': ['KRA'],
        'Kaliabang': ['KLB'],
        'Depok': ['DEP'],
        'Cinere': ['CNE', 'PCM'],
        'Sukmajaya': ['SKJ', 'CSL']
    };

    for (const [sa, stos] of Object.entries(saMap)) {
        console.log(`Updating ${sa} for STOs: ${stos.join(', ')}`);
        // If STO doesn't exist, we should probably insert it, but for now just update
        await db.query(`UPDATE sto_branch_mappings SET service_area = ? WHERE sto IN (?)`, [sa, stos]);
        
        // Also let's ensure they are created if missing
        for (const sto of stos) {
            await db.query(`INSERT IGNORE INTO sto_branch_mappings (sto, branch, service_area) VALUES (?, 'BEKASI', ?)`, [sto, sa]);
        }
    }

    console.log("Migration complete.");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
