const fs = require('fs');
const mysql = require('mysql2/promise');

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const k = parts[0].trim();
        const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[k] = v;
    }
});

async function run() {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT || '4000'),
            ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
        });
        
        const [rows] = await conn.query('SELECT id, id_tiket, sto, branch FROM tickets WHERE id_tiket = ?', ['INC53772891']);
        console.log('Ticket Data:', rows);
        await conn.end();
    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();
