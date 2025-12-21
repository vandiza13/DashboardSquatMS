import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        // 1. Cek Login
        const token = request.cookies.get('token')?.value;
        if (!await verifyJWT(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 2. Ambil Parameter Kategori
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || 'ALL';

        // 3. Query SQL dengan Gabungan Nama + No HP
        // Format hasil: "Budi (0812xxx), Anto (0856xxx)"
        const technicianSelect = `
            SELECT t.*, 
            GROUP_CONCAT(
                CONCAT(tech.name, ' (', COALESCE(tech.phone_number, '-'), ')') 
                SEPARATOR ', '
            ) as technician_names
        `;

        let queryRunning = `
            ${technicianSelect}
            FROM tickets t
            LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
            LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
            WHERE t.status IN ('OPEN', 'SC')
        `;

        let queryClosed = `
            ${technicianSelect}
            FROM tickets t
            LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
            LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
            WHERE t.status = 'CLOSED' 
            AND DATE(t.last_update_time) = DATE(NOW())
        `;

        const params = [];

        // Filter Kategori
        if (category !== 'ALL') {
            queryRunning += ` AND t.category = ?`;
            queryClosed += ` AND t.category = ?`;
            params.push(category);
        }

        queryRunning += ` GROUP BY t.id ORDER BY t.tiket_time ASC`;
        queryClosed += ` GROUP BY t.id ORDER BY t.last_update_time DESC`;

        // Jalankan Query Paralel
        const [running] = await db.query(queryRunning, params);
        const [closed] = await db.query(queryClosed, params);

        return NextResponse.json({
            running,
            closed
        });

    } catch (error) {
        console.error('Report API Error:', error);
        return NextResponse.json({ error: 'Gagal mengambil data laporan' }, { status: 500 });
    }
}