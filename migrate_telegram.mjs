import fs from 'fs';
import mysql from 'mysql2/promise';

async function main() {
    // 1. Read .env.local manually and handle CRLF
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const cleanLine = line.replace('\r', '');
        const match = cleanLine.match(/^([^=]+)=(.*)$/);
        if (match) {
            envVars[match[1].trim()] = match[2].trim();
        }
    });

    console.log("Connecting to database:", envVars['DB_HOST']);

    // 2. Connect to database
    const pool = mysql.createPool({
        host: envVars['DB_HOST'],
        user: envVars['DB_USER'],
        password: envVars['DB_PASSWORD'],
        database: envVars['DB_NAME'],
        port: parseInt(envVars['DB_PORT'] || '4000'),
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        }
    });

    try {
        console.log("Creating 'telegram_users' table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS telegram_users (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NOT NULL,
              telegram_chat_id BIGINT NOT NULL UNIQUE,
              telegram_username VARCHAR(100),
              is_active TINYINT DEFAULT 1,
              registered_at DATETIME DEFAULT NOW(),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ 'telegram_users' table is ready.");

        console.log("Creating 'telegram_sessions' table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS telegram_sessions (
              telegram_chat_id BIGINT PRIMARY KEY,
              step VARCHAR(50) NOT NULL,
              data JSON NOT NULL,
              updated_at DATETIME DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ 'telegram_sessions' table is ready.");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await pool.end();
        console.log("Connection closed.");
    }
}

main();
