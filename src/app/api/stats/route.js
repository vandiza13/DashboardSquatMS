import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!await verifyJWT(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // --- MENANGKAP PARAMETER BULAN ---
        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get('month'); // Contoh bentuknya: "2026-03"

        // Logika Dinamis untuk Kondisi Tanggal TTR
        let ttrDateCondition = "last_update_time >= DATE_FORMAT(NOW(), '%Y-%m-01')";
        let ttrParams = [];

        if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
            // Jika user memilih bulan, gunakan filter dari tanggal 1 bulan tsb sampai tanggal 1 bulan depannya
            ttrDateCondition = "last_update_time >= ? AND last_update_time < DATE_ADD(?, INTERVAL 1 MONTH)";
            ttrParams = [`${monthParam}-01`, `${monthParam}-01`];
        }

        // --- OPTIMASI: EKSEKUSI SEKUENSIAL ---
        // Mengganti Promise.all dengan await berurutan untuk mencegah ETIMEDOUT pada database serverless

        // 1. Ringkasan Status LENGKAP
        const statusCountsData = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open,
                SUM(CASE WHEN status = 'SC' THEN 1 ELSE 0 END) as sc,
                SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_total,
                SUM(CASE WHEN status = 'CLOSED' AND last_update_time >= CURDATE() AND last_update_time < CURDATE() + INTERVAL 1 DAY THEN 1 ELSE 0 END) as closed_today,
                SUM(CASE WHEN status = 'CLOSED' AND last_update_time >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN 1 ELSE 0 END) as closed_month
            FROM tickets
        `);

        // 2. Tiket Running per SUB-KATEGORI
        const runningBySubData = await db.query(`
            SELECT subcategory, COUNT(*) as count 
            FROM tickets 
            WHERE status IN ('OPEN', 'SC')
            GROUP BY subcategory
            ORDER BY count DESC
        `);

        // 3. Closed Hari Ini per SUB-KATEGORI
        const closedTodayBySubData = await db.query(`
            SELECT subcategory, COUNT(*) as count 
            FROM tickets 
            WHERE status = 'CLOSED' 
            AND last_update_time >= CURDATE() 
            AND last_update_time < CURDATE() + INTERVAL 1 DAY
            GROUP BY subcategory
            ORDER BY count DESC
        `);

        // 4. Distribusi SUB-KATEGORI Bulanan (2 Bulan Terakhir)
        const monthlyTypeData = await db.query(`
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
        const dailyTrendData = await db.query(`
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
        const recentTicketsData = await db.query(`
            SELECT id_tiket, category, status, tiket_time 
            FROM tickets 
            ORDER BY tiket_time DESC 
            LIMIT 5
        `);

        // 7. Ticket Aging (Umur Tiket Open/SC)
        const agingStatsData = await db.query(`
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
        `);

        // 8. TTR untuk UMT & CENTRATAMA (DENGAN HITUNGAN SLA)
        const ttrUmtCentData = await db.query(`
            SELECT 
                category, 
                AVG(CAST(REPLACE(ttr_tacc, ',', '.') AS DECIMAL(10,2))) as avg_ttr,
                COUNT(*) as total_tickets,
                SUM(CASE WHEN CAST(REPLACE(ttr_tacc, ',', '.') AS DECIMAL(10,2)) <= 4 THEN 1 ELSE 0 END) as sla_met,
                SUM(CASE WHEN CAST(REPLACE(ttr_tacc, ',', '.') AS DECIMAL(10,2)) > 4 THEN 1 ELSE 0 END) as sla_missed
            FROM tickets
            WHERE status = 'CLOSED' 
              AND ttr_tacc IS NOT NULL 
              AND ttr_tacc != ''
              AND category IN ('UMT', 'CENTRATAMA')
              AND ${ttrDateCondition}
            GROUP BY category
        `, ttrParams);

        // 9. TTR Khusus MTEL per Subcategory (DENGAN HITUNGAN SLA)
        const ttrMtelData = await db.query(`
            SELECT 
                category,
                subcategory,
                AVG(CAST(REPLACE(ttr_tacc, ',', '.') AS DECIMAL(10,2))) as avg_ttr,
                COUNT(*) as total_tickets,
                SUM(CASE WHEN CAST(REPLACE(ttr_tacc, ',', '.') AS DECIMAL(10,2)) <= 4 THEN 1 ELSE 0 END) as sla_met,
                SUM(CASE WHEN CAST(REPLACE(ttr_tacc, ',', '.') AS DECIMAL(10,2)) > 4 THEN 1 ELSE 0 END) as sla_missed
            FROM tickets
            WHERE status = 'CLOSED' 
              AND ttr_tacc IS NOT NULL 
              AND ttr_tacc != ''
              AND category = 'MTEL'
              AND subcategory IN ('TIS', 'FIBERISASI', 'MMP')
              AND ${ttrDateCondition}
            GROUP BY category, subcategory
        `, ttrParams);


        // --- FORMATTING DATA ---
        // Menyesuaikan dengan hasil kembalian db.query mysql2 ([rows, fields])
        const statusCounts = statusCountsData[0][0] || {};
        const runningBySub = runningBySubData[0];
        const closedTodayBySub = closedTodayBySubData[0];
        const monthlyType = monthlyTypeData[0];
        const dailyTrend = dailyTrendData[0];
        const recentTickets = recentTicketsData[0];
        const agingStats = agingStatsData[0];

        // Format data aging agar rapi (default 0)
        const ticketAging = { less_4h: 0, '4h_12h': 0, '12h_24h': 0, more_24h: 0 };
        agingStats.forEach(row => ticketAging[row.age_group] = row.count);

        // Format Objek Data TTR SLA menjadi Kompleks
        const baseTtrFormat = { avg: 0, total: 0, met: 0, missed: 0 };
        const ttrStats = { 
            UMT: { ...baseTtrFormat }, 
            CENTRATAMA: { ...baseTtrFormat }, 
            MTEL_TIS: { ...baseTtrFormat }, 
            MTEL_FIBERISASI: { ...baseTtrFormat }, 
            MTEL_MMP: { ...baseTtrFormat } 
        };

        ttrUmtCentData[0].forEach(row => {
            ttrStats[row.category] = {
                avg: parseFloat(row.avg_ttr || 0).toFixed(2),
                total: parseInt(row.total_tickets || 0),
                met: parseInt(row.sla_met || 0),
                missed: parseInt(row.sla_missed || 0)
            };
        });

        ttrMtelData[0].forEach(row => {
            const key = `MTEL_${row.subcategory}`;
            ttrStats[key] = {
                avg: parseFloat(row.avg_ttr || 0).toFixed(2),
                total: parseInt(row.total_tickets || 0),
                met: parseInt(row.sla_met || 0),
                missed: parseInt(row.sla_missed || 0)
            };
        });

        return NextResponse.json({
            stats: statusCounts, 
            runningBySub,
            closedTodayBySub,
            monthlyType,
            dailyTrend,
            recent: recentTickets,
            aging: agingStats,
            ttr: ttrStats // Mengirimkan JSON kompleks (avg, total, met, missed)
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Gagal mengambil statistik: ' + error.message }, { status: 500 });
    }
}