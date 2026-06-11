import mysql from 'mysql2/promise';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const cleanLine = line.replace('\r', '').trim();
    const index = cleanLine.indexOf('=');
    if (index > 0) {
        acc[cleanLine.substring(0, index).trim()] = cleanLine.substring(index + 1).trim();
    }
    return acc;
}, {});

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
        console.log("Adding 'full_name' and 'display_name' columns to 'users' table...");
        
        // Tambahkan full_name
        try {
            await db.query("ALTER TABLE users ADD COLUMN full_name VARCHAR(150) NULL AFTER username;");
            console.log("✅ Column 'full_name' added successfully.");
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN' || e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column') || e.message.includes('already exists')) {
                console.log("⚠️ Column 'full_name' already exists.");
            } else {
                throw e;
            }
        }

        // Tambahkan display_name
        try {
            await db.query("ALTER TABLE users ADD COLUMN display_name VARCHAR(50) NULL AFTER full_name;");
            console.log("✅ Column 'display_name' added successfully.");
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN' || e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column') || e.message.includes('already exists')) {
                console.log("⚠️ Column 'display_name' already exists.");
            } else {
                throw e;
            }
        }
        
    } catch (e) {
        console.error("Migration Error:", e);
    } finally {
        await db.end();
    }
}
run();
