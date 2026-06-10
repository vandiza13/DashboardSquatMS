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

        // [PERBAIKAN SESUAI SOP] Logika Dinamis difilter berdasarkan tiket_time (Waktu Tiket Masuk)
        let ttrDateCondition = "tiket_time >= DATE_FORMAT(NOW(), '%Y-%m-01')";
        let ttrParams = [];

        if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
            // Jika user memilih bulan, gunakan filter tiket_time dari tanggal 1 bulan tsb sampai tanggal 1 bulan depannya
            ttrDateCondition = "tiket_time >= ? AND tiket_time < DATE_ADD(?, INTERVAL 1 MONTH)";
            ttrParams = [`${monthParam}-01`, `${monthParam}-01`];
        }

        // --- OPTIMASI: EKSEKUSI KONKUREN UNTUK SEMUA QUERY ---
        const [
            statusCountsData,
            runningBySubData,
            closedTodayBySubData,
            monthlyTypeData,
            dailyTrendData,
            recentTicketsData,
            agingStatsData,
            ttrRawUmtCentData,
            ttrRawMtelData
        ] = await Promise.all([
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
            db.query(`
                SELECT subcategory, COUNT(*) as count 
                FROM tickets 
                WHERE status IN ('OPEN', 'SC')
                GROUP BY subcategory
                ORDER BY count DESC
            `),
            db.query(`
                SELECT subcategory, COUNT(*) as count 
                FROM tickets 
                WHERE status = 'CLOSED' 
                AND last_update_time >= CURDATE() 
                AND last_update_time < CURDATE() + INTERVAL 1 DAY
                GROUP BY subcategory
                ORDER BY count DESC
            `),
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
            db.query(`
                SELECT id_tiket, category, status, tiket_time 
                FROM tickets 
                ORDER BY tiket_time DESC 
                LIMIT 5
            `),
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
            `),
            db.query(`
                SELECT category, ttr_tacc
                FROM tickets
                WHERE status = 'CLOSED' 
                  AND ttr_tacc IS NOT NULL 
                  AND TRIM(ttr_tacc) != ''
                  AND category IN ('UMT', 'CENTRATAMA')
                  AND ${ttrDateCondition}
            `, ttrParams),
            db.query(`
                SELECT category, subcategory, ttr_tacc
                FROM tickets
                WHERE status = 'CLOSED' 
                  AND ttr_tacc IS NOT NULL 
                  AND TRIM(ttr_tacc) != ''
                  AND category = 'MTEL'
                  AND subcategory IN ('TIS', 'FIBERISASI', 'MMP')
                  AND ${ttrDateCondition}
            `, ttrParams)
        ]);


        // --- FORMATTING DATA ---
        const statusCounts = statusCountsData[0][0] || {};
        const runningBySub = runningBySubData[0];
        const closedTodayBySub = closedTodayBySubData[0];
        const monthlyType = monthlyTypeData[0];
        const dailyTrend = dailyTrendData[0];
        const recentTickets = recentTicketsData[0];
        const agingStats = agingStatsData[0];

        const ticketAging = { less_4h: 0, '4h_12h': 0, '12h_24h': 0, more_24h: 0 };
        agingStats.forEach(row => ticketAging[row.age_group] = row.count);

        const baseTtrFormat = { avg: 0, total: 0, met: 0, missed: 0 };
        const ttrStats = { 
            UMT: { ...baseTtrFormat }, 
            CENTRATAMA: { ...baseTtrFormat }, 
            MTEL_TIS: { ...baseTtrFormat }, 
            MTEL_FIBERISASI: { ...baseTtrFormat }, 
            MTEL_MMP: { ...baseTtrFormat } 
        };

        // JS processing for TTR to avoid slow DB regex
        const processTtrData = (data, getGroupKey) => {
            data.forEach(row => {
                const ttrStr = row.ttr_tacc ? row.ttr_tacc.trim() : '';
                if (/^\s*[0-9]+([.,][0-9]+)?\s*$/.test(ttrStr)) {
                    const ttrVal = parseFloat(ttrStr.replace(',', '.'));
                    const key = getGroupKey(row);
                    if (ttrStats[key]) {
                        ttrStats[key].total += 1;
                        ttrStats[key].sum = (ttrStats[key].sum || 0) + ttrVal;
                        if (ttrVal <= 4) ttrStats[key].met += 1;
                        else ttrStats[key].missed += 1;
                    }
                }
            });
        };

        processTtrData(ttrRawUmtCentData[0], r => r.category);
        processTtrData(ttrRawMtelData[0], r => `MTEL_${r.subcategory}`);

        Object.keys(ttrStats).forEach(key => {
            if (ttrStats[key].total > 0) {
                ttrStats[key].avg = (ttrStats[key].sum / ttrStats[key].total).toFixed(2);
            } else {
                ttrStats[key].avg = "0.00";
            }
            delete ttrStats[key].sum;
        });

        return NextResponse.json({
            stats: statusCounts, 
            runningBySub,
            closedTodayBySub,
            monthlyType,
            dailyTrend,
            recent: recentTickets,
            aging: agingStats,
            ttr: ttrStats
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Gagal mengambil statistik: ' + error.message }, { status: 500 });
    }
}