import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        // Query: Hitung tiket per bulan berdasarkan kategori
        // Mengambil data 6 bulan terakhir
        const query = `
            SELECT 
                DATE_FORMAT(tiket_time, '%Y-%m') as month, 
                category, 
                COUNT(*) as count 
            FROM tickets 
            WHERE tiket_time >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY month, category 
            ORDER BY month ASC
        `;

        const [rows] = await db.query(query);
        return NextResponse.json(rows);

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}