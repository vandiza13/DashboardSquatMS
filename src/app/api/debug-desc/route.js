import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const [rows] = await db.query("SELECT id_tiket, deskripsi FROM tickets WHERE category = 'SQUAT' LIMIT 20");
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
