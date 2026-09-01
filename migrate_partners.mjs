import mysql from 'mysql2/promise';
import fs from 'fs';

const env = fs.readFileSync('c:/Users/Hp/dashboard-tiket-modern/.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const cleanLine = line.replace('\r', '');
    const [key, val] = cleanLine.split('=');
    if (key && val) acc[key.trim()] = val.trim();
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
        console.log("Fetching technicians map...");
        const [techs] = await db.query("SELECT nik, name FROM technicians");
        const techMap = {};
        for (const t of techs) {
            techMap[t.name.trim().toLowerCase()] = t.nik;
        }

        console.log("Fetching tickets with partners...");
        const [tickets] = await db.query("SELECT id, partner_technicians FROM tickets WHERE partner_technicians IS NOT NULL AND partner_technicians != ''");
        
        let inserted = 0;
        let skipped = 0;
        
        for (const ticket of tickets) {
            const partners = ticket.partner_technicians.split(',').map(s => s.trim());
            for (const p of partners) {
                if (!p) continue;
                
                // Hapus nomor HP dalam kurung, contoh: "Agung Prasetio N (081310377468)" -> "Agung Prasetio N"
                let cleanName = p.replace(/\s*\([^)]*\)/, '').trim().toLowerCase();

                const nik = techMap[cleanName];
                if (nik) {
                    try {
                        await db.query("INSERT IGNORE INTO ticket_technicians (ticket_id, technician_nik, role) VALUES (?, ?, 'PARTNER')", [ticket.id, nik]);
                        inserted++;
                    } catch (err) {
                        console.error(`Error inserting partner ${nik} for ticket ${ticket.id}:`, err.message);
                    }
                } else {
                    skipped++;
                    console.log(`Warning: Could not find NIK for partner name '${cleanName}' (original: '${p}') in ticket ${ticket.id}`);
                }
            }
        }

        console.log(`Migration done! Inserted ${inserted} partner records. Skipped ${skipped} unknown names.`);

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
