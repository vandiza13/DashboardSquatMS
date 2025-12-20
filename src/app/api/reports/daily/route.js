import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
    try {
        // 1. Cek Login
        const token = request.cookies.get('token')?.value;
        if (!await verifyJWT(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 2. Ambil Parameter Kategori (Opsional)
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || 'ALL';

        // 3. Setup Waktu Hari Ini (WIB)
        // Kita gunakan query SQL DATE(NOW()) agar ikut jam server database yang sudah diset WIB
        
        let queryRunning = `
            SELECT t.*, 
            GROUP_CONCAT(tech.name SEPARATOR ', ') as technician_names
            FROM tickets t
            LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
            LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
            WHERE t.status IN ('OPEN', 'SC')
        `;

        let queryClosed = `
            SELECT t.*, 
            GROUP_CONCAT(tech.name SEPARATOR ', ') as technician_names
            FROM tickets t
            LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
            LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
            WHERE t.status = 'CLOSED' 
            AND DATE(t.last_update_time) = DATE(NOW())
        `;

        const params = [];

        // Filter Kategori jika tidak ALL
        if (category !== 'ALL') {
            queryRunning += ` AND t.category = ?`;
            queryClosed += ` AND t.category = ?`;
            params.push(category);
        }

        queryRunning += ` GROUP BY t.id ORDER BY t.tiket_time ASC`;
        queryClosed += ` GROUP BY t.id ORDER BY t.last_update_time DESC`;

        // Jalankan Query Paralel
        const [running] = await db.query(queryRunning, category !== 'ALL' ? [category] : []);
        const [closed] = await db.query(queryClosed, category !== 'ALL' ? [category] : []);

        return NextResponse.json({
            running,
            closed
        });

    } catch (error) {
        console.error('Report API Error:', error);
        return NextResponse.json({ error: 'Gagal mengambil data laporan' }, { status: 500 });
    }
}