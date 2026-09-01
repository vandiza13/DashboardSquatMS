import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!await verifyJWT(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Ambil parameter Bulan & Tahun dari URL
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // Format: 1 - 12
        const year = searchParams.get('year');   // Format: 2024, 2025, dst

        const division = searchParams.get('division') || 'ALL'; // ALL, SQUAT, MS

        // Base Query
        let query = `
            SELECT 
                tech.name,
                tech.nik,
                tech.division,
                SUM(CASE WHEN tt.role = 'LEAD' THEN 1 ELSE 0 END) as lead_total,
                SUM(CASE WHEN tt.role = 'PARTNER' THEN 1 ELSE 0 END) as partner_total,
                COUNT(t.id) as total,
                
                -- MTEL
                SUM(CASE WHEN t.category = 'MTEL' AND tt.role = 'LEAD' THEN 1 ELSE 0 END) as mtel_lead,
                SUM(CASE WHEN t.category = 'MTEL' AND tt.role = 'PARTNER' THEN 1 ELSE 0 END) as mtel_partner,
                SUM(CASE WHEN t.category = 'MTEL' THEN 1 ELSE 0 END) as mtel,

                -- UMT
                SUM(CASE WHEN t.category = 'UMT' AND tt.role = 'LEAD' THEN 1 ELSE 0 END) as umt_lead,
                SUM(CASE WHEN t.category = 'UMT' AND tt.role = 'PARTNER' THEN 1 ELSE 0 END) as umt_partner,
                SUM(CASE WHEN t.category = 'UMT' THEN 1 ELSE 0 END) as umt,

                -- CENTRATAMA
                SUM(CASE WHEN t.category = 'CENTRATAMA' AND tt.role = 'LEAD' THEN 1 ELSE 0 END) as centratama_lead,
                SUM(CASE WHEN t.category = 'CENTRATAMA' AND tt.role = 'PARTNER' THEN 1 ELSE 0 END) as centratama_partner,
                SUM(CASE WHEN t.category = 'CENTRATAMA' THEN 1 ELSE 0 END) as centratama,

                -- SQUAT
                SUM(CASE WHEN t.category = 'SQUAT' AND tt.role = 'LEAD' THEN 1 ELSE 0 END) as squat_lead,
                SUM(CASE WHEN t.category = 'SQUAT' AND tt.role = 'PARTNER' THEN 1 ELSE 0 END) as squat_partner,
                SUM(CASE WHEN t.category = 'SQUAT' THEN 1 ELSE 0 END) as squat,

                -- SQUAT TSEL
                SUM(CASE WHEN t.category = 'SQUAT' AND (t.subcategory LIKE '%TSEL%' OR t.subcategory = 'TELKOMSEL') AND tt.role = 'LEAD' THEN 1 ELSE 0 END) as squat_tsel_lead,
                SUM(CASE WHEN t.category = 'SQUAT' AND (t.subcategory LIKE '%TSEL%' OR t.subcategory = 'TELKOMSEL') AND tt.role = 'PARTNER' THEN 1 ELSE 0 END) as squat_tsel_partner,
                SUM(CASE WHEN t.category = 'SQUAT' AND (t.subcategory LIKE '%TSEL%' OR t.subcategory = 'TELKOMSEL') THEN 1 ELSE 0 END) as squat_tsel,

                -- SQUAT OLO
                SUM(CASE WHEN t.category = 'SQUAT' AND t.subcategory NOT LIKE '%TSEL%' AND t.subcategory != 'TELKOMSEL' AND tt.role = 'LEAD' THEN 1 ELSE 0 END) as squat_olo_lead,
                SUM(CASE WHEN t.category = 'SQUAT' AND t.subcategory NOT LIKE '%TSEL%' AND t.subcategory != 'TELKOMSEL' AND tt.role = 'PARTNER' THEN 1 ELSE 0 END) as squat_olo_partner,
                SUM(CASE WHEN t.category = 'SQUAT' AND t.subcategory NOT LIKE '%TSEL%' AND t.subcategory != 'TELKOMSEL' THEN 1 ELSE 0 END) as squat_olo
            FROM technicians tech
            JOIN ticket_technicians tt ON tech.nik = tt.technician_nik
            JOIN tickets t ON tt.ticket_id = t.id
            WHERE t.status = 'CLOSED'
        `;

        const queryParams = [];

        // Tambahkan Filter Waktu jika user memilih bulan/tahun
        if (month && year) {
            query += ` AND MONTH(COALESCE(t.closed_at, t.last_update_time)) = ? AND YEAR(COALESCE(t.closed_at, t.last_update_time)) = ?`;
            queryParams.push(month, year);
        }

        if (division === 'SQUAT') {
            query += ` AND tech.division = 'SQUAT'`;
        } else if (division === 'MS') {
            query += ` AND tech.division = 'MS'`;
        }

        // Lanjutkan Grouping & Ordering (Prioritaskan LENSA terbanyak di atas)
        query += `
            GROUP BY tech.nik, tech.name, tech.division
            ORDER BY lead_total DESC, partner_total DESC, total DESC, tech.name ASC
        `;

        const [rows] = await db.query(query, queryParams);

        // --- Query Tambahan: Hitung per Subcategory ---
        let subQuery = `
            SELECT category, subcategory, COUNT(*) as count
            FROM tickets
            WHERE status = 'CLOSED'
        `;
        const subParams = [];

        if (month && year) {
            subQuery += ` AND MONTH(COALESCE(closed_at, last_update_time)) = ? AND YEAR(COALESCE(closed_at, last_update_time)) = ?`;
            subParams.push(month, year);
        }

        subQuery += ` GROUP BY category, subcategory ORDER BY category, count DESC`;

        const [subRows] = await db.query(subQuery, subParams);

        return NextResponse.json({ technicians: rows, subcategoryCounts: subRows });

    } catch (error) {
        console.error('Productivity API Error:', error);
        return NextResponse.json({ error: 'Gagal memuat data produktifitas' }, { status: 500 });
    }
}