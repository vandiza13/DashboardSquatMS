import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // [UPDATE QUERY] Menambahkan kolom detail: priority, tacc, progres, deskripsi, district, ttr_tacc, close_time, partner
        let query = `
            SELECT 
                tech.name as technician_name,
                tech.nik as technician_nik,
                tech.phone_number,
                t.id_tiket,
                t.id_tiket_tacc, 
                t.priority,
                t.category,
                t.subcategory,
                t.status,
                t.sto,
                t.branch,
                t.deskripsi,
                t.update_progres,
                t.ttr_tacc,
                t.partner_technicians,
                t.tiket_time,
                t.last_update_time
            FROM technicians tech
            JOIN ticket_technicians tt ON tech.nik = tt.technician_nik
            JOIN tickets t ON tt.ticket_id = t.id
            WHERE 1=1
        `;

        const params = [];

        if (startDate && endDate) {
            query += ` AND DATE(t.tiket_time) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        query += ` ORDER BY tech.name ASC, t.tiket_time DESC`;

        const [rows] = await db.query(query, params);

        return NextResponse.json(rows);

    } catch (error) {
        console.error("Report API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}