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
        const division = searchParams.get('division') || 'ALL'; // SQUAT, MS, ALL

        let query = `
            SELECT 
                tech.name as technician_name,
                tech.nik as technician_nik,
                tech.phone_number,
                tech.division,
                tt.role as user_role,
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
                COALESCE(t.closed_at, t.last_update_time) as closed_at,
                t.tiket_time,
                (SELECT GROUP_CONCAT(tech2.name) 
                 FROM ticket_technicians tt2 
                 JOIN technicians tech2 ON tt2.technician_nik = tech2.nik 
                 WHERE tt2.ticket_id = t.id AND tt2.role = 'LEAD' AND tt2.technician_nik != tech.nik) as lead_technician_name,
                (SELECT GROUP_CONCAT(tech3.name) 
                 FROM ticket_technicians tt3 
                 JOIN technicians tech3 ON tt3.technician_nik = tech3.nik 
                 WHERE tt3.ticket_id = t.id AND tt3.role = 'PARTNER' AND tt3.technician_nik != tech.nik) as partner_technicians
            FROM technicians tech
            JOIN ticket_technicians tt ON tech.nik = tt.technician_nik
            JOIN tickets t ON tt.ticket_id = t.id
            WHERE t.status = 'CLOSED'
        `;

        const params = [];

        if (startDate && endDate) {
            query += ` AND DATE(COALESCE(t.closed_at, t.last_update_time)) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        if (division === 'SQUAT') {
            query += ` AND tech.division = 'SQUAT'`;
        } else if (division === 'MS') {
            query += ` AND tech.division = 'MS'`;
        }

        query += ` ORDER BY tech.name ASC, COALESCE(t.closed_at, t.last_update_time) DESC`;

        const [rows] = await db.query(query, params);

        return NextResponse.json(rows);

    } catch (error) {
        console.error("Report API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
