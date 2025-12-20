import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request, props) {
    try {
        // FIX: Await params agar ID tiket terbaca di Next.js 15+
        const params = await props.params;
        const { id } = params;
        
        const [history] = await db.query(`
            SELECT * FROM ticket_history 
            WHERE ticket_id = ? 
            ORDER BY change_timestamp DESC
        `, [id]);

        return NextResponse.json(history);
    } catch (error) {
        console.error("History Error:", error);
        return NextResponse.json({ error: 'Gagal ambil history' }, { status: 500 });
    }
}