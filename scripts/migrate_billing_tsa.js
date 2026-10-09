const { createPool } = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
    const db = createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '4000'),
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        }
    });

    try {
        console.log('Creating billing_tsa table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS billing_tsa (
                id INT AUTO_INCREMENT PRIMARY KEY,
                month_year VARCHAR(7) NOT NULL UNIQUE,
                total_sites INT NOT NULL DEFAULT 0,
                updated_by VARCHAR(100) NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Insert initial data for current and past few months just in case
        console.log('Inserting default data for 2026-10 (726 sites)...');
        await db.execute(`
            INSERT IGNORE INTO billing_tsa (month_year, total_sites, updated_by)
            VALUES ('2026-10', 726, 'System Migration')
        `);

        console.log('Migration billing_tsa success!');
    } catch (e) {
        console.error('Migration error:', e);
    } finally {
        await db.end();
    }
}

migrate();
