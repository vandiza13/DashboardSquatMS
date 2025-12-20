import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function PUT(request, { params }) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user || user.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { nik } = params;
        const body = await request.json();
        const { is_active } = body;

        await db.query('UPDATE technicians SET is_active = ? WHERE nik = ?', [is_active, nik]);

        return NextResponse.json({ message: 'Status teknisi diperbarui' });
    } catch (error) {
        return NextResponse.json({ error: 'Gagal update status' }, { status: 500 });
    }
}