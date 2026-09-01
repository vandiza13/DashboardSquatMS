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
        const roleFilter = searchParams.get('role'); // LEAD, PARTNER, ALL

        if (!nik || !month || !year) {
            return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
        }

        let query = `
            SELECT 
                t.id,
                t.id_tiket as ticket_number,
                t.deskripsi as subject,
                t.category,
                t.subcategory,
                tt.role as user_role,
                t.status,
                t.branch,
                t.sto,
                t.ttr_tacc,
                COALESCE(t.closed_at, t.last_update_time) as last_update_time,
                (SELECT GROUP_CONCAT(tech2.name) 
                 FROM ticket_technicians tt2 
                 JOIN technicians tech2 ON tt2.technician_nik = tech2.nik 
                 WHERE tt2.ticket_id = t.id AND tt2.role = 'LEAD' AND tt2.technician_nik != ?) as lead_technician_name,
                (SELECT GROUP_CONCAT(tech3.name) 
                 FROM ticket_technicians tt3 
                 JOIN technicians tech3 ON tt3.technician_nik = tech3.nik 
                 WHERE tt3.ticket_id = t.id AND tt3.role = 'PARTNER' AND tt3.technician_nik != ?) as partner_technicians
            FROM tickets t
            JOIN ticket_technicians tt ON t.id = tt.ticket_id
            WHERE tt.technician_nik = ?
            AND t.status = 'CLOSED'
            AND MONTH(COALESCE(t.closed_at, t.last_update_time)) = ? 
            AND YEAR(COALESCE(t.closed_at, t.last_update_time)) = ?
        `;

        const queryParams = [nik, nik, nik, month, year];

        if (category && category !== 'TOTAL') {
            if (category === 'TSEL') {
                query += ` AND t.category = 'SQUAT' AND (t.subcategory LIKE '%TSEL%' OR t.subcategory = 'TELKOMSEL')`;
            } else if (category === 'OLO') {
                query += ` AND t.category = 'SQUAT' AND t.subcategory NOT LIKE '%TSEL%' AND t.subcategory != 'TELKOMSEL'`;
            } else if (['MTEL', 'UMT', 'CENTRATAMA', 'SQUAT'].includes(category)) {
                query += ` AND t.category = ?`;
                queryParams.push(category);
            }
        }

        if (roleFilter && roleFilter !== 'ALL') {
            query += ` AND tt.role = ?`;
            queryParams.push(roleFilter);
        }

        query += ` ORDER BY COALESCE(t.closed_at, t.last_update_time) DESC`;

        const [rows] = await db.query(query, queryParams);

        return NextResponse.json(rows);

    } catch (error) {
        console.error('Productivity Details API Error:', error);
        return NextResponse.json({ error: 'Gagal memuat detail tiket' }, { status: 500 });
    }
}
