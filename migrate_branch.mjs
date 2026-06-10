import mysql from 'mysql2/promise';
import fs from 'fs';

// Baca konfigurasi dari .env.local
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const cleanLine = line.replace('\r', '').trim();
    const index = cleanLine.indexOf('=');
    if (index > 0) {
        const key = cleanLine.substring(0, index).trim();
        const val = cleanLine.substring(index + 1).trim();
        acc[key] = val;
    }
    return acc;
}, {});

const STO_LIST = [
    'BBL', 'BEK', 'BGG', 'CBG', 'CBR', 'CIB', 'CIK',
    'DNI', 'EJI', 'GDM', 'JBB', 'KLB', 'KRA', 'LMA',
    'MGB', 'PBY', 'PDE', 'PKY', 'SMH', 'STN', 'SUE',
    'TAR', 'TBL'
];

const BEKASI_STOS = ['PDE', 'PKY', 'KRA', 'KLB', 'BEK'];

async function run() {
    const db = await mysql.createConnection({
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        port: parseInt(env.DB_PORT || '4000'),
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });
    
    try {
        console.log("--- 1. Renaming 'district' to 'branch' in 'tickets' table ---");
        try {
            await db.query("ALTER TABLE tickets RENAME COLUMN district TO branch;");
            console.log("✅ Column renamed successfully.");
        } catch (e) {
            if (e.code === 'ER_BAD_FIELD_ERROR' || e.message.includes('Unknown column')) {
                console.log("⚠️ Column 'district' might have been already renamed or doesn't exist.");
            } else {
                throw e;
            }
        }

        console.log("--- 2. Creating 'sto_branch_mappings' table ---");
        await db.query(`
            CREATE TABLE IF NOT EXISTS sto_branch_mappings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sto VARCHAR(50) UNIQUE NOT NULL,
                branch VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'sto_branch_mappings' created or already exists.");

        console.log("--- 3. Seeding Data ---");
        for (const sto of STO_LIST) {
            const branch = BEKASI_STOS.includes(sto) ? 'BEKASI' : 'KARAWANG';
            try {
                await db.query(
                    "INSERT INTO sto_branch_mappings (sto, branch) VALUES (?, ?)",
                    [sto, branch]
                );
                console.log(`Seeded: ${sto} -> ${branch}`);
            } catch (e) {
                if (e.code === 'ER_DUP_ENTRY') {
                    // Ignore duplicates if already seeded
                    console.log(`Skipped (already exists): ${sto}`);
                } else {
                    console.error(`Error seeding ${sto}:`, e.message);
                }
            }
        }
        console.log("✅ Seeding completed.");

    } catch (e) {
        console.error("❌ Migration failed:", e);
    } finally {
        await db.end();
    }
}

run();
