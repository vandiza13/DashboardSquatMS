import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user || user.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const [rows] = await db.query(`SELECT * FROM billing_tsa ORDER BY month_year DESC`);
        return NextResponse.json({ success: true, data: rows });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch billing tsa data' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        
        if (!user || user.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Unauthorized, only SuperAdmin can update billing TSA' }, { status: 403 });
        }

        const body = await request.json();
        const { month_year, total_sites } = body;

        if (!month_year || !total_sites) {
            return NextResponse.json({ error: 'month_year and total_sites are required' }, { status: 400 });
        }

        // Insert or Update (Upsert)
        await db.query(`
            INSERT INTO billing_tsa (month_year, total_sites, updated_by)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            total_sites = VALUES(total_sites),
            updated_by = VALUES(updated_by)
        `, [month_year, total_sites, user.name || 'Admin']);

        return NextResponse.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error("API Error saving billing_tsa:", error);
        return NextResponse.json({ error: 'Failed to save billing tsa data' }, { status: 500 });
    }
}
