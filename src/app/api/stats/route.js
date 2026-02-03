import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!await verifyJWT(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // --- OPTIMASI 1: QUERY PARALEL ---
        // Kita jalankan semua query sekaligus menggunakan Promise.all
        const [
            statusCountsData,
            runningBySubData,
            closedTodayBySubData,
            monthlyTypeData,
            dailyTrendData,
            recentTicketsData,
            agingStatsData
        ] = await Promise.all([

            // 1. Ringkasan Status LENGKAP
            db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open,
                    SUM(CASE WHEN status = 'SC' THEN 1 ELSE 0 END) as sc,
                    SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_total,
                    SUM(CASE WHEN status = 'CLOSED' AND last_update_time >= CURDATE() AND last_update_time < CURDATE() + INTERVAL 1 DAY THEN 1 ELSE 0 END) as closed_today,
                    SUM(CASE WHEN status = 'CLOSED' AND last_update_time >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN 1 ELSE 0 END) as closed_month
                FROM tickets
            `),

            // 2. Tiket Running per SUB-KATEGORI
            db.query(`
                SELECT subcategory, COUNT(*) as count 
                FROM tickets 
                WHERE status IN ('OPEN', 'SC')
                GROUP BY subcategory
                ORDER BY count DESC
            `),

            // 3. Closed Hari Ini per SUB-KATEGORI (Optimized Date Filter)
            // Menggunakan range (>= dan <) agar Index idx_status_update bisa bekerja
            db.query(`
                SELECT subcategory, COUNT(*) as count 
                FROM tickets 
                WHERE status = 'CLOSED' 
                AND last_update_time >= CURDATE() 
                AND last_update_time < CURDATE() + INTERVAL 1 DAY
                GROUP BY subcategory
                ORDER BY count DESC
            `),

            // 4. Distribusi SUB-KATEGORI Bulanan (2 Bulan Terakhir)
            db.query(`
                SELECT 
                    DATE_FORMAT(tiket_time, '%b %Y') as month,
                    subcategory,
                    COUNT(*) as count
                FROM tickets
                WHERE tiket_time >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
                GROUP BY month, subcategory
                ORDER BY MIN(tiket_time) ASC
            `),

            // 5. Tren Harian 30 Hari (Optimized Date Filter)
            db.query(`
                SELECT 
                    DATE_FORMAT(last_update_time, '%Y-%m-%d') as date,
                    category,
                    COUNT(*) as count
                FROM tickets
                WHERE status = 'CLOSED' 
                AND last_update_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY date, category
                ORDER BY date ASC
            `),

            // 6. 5 Tiket Terbaru
            db.query(`
                SELECT id_tiket, category, status, tiket_time 
                FROM tickets 
                ORDER BY tiket_time DESC 
                LIMIT 5
            `),

            // 7. Ticket Aging (Umur Tiket Open/SC)
            db.query(`
                SELECT 
                    category,
                    CASE 
                        WHEN TIMESTAMPDIFF(HOUR, tiket_time, NOW()) < 4 THEN 'less_4h'
                        WHEN TIMESTAMPDIFF(HOUR, tiket_time, NOW()) >= 4 AND TIMESTAMPDIFF(HOUR, tiket_time, NOW()) <= 12 THEN '4h_12h'
                        WHEN TIMESTAMPDIFF(HOUR, tiket_time, NOW()) > 12 AND TIMESTAMPDIFF(HOUR, tiket_time, NOW()) <= 24 THEN '12h_24h'
                        ELSE 'more_24h'
                    END as age_group,
                    COUNT(*) as count
                FROM tickets 
                WHERE status != 'CLOSED'
                GROUP BY category, age_group
            `)
        ]);

        // --- OPTIMASI 2: FORMATTING DATA ---
        // Karena hasil query db.query mengembalikan [rows, fields], kita ambil index ke-0
        
        const statusCounts = statusCountsData[0][0] || {};
        const runningBySub = runningBySubData[0];
        const closedTodayBySub = closedTodayBySubData[0];
        const monthlyType = monthlyTypeData[0];
        const dailyTrend = dailyTrendData[0];
        const recentTickets = recentTicketsData[0];
        const agingStats = agingStatsData[0];

        // Format data aging agar rapi (default 0)
        const ticketAging = {
            less_4h: 0,
            '4h_12h': 0,
            '12h_24h': 0,
            more_24h: 0
        };
        agingStats.forEach(row => ticketAging[row.age_group] = row.count);

        return NextResponse.json({
            stats: statusCounts, 
            runningBySub,
            closedTodayBySub,
            monthlyType,
            dailyTrend,
            recent: recentTickets,
            aging: agingStats
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Gagal mengambil statistik: ' + error.message }, { status: 500 });
    }
}