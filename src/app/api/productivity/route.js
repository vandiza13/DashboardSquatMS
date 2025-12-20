import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!await verifyJWT(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Ambil parameter Bulan & Tahun dari URL
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // Format: 1 - 12
        const year = searchParams.get('year');   // Format: 2024, 2025, dst

        // Base Query
        let query = `
            SELECT 
                tech.name,
                tech.nik,
                SUM(CASE WHEN t.category = 'MTEL' THEN 1 ELSE 0 END) as mtel,
                SUM(CASE WHEN t.category = 'UMT' THEN 1 ELSE 0 END) as umt,
                SUM(CASE WHEN t.category = 'CENTRATAMA' THEN 1 ELSE 0 END) as centratama,
                SUM(CASE WHEN t.category = 'SQUAT' THEN 1 ELSE 0 END) as squat,
                COUNT(t.id) as total
            FROM technicians tech
            JOIN ticket_technicians tt ON tech.nik = tt.technician_nik
            JOIN tickets t ON tt.ticket_id = t.id
            WHERE t.status = 'CLOSED'
        `;

        const queryParams = [];

        // Tambahkan Filter Waktu jika user memilih bulan/tahun
        if (month && year) {
            query += ` AND MONTH(t.last_update_time) = ? AND YEAR(t.last_update_time) = ?`;
            queryParams.push(month, year);
        }

        // Lanjutkan Grouping & Ordering
        query += `
            GROUP BY tech.nik, tech.name
            ORDER BY total DESC
        `;

        const [rows] = await db.query(query, queryParams);

        return NextResponse.json(rows);

    } catch (error) {
        console.error('Productivity API Error:', error);
        return NextResponse.json({ error: 'Gagal memuat data produktifitas' }, { status: 500 });
    }
}