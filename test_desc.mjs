import { config } from 'dotenv';
config({ path: '.env.local' });
import mysql from 'mysql2/promise';

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

        const [rows] = await db.query("SELECT id_tiket, deskripsi, service_number FROM tickets WHERE category = 'SQUAT' LIMIT 5");
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}
main();
