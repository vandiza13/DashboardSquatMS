import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        
        // This is available to any logged in user because frontend needs it to auto-fill branch
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const [mappings] = await db.query('SELECT * FROM sto_branch_mappings ORDER BY sto ASC');
        return NextResponse.json(mappings);
    } catch (error) {
        console.error("Get Mappings Error:", error);
        return NextResponse.json({ error: 'Gagal ambil data mapping', details: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const requester = await verifyJWT(token);
        
        // Only SuperAdmin can create mapping
        if (!requester || requester.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Forbidden: Requires SuperAdmin' }, { status: 403 });
        }

        const body = await request.json();
        const { sto, branch } = body;

        if (!sto || !branch) {
            return NextResponse.json({ error: 'STO dan Branch wajib diisi' }, { status: 400 });
        }

        await db.query(
            'INSERT INTO sto_branch_mappings (sto, branch) VALUES (?, ?)',
            [sto.toUpperCase(), branch.toUpperCase()]
        );

        return NextResponse.json({ message: 'Mapping berhasil dibuat' }, { status: 201 });

    } catch (error) {
        console.error("Create Mapping Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'STO sudah ada di mapping' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Gagal membuat mapping' }, { status: 500 });
    }
}
