const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function main() {
    try {
        const db = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT || '4000'),
            ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
        });

        const [rows] = await db.query("SELECT id_tiket, id_tiket_tacc, deskripsi FROM tickets WHERE category = 'SQUAT' AND deskripsi IS NOT NULL LIMIT 20");
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
