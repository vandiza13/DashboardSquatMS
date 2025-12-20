import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Filter is_active = 1
        const [technicians] = await db.query('SELECT * FROM technicians WHERE is_active = 1 ORDER BY name ASC');
        return NextResponse.json(technicians);
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil teknisi aktif' }, { status: 500 });
    }
}