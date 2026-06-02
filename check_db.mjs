import mysql from 'mysql2/promise';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

async function run() {
    const db = mysql.createPool({
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        port: parseInt(env.DB_PORT),
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });
    
    try {
        const [rows] = await db.query('DESCRIBE technicians');
        console.log(rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

run();
