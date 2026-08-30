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
            ttrRawMtelData,
            mttriTselData,
            mttriOloData
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
                WHERE tiket_time >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
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
                SELECT 
                    category,
                    COALESCE(NULLIF(TRIM(branch), ''), 'BEKASI') as branch,
                    ttr_tacc
                FROM tickets
                WHERE status = 'CLOSED' 
                  AND ttr_tacc IS NOT NULL 
                  AND TRIM(ttr_tacc) != ''
                  AND category IN ('UMT', 'CENTRATAMA')
                  AND ${ttrDateCondition}
            `, ttrParams),
            db.query(`
                SELECT 
                    category,
                    subcategory,
                    COALESCE(NULLIF(TRIM(branch), ''), 'BEKASI') as branch,
                    ttr_tacc
                FROM tickets
                WHERE status = 'CLOSED' 
                  AND ttr_tacc IS NOT NULL 
                  AND TRIM(ttr_tacc) != ''
                  AND category = 'MTEL'
                  AND subcategory IN ('TIS', 'FIBERISASI', 'MMP')
                  AND ${ttrDateCondition}
            `, ttrParams),
            db.query(`
                SELECT 
                    COALESCE(NULLIF(TRIM(branch), ''), 'BEKASI') as branch,
                    UPPER(priority) as priority, 
                    ttr_tacc
                FROM tickets
                WHERE status = 'CLOSED' 
                  AND category = 'SQUAT'
                  AND subcategory = 'TSEL'
                  AND ttr_tacc IS NOT NULL 
                  AND TRIM(ttr_tacc) != ''
                  AND ${ttrDateCondition}
            `, ttrParams),
            db.query(`
                SELECT 
                    COALESCE(NULLIF(TRIM(branch), ''), 'BEKASI') as branch,
                    UPPER(priority) as priority, 
                    UPPER(deskripsi) as deskripsi,
                    ttr_tacc
                FROM tickets
                WHERE status = 'CLOSED' 
                  AND category = 'SQUAT'
                  AND subcategory = 'OLO'
                  AND ttr_tacc IS NOT NULL 
                  AND TRIM(ttr_tacc) != ''
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

        // --- MTTRi COMPLIANCE (SQUAT TSEL) PER BRANCH ---
        const MTTRI_CONFIG = {
            LOW: { targetPct: 91, targetHours: 24 },
            MINOR: { targetPct: 91, targetHours: 16 },
            MAJOR: { targetPct: 82, targetHours: 8 },
            CRITICAL: { targetPct: 73, targetHours: 4 }
        };

        const SEVERITY_ORDER = ['LOW', 'MINOR', 'MAJOR', 'CRITICAL'];

        const branchGroups = {};
        ['BEKASI', 'KARAWANG'].forEach(b => {
            branchGroups[b] = {
                LOW: { total: 0, comply: 0, notComply: 0 },
                MINOR: { total: 0, comply: 0, notComply: 0 },
                MAJOR: { total: 0, comply: 0, notComply: 0 },
                CRITICAL: { total: 0, comply: 0, notComply: 0 },
            };
        });

        mttriTselData[0].forEach(row => {
            const rawBranch = (row.branch || '').trim().toUpperCase();
            let branch = null;
            if (rawBranch.includes('BEKASI')) branch = 'BEKASI';
            else if (rawBranch.includes('KARAWANG')) branch = 'KARAWANG';
            else return; // Hanya proses branch BEKASI & KARAWANG

            let prio = (row.priority || '').trim().toUpperCase();

            if (MTTRI_CONFIG[prio]) {
                const ttrStr = row.ttr_tacc ? row.ttr_tacc.trim() : '';
                if (/^\s*[0-9]+([.,][0-9]+)?\s*$/.test(ttrStr)) {
                    const ttrVal = parseFloat(ttrStr.replace(',', '.'));
                    branchGroups[branch][prio].total += 1;
                    if (ttrVal <= MTTRI_CONFIG[prio].targetHours) {
                        branchGroups[branch][prio].comply += 1;
                    } else {
                        branchGroups[branch][prio].notComply += 1;
                    }
                }
            }
        });

        const mttriCompliance = Object.keys(branchGroups).map(branch => {
            const severities = SEVERITY_ORDER.map(sev => {
                const stat = branchGroups[branch][sev];
                const target = MTTRI_CONFIG[sev];
                const pct = stat.total > 0 ? (stat.comply / stat.total) * 100 : 100;
                const isMet = pct >= target.targetPct;

                return {
                    severity: sev,
                    total: stat.total,
                    comply: stat.comply,
                    notComply: stat.notComply,
                    targetPct: target.targetPct,
                    targetHours: target.targetHours,
                    pct: pct.toFixed(2),
                    isMet
                };
            });

            const totalTiket = severities.reduce((acc, curr) => acc + curr.total, 0);
            const totalComply = severities.reduce((acc, curr) => acc + curr.comply, 0);
            const totalNotComply = severities.reduce((acc, curr) => acc + curr.notComply, 0);
            const totalPct = totalTiket > 0 ? ((totalComply / totalTiket) * 100).toFixed(2) : "100.00";

            return {
                branch,
                severities,
                total: {
                    total: totalTiket,
                    comply: totalComply,
                    notComply: totalNotComply,
                    pct: totalPct
                }
            };
        });

        // --- SQUAT OLO COMPLIANCE PER BRANCH ---
        const OLO_CONFIG = {
            'NON-GAMAS': { label: 'Non GAMAS', targetHours: 4, targetPct: 90 },
            'GAMAS': { label: 'GAMAS', targetHours: 7, targetPct: 90 },
            'QUALITY': { label: 'QUALITY', targetHours: 7, targetPct: 90 }
        };
        const OLO_TYPES_ORDER = ['NON-GAMAS', 'GAMAS', 'QUALITY'];

        const resolveOloType = (priority, deskripsi) => {
            const prioUpper = (priority || '').toUpperCase();
            const deskUpper = (deskripsi || '').toUpperCase();

            if (prioUpper.includes('QUALITY') || deskUpper.includes('QUALITY')) return 'QUALITY';
            if ((prioUpper.includes('GAMAS') && !prioUpper.includes('NON')) || (deskUpper.includes('GAMAS') && !deskUpper.includes('NON'))) return 'GAMAS';
            return 'NON-GAMAS';
        };

        const oloGroups = {};
        ['BEKASI', 'KARAWANG'].forEach(b => {
            oloGroups[b] = {
                'NON-GAMAS': { total: 0, comply: 0, notComply: 0, sumTtr: 0 },
                'GAMAS': { total: 0, comply: 0, notComply: 0, sumTtr: 0 },
                'QUALITY': { total: 0, comply: 0, notComply: 0, sumTtr: 0 }
            };
        });

        mttriOloData[0].forEach(row => {
            const rawBranch = (row.branch || '').trim().toUpperCase();
            let branch = null;
            if (rawBranch.includes('BEKASI')) branch = 'BEKASI';
            else if (rawBranch.includes('KARAWANG')) branch = 'KARAWANG';
            else return;

            const oloType = resolveOloType(row.priority, row.deskripsi);
            const ttrStr = row.ttr_tacc ? row.ttr_tacc.trim() : '';
            if (/^\s*[0-9]+([.,][0-9]+)?\s*$/.test(ttrStr)) {
                const ttrVal = parseFloat(ttrStr.replace(',', '.'));
                const target = OLO_CONFIG[oloType];
                oloGroups[branch][oloType].total += 1;
                oloGroups[branch][oloType].sumTtr += ttrVal;
                if (ttrVal <= target.targetHours) {
                    oloGroups[branch][oloType].comply += 1;
                } else {
                    oloGroups[branch][oloType].notComply += 1;
                }
            }
        });

        const oloCompliance = Object.keys(oloGroups).map(branch => {
            const types = OLO_TYPES_ORDER.map(tKey => {
                const stat = oloGroups[branch][tKey];
                const target = OLO_CONFIG[tKey];
                const avgTtr = stat.total > 0 ? (stat.sumTtr / stat.total).toFixed(2) : "0.00";
                const pct = stat.total > 0 ? ((stat.comply / stat.total) * 100) : 100;
                const isMet = stat.total === 0 || (parseFloat(avgTtr) <= target.targetHours && pct >= target.targetPct);

                return {
                    typeKey: tKey,
                    label: target.label,
                    total: stat.total,
                    comply: stat.comply,
                    notComply: stat.notComply,
                    avgTtr,
                    targetHours: target.targetHours,
                    targetPct: target.targetPct,
                    pct: pct.toFixed(2),
                    isMet
                };
            });

            const totalTiket = types.reduce((acc, curr) => acc + curr.total, 0);
            const totalComply = types.reduce((acc, curr) => acc + curr.comply, 0);
            const totalNotComply = types.reduce((acc, curr) => acc + curr.notComply, 0);
            const totalSumTtr = OLO_TYPES_ORDER.reduce((acc, k) => acc + oloGroups[branch][k].sumTtr, 0);
            const totalAvgTtr = totalTiket > 0 ? (totalSumTtr / totalTiket).toFixed(2) : "0.00";
            const totalPct = totalTiket > 0 ? ((totalComply / totalTiket) * 100).toFixed(2) : "100.00";

            return {
                branch,
                types,
                total: {
                    total: totalTiket,
                    comply: totalComply,
                    notComply: totalNotComply,
                    avgTtr: totalAvgTtr,
                    pct: totalPct,
                    isMet: parseFloat(totalPct) >= 90
                }
            };
        });

        // --- MS COMPLIANCE PER BRANCH ---
        const MS_CATS = [
            { key: 'UMT', label: 'UMT', category: 'UMT', subcategory: '' },
            { key: 'CENTRATAMA', label: 'CENTRATAMA', category: 'CENTRATAMA', subcategory: '' },
            { key: 'MTEL_TIS', label: 'MTEL - TIS', category: 'MTEL', subcategory: 'TIS' },
            { key: 'MTEL_FIBERISASI', label: 'MTEL - FIBERISASI', category: 'MTEL', subcategory: 'FIBERISASI' },
            { key: 'MTEL_MMP', label: 'MTEL - MMP', category: 'MTEL', subcategory: 'MMP' }
        ];

        const msBranchGroups = {};
        ['BEKASI', 'KARAWANG'].forEach(b => {
            msBranchGroups[b] = {};
            MS_CATS.forEach(c => {
                msBranchGroups[b][c.key] = { total: 0, met: 0, missed: 0, sumTtr: 0 };
            });
        });

        const processMsBranchRow = (row, key) => {
            const rawBranch = (row.branch || '').trim().toUpperCase();
            let branch = null;
            if (rawBranch.includes('BEKASI')) branch = 'BEKASI';
            else if (rawBranch.includes('KARAWANG')) branch = 'KARAWANG';
            else return;

            const ttrStr = row.ttr_tacc ? row.ttr_tacc.trim() : '';
            if (/^\s*[0-9]+([.,][0-9]+)?\s*$/.test(ttrStr)) {
                const ttrVal = parseFloat(ttrStr.replace(',', '.'));
                if (msBranchGroups[branch] && msBranchGroups[branch][key]) {
                    msBranchGroups[branch][key].total += 1;
                    msBranchGroups[branch][key].sumTtr += ttrVal;
                    if (ttrVal <= 4) {
                        msBranchGroups[branch][key].met += 1;
                    } else {
                        msBranchGroups[branch][key].missed += 1;
                    }
                }
            }
        };

        ttrRawUmtCentData[0].forEach(row => processMsBranchRow(row, row.category));
        ttrRawMtelData[0].forEach(row => processMsBranchRow(row, `MTEL_${row.subcategory}`));

        const msCompliance = Object.keys(msBranchGroups).map(branch => {
            const rows = MS_CATS.map(c => {
                const stat = msBranchGroups[branch][c.key];
                const avgTtr = stat.total > 0 ? (stat.sumTtr / stat.total).toFixed(2) : "0.00";
                const pct = stat.total > 0 ? ((stat.met / stat.total) * 100).toFixed(2) : "100.00";
                const isMet = stat.total === 0 || parseFloat(avgTtr) <= 4;

                return {
                    key: c.key,
                    label: c.label,
                    category: c.category,
                    subcategory: c.subcategory,
                    total: stat.total,
                    met: stat.met,
                    missed: stat.missed,
                    avg: avgTtr,
                    pct,
                    isMet
                };
            });

            const totalTiket = rows.reduce((acc, curr) => acc + curr.total, 0);
            const totalMet = rows.reduce((acc, curr) => acc + curr.met, 0);
            const totalMissed = rows.reduce((acc, curr) => acc + curr.missed, 0);
            const totalSumTtr = MS_CATS.reduce((acc, c) => acc + msBranchGroups[branch][c.key].sumTtr, 0);
            const totalAvgTtr = totalTiket > 0 ? (totalSumTtr / totalTiket).toFixed(2) : "0.00";
            const totalPct = totalTiket > 0 ? ((totalMet / totalTiket) * 100).toFixed(2) : "100.00";

            return {
                branch,
                rows,
                total: {
                    total: totalTiket,
                    met: totalMet,
                    missed: totalMissed,
                    avg: totalAvgTtr,
                    pct: totalPct,
                    isMet: totalTiket === 0 || parseFloat(totalAvgTtr) <= 4
                }
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
            ttr: ttrStats,
            mttriCompliance,
            oloCompliance,
            msCompliance
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Gagal mengambil statistik: ' + error.message }, { status: 500 });
    }
}