const fs = require('fs');
const mysql = require('mysql2/promise');

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
        console.log("Adding 'division' column to 'users' table...");
        try {
            await pool.query("ALTER TABLE users ADD COLUMN division VARCHAR(20) DEFAULT 'ALL'");
            console.log("✅ Column 'division' added successfully.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("⚠️ Column 'division' already exists. Skipping.");
            } else {
                throw e;
            }
        }

        console.log("Updating 'role' column type to allow 'SuperAdmin'...");
        await pool.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(20) DEFAULT 'User'");

        console.log("Updating User ID 1 to SuperAdmin and ALL division...");
        const [result] = await pool.query("UPDATE users SET role = 'SuperAdmin', division = 'ALL' WHERE id = 1");
        console.log(`✅ User ID 1 updated. Rows affected: ${result.affectedRows}`);

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await pool.end();
        console.log("Connection closed.");
    }
}

main();
