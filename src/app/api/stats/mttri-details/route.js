import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TSEL_CONFIG = {
    LOW: { targetPct: 91, targetHours: 24 },
    MINOR: { targetPct: 91, targetHours: 16 },
    MAJOR: { targetPct: 82, targetHours: 8 },
    CRITICAL: { targetPct: 73, targetHours: 4 }
};

const OLO_CONFIG = {
    'NON-GAMAS': { label: 'Non GAMAS', targetHours: 4, targetPct: 90 },
    'GAMAS': { label: 'GAMAS', targetHours: 7, targetPct: 90 },
    'QUALITY': { label: 'QUALITY', targetHours: 7, targetPct: 90 }
};

const resolveOloType = (priority, deskripsi) => {
    const prioUpper = (priority || '').toUpperCase();
    const deskUpper = (deskripsi || '').toUpperCase();

    if (prioUpper.includes('QUALITY') || deskUpper.includes('QUALITY')) return 'QUALITY';
    if ((prioUpper.includes('GAMAS') && !prioUpper.includes('NON')) || (deskUpper.includes('GAMAS') && !deskUpper.includes('NON'))) return 'GAMAS';
    return 'NON-GAMAS';
};

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!await verifyJWT(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const categoryParam = (searchParams.get('category') || 'SQUAT').toUpperCase(); // 'SQUAT' | 'MS' | 'UMT' | 'CENTRATAMA' | 'MTEL'
        const subcategoryParam = (searchParams.get('subcategory') || '').toUpperCase(); // 'TSEL' | 'OLO' | 'TIS' | 'FIBERISASI' | 'MMP' | ''
        const branchParam = searchParams.get('branch'); // 'BEKASI' | 'KARAWANG'
        const severityParam = searchParams.get('severity'); // 'LOW' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'NON-GAMAS' | 'GAMAS' | 'QUALITY' | 'TOTAL'
        const typeParam = searchParams.get('type'); // 'comply' | 'not_comply'
        const monthParam = searchParams.get('month'); // '2026-08'

        let dateCondition = "t.tiket_time >= DATE_FORMAT(NOW(), '%Y-%m-01')";
        let queryParams = [];

        if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
            dateCondition = "t.tiket_time >= ? AND t.tiket_time < DATE_ADD(?, INTERVAL 1 MONTH)";
            queryParams.push(`${monthParam}-01`, `${monthParam}-01`);
        }

        let catCondition = "";
        let catParams = [];

        if (categoryParam === 'MS') {
            catCondition = "t.category IN ('UMT', 'CENTRATAMA', 'MTEL')";
        } else if (categoryParam === 'UMT' || categoryParam === 'CENTRATAMA') {
            catCondition = "t.category = ?";
            catParams.push(categoryParam);
        } else if (categoryParam === 'MTEL') {
            catCondition = "t.category = 'MTEL'";
            if (subcategoryParam && subcategoryParam !== 'TOTAL') {
                catCondition += " AND t.subcategory = ?";
                catParams.push(subcategoryParam);
            }
        } else {
            // SQUAT (TSEL / OLO)
            catCondition = "t.category = 'SQUAT'";
            if (subcategoryParam) {
                catCondition += " AND t.subcategory = ?";
                catParams.push(subcategoryParam);
            }
        }

        const query = `
            SELECT 
                t.id,
                t.id_tiket,
                t.category,
                t.subcategory,
                t.priority,
                t.sto,
                COALESCE(NULLIF(TRIM(t.branch), ''), 'BEKASI') as branch,
                t.deskripsi,
                t.status,
                t.ttr_tacc,
                t.tiket_time,
                t.last_update_time,
                t.update_progres,
                MAX(tech.name) as technician_name,
                MAX(tech.phone_number) as technician_phone,
                t.partner_technicians
            FROM tickets t
            LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
            LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
            WHERE t.status = 'CLOSED'
              AND ${catCondition}
              AND t.ttr_tacc IS NOT NULL
              AND TRIM(t.ttr_tacc) != ''
              AND ${dateCondition}
            GROUP BY t.id
            ORDER BY t.tiket_time DESC
        `;

        const [tickets] = await db.query(query, [...catParams, ...queryParams]);

        // Filter dan tandai status Comply / Not Comply
        const result = tickets.map(ticket => {
            const rawBranch = (ticket.branch || 'BEKASI').trim().toUpperCase();
            let resolvedBranch = 'BEKASI';
            if (rawBranch.includes('KARAWANG')) resolvedBranch = 'KARAWANG';
            else if (rawBranch.includes('BEKASI')) resolvedBranch = 'BEKASI';

            let resolvedType = '';
            let targetHours = 4; // Default MS: 4 Jam

            if (ticket.category === 'SQUAT') {
                if (subcategoryParam === 'OLO' || ticket.subcategory === 'OLO') {
                    resolvedType = resolveOloType(ticket.priority, ticket.deskripsi);
                    targetHours = OLO_CONFIG[resolvedType]?.targetHours || 4;
                } else {
                    resolvedType = (ticket.priority || 'LOW').trim().toUpperCase();
                    targetHours = TSEL_CONFIG[resolvedType]?.targetHours || 24;
                }
            } else {
                // MS Categories
                resolvedType = ticket.subcategory ? `${ticket.category}-${ticket.subcategory}` : ticket.category;
                targetHours = 4;
            }

            const ttrVal = parseFloat(String(ticket.ttr_tacc).replace(',', '.'));
            const isComply = !isNaN(ttrVal) && ttrVal <= targetHours;

            return {
                ...ticket,
                resolvedBranch,
                resolvedType,
                targetHours,
                ttrVal,
                isComply
            };
        }).filter(ticket => {
            // Filter Branch (Hanya untuk SQUAT bila branchParam ada)
            if (branchParam && ticket.resolvedBranch !== branchParam.toUpperCase()) {
                return false;
            }

            // Filter Severity / Type untuk SQUAT
            if (ticket.category === 'SQUAT' && severityParam && severityParam !== 'TOTAL' && severityParam !== 'ALL') {
                if (ticket.resolvedType !== severityParam.toUpperCase()) {
                    return false;
                }
            }

            // Filter Type (comply / not_comply)
            if (typeParam === 'comply' && !ticket.isComply) return false;
            if (typeParam === 'not_comply' && ticket.isComply) return false;

            return true;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("MTTR Details Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
