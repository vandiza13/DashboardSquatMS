import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!await verifyJWT(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Ringkasan Status LENGKAP (Untuk Kartu Utama)
        // Kita tambahkan logic closed_today dan closed_month di sini
        const [statusCounts] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open,
                SUM(CASE WHEN status = 'SC' THEN 1 ELSE 0 END) as sc,
                SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_total,
                SUM(CASE WHEN status = 'CLOSED' AND DATE(last_update_time) = CURDATE() THEN 1 ELSE 0 END) as closed_today,
                SUM(CASE WHEN status = 'CLOSED' AND DATE_FORMAT(last_update_time, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m') THEN 1 ELSE 0 END) as closed_month
            FROM tickets
        `);

        // 2. Tiket Running per SUB-KATEGORI
        const [runningBySub] = await db.query(`
            SELECT subcategory, COUNT(*) as count 
            FROM tickets 
            WHERE status IN ('OPEN', 'SC')
            GROUP BY subcategory
            ORDER BY count DESC
        `);

        // 3. Closed Hari Ini per SUB-KATEGORI
        const [closedTodayBySub] = await db.query(`
            SELECT subcategory, COUNT(*) as count 
            FROM tickets 
            WHERE status = 'CLOSED' 
            AND DATE(last_update_time) = CURDATE()
            GROUP BY subcategory
            ORDER BY count DESC
        `);

        // 4. Distribusi SUB-KATEGORI Bulanan
        const [monthlyType] = await db.query(`
            SELECT 
                DATE_FORMAT(tiket_time, '%b %Y') as month,
                subcategory,
                COUNT(*) as count
            FROM tickets
            WHERE tiket_time >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
            GROUP BY month, subcategory
            ORDER BY MIN(tiket_time) ASC
        `);

        // 5. Tren Harian 30 Hari
        const [dailyTrend] = await db.query(`
            SELECT 
                DATE_FORMAT(last_update_time, '%Y-%m-%d') as date,
                category,
                COUNT(*) as count
            FROM tickets
            WHERE status = 'CLOSED' 
            AND last_update_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY date, category
            ORDER BY date ASC
        `);

        // 6. 5 Tiket Terbaru
        const [recentTickets] = await db.query(`
            SELECT id_tiket, category, status, tiket_time 
            FROM tickets 
            ORDER BY tiket_time DESC 
            LIMIT 5
        `);

        return NextResponse.json({
            stats: statusCounts[0] || {}, 
            runningBySub,
            closedTodayBySub,
            monthlyType,
            dailyTrend,
            recent: recentTickets
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Gagal mengambil statistik: ' + error.message }, { status: 500 });
    }
}