import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!await verifyJWT(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        let monthParam = searchParams.get('month'); // "2026-03"

        const now = new Date();
        const currentYearStr = now.getFullYear().toString();
        const currentMonthStr = (now.getMonth() + 1).toString().padStart(2, '0');
        
        if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
            monthParam = `${currentYearStr}-${currentMonthStr}`;
        }

        const [yearStr, mStr] = monthParam.split('-');
        const targetYear = parseInt(yearStr, 10);
        const targetMonth = parseInt(mStr, 10);

        // Date boundaries
        const isCurrentMonth = (targetYear === now.getFullYear() && targetMonth === now.getMonth() + 1);
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
        
        const currentDay = now.getDate();
        
        let hariBerjalan = daysInMonth;
        let sisaHari = 0;

        if (isCurrentMonth) {
            hariBerjalan = Math.max(1, currentDay - 1); // H-1
            sisaHari = Math.max(1, daysInMonth - hariBerjalan);
        }

        // Query Database
        let dateCondition = "tiket_time >= ? AND tiket_time < DATE_ADD(?, INTERVAL 1 MONTH)";
        let dateParams = [`${monthParam}-01`, `${monthParam}-01`];

        const [tsaData] = await db.query(`
            SELECT 
                COUNT(id) as totalIncident,
                COALESCE(SUM(impacted_sites), 0) as totalSiteDown,
                COALESCE(SUM(outage_hours), 0) as outageMtd
            FROM tickets 
            WHERE category = 'SQUAT' AND status = 'CLOSED' 
            AND branch = 'BEKASI'
            AND outage_hours IS NOT NULL
            AND ${dateCondition}
        `, dateParams);

        const row = tsaData[0] || { totalIncident: 0, totalSiteDown: 0, outageMtd: 0 };
        const outageMtd = parseFloat(row.outageMtd);

        // A. ACHIEVEMENT TSA (B.1)
        const totalBilling = 757; // Sesuai kesepakatan Bekasi Only
        const targetPct = 99.95;
        const supportedHours = totalBilling * hariBerjalan * 24;
        
        const tsaPct = supportedHours > 0 ? ((supportedHours - outageMtd) / supportedHours) * 100 : 100;
        
        const bekasiAch = {
            branch: 'BEKASI',
            district: 'BEKASI',
            totalBilling,
            totalIncident: row.totalIncident,
            totalSiteDown: row.totalSiteDown,
            supportedHours,
            outageHours: outageMtd,
            tsaPct: parseFloat(tsaPct.toFixed(3)),
            targetPct,
            isComply: tsaPct >= targetPct
        };

        // B. SISA BUDGET OUTAGE (B.2)
        const supportedFullMonth = totalBilling * daysInMonth * 24;
        const budgetOutageFullMonth = supportedFullMonth * (1 - (targetPct / 100)); // 0.0005
        const sisaBudgetOutage = budgetOutageFullMonth - outageMtd;
        const maxOutagePerDay = sisaHari > 0 ? sisaBudgetOutage / sisaHari : 0;

        const bekasiBud = {
            branch: 'BEKASI',
            district: 'BEKASI',
            totalBilling,
            supportedFullMonth,
            budgetOutageFullMonth: parseFloat(budgetOutageFullMonth.toFixed(2)),
            outageMtd,
            sisaBudgetOutage: parseFloat(sisaBudgetOutage.toFixed(2)),
            maxOutagePerDay: parseFloat(maxOutagePerDay.toFixed(2)),
            isSafe: sisaBudgetOutage > 0
        };

        // C. PROYEKSI FULL MONTH (B.3)
        const historiPerHari = hariBerjalan > 0 ? outageMtd / hariBerjalan : 0;
        const proyeksiOutageSisaHari = isCurrentMonth ? historiPerHari * sisaHari : 0;
        const proyeksiOutageFm = outageMtd + proyeksiOutageSisaHari;
        
        const proyeksiTsaFm = supportedFullMonth > 0 
            ? ((supportedFullMonth - proyeksiOutageFm) / supportedFullMonth) * 100 
            : 100;

        const proyeksiBekasi = {
            branch: 'BEKASI',
            district: 'BEKASI',
            historiPerHari: parseFloat(historiPerHari.toFixed(2)),
            sisaHari,
            proyeksiOutageSisaHari: parseFloat(proyeksiOutageSisaHari.toFixed(2)),
            proyeksiOutageFm: parseFloat(proyeksiOutageFm.toFixed(2)),
            proyeksiTsaFm: parseFloat(proyeksiTsaFm.toFixed(3)),
            isMet: proyeksiTsaFm >= targetPct
        };

        // D. TOP 3 OUTAGE TICKETS BEKASI
        const [topTicketsData] = await db.query(`
            SELECT 
                id_tiket as incident,
                '-' as siteId,
                sto,
                DATE_FORMAT(tiket_time, '%Y-%m-%d %H:%i') as reportedDate,
                priority as severity,
                ttr_tacc as ttr,
                impacted_sites as impactedSites,
                outage_hours as outageHours,
                update_progres as rca
            FROM tickets 
            WHERE category = 'SQUAT' AND status = 'CLOSED' 
            AND branch = 'BEKASI'
            AND outage_hours IS NOT NULL
            AND ${dateCondition}
            ORDER BY outage_hours DESC
            LIMIT 3
        `, dateParams);

        const topTicketsBekasi = topTicketsData.map(t => ({
            branch: 'BEKASI',
            district: 'BEKASI',
            ...t
        }));

        // E. FORMAT BROADCAST TEXT
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const mName = monthNames[targetMonth - 1];
        const mYear = targetYear;

        const broadcastText = `*Realisasi TSA (Branch Bekasi) - ${mName} ${mYear}*
Realisasi TSA : ${bekasiAch.tsaPct.toFixed(3)}% (Target: 99,950%)
Status : ${bekasiAch.isComply ? 'COMPLY (V)' : 'NOT COMPLY (X)'}
Total Site Billing : ${bekasiAch.totalBilling} Site
Total Insiden : ${bekasiAch.totalIncident} Tiket (${bekasiAch.totalSiteDown} Site Down)
Total Outage : ${Math.round(bekasiAch.outageHours)} Jam

*Sisa Budget Outage Branch Bekasi*
Budget Outage FM : ${Math.round(bekasiBud.budgetOutageFullMonth)} Jam
Realisasi Outage : ${Math.round(bekasiBud.outageMtd)} Jam
Sisa Budget Outage : ${Math.round(bekasiBud.sisaBudgetOutage)} Jam | ${Math.round(bekasiBud.maxOutagePerDay)} Jam/Hari ${bekasiBud.isSafe ? '(V)' : '(X)'}

*Proyeksi FM ${mName} ${mYear} (Branch Bekasi)*
Histori Outage/Hari : ${proyeksiBekasi.historiPerHari} Jam
Sisa Hari : ${proyeksiBekasi.sisaHari} Hari
Proyeksi Outage Sisa Hari : ${proyeksiBekasi.proyeksiOutageSisaHari} Jam
Proyeksi Outage FM ${mName} : ${proyeksiBekasi.proyeksiOutageFm} Jam
*Proyeksi TSA FM ${mName} : ${proyeksiBekasi.proyeksiTsaFm}% (${proyeksiBekasi.isMet ? 'MENCAPAI TARGET' : 'TIDAK MENCAPAI TARGET'})*`;

        return NextResponse.json({
            success: true,
            lastUpdated: new Date().toISOString(),
            scope: 'BEKASI',
            achievement: [bekasiAch],
            budgetOutage: [bekasiBud],
            proyeksi: [proyeksiBekasi],
            topTickets: topTicketsBekasi,
            broadcastText
        });

    } catch (error) {
        console.error("❌ [API-TSA] Error:", error);
        return NextResponse.json({ error: 'Gagal mengambil data KPI TSA: ' + error.message }, { status: 500 });
    }
}
