import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!await verifyJWT(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const nik = searchParams.get('nik');
        const month = searchParams.get('month');
        const year = searchParams.get('year');
        const category = searchParams.get('category'); 

        if (!nik || !month || !year) {
            return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
        }

        // PERBAIKAN: Menggunakan nama kolom yang sesuai dengan database Anda (id_tiket & deskripsi)
        // Kita gunakan "AS" agar frontend tetap membaca sebagai ticket_number & subject
        let query = `
            SELECT 
                t.id,
                t.id_tiket as ticket_number,  -- Mengambil id_tiket sebagai ticket_number
                t.deskripsi as subject,       -- Mengambil deskripsi sebagai subject
                t.category,
                t.status,
                t.last_update_time
            FROM tickets t
            JOIN ticket_technicians tt ON t.id = tt.ticket_id
            WHERE tt.technician_nik = ?
            AND t.status = 'CLOSED'
            AND MONTH(t.last_update_time) = ? 
            AND YEAR(t.last_update_time) = ?
        `;

        const queryParams = [nik, month, year];

        if (category && category !== 'TOTAL') {
            query += ` AND t.category = ?`;
            queryParams.push(category);
        }

        query += ` ORDER BY t.last_update_time DESC`;

        const [rows] = await db.query(query, queryParams);

        return NextResponse.json(rows);

    } catch (error) {
        console.error('Productivity Details API Error:', error);
        return NextResponse.json({ error: 'Gagal memuat detail tiket' }, { status: 500 });
    }
}