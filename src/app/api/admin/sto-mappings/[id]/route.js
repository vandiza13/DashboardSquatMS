import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
    try {
        const token = request.cookies.get('token')?.value;
        const requester = await verifyJWT(token);
        
        if (!requester || requester.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Forbidden: Requires SuperAdmin' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { sto, branch } = body;

        if (!sto || !branch) {
            return NextResponse.json({ error: 'STO dan Branch wajib diisi' }, { status: 400 });
        }

        const [result] = await db.query(
            'UPDATE sto_branch_mappings SET sto = ?, branch = ? WHERE id = ?',
            [sto.toUpperCase(), branch.toUpperCase(), id]
        );

        if (result.affectedRows === 0) {
             return NextResponse.json({ error: 'Mapping tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Mapping berhasil diupdate' });
    } catch (error) {
        console.error("Update Mapping Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'STO sudah ada di mapping lain' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Gagal update mapping' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
     try {
        const token = request.cookies.get('token')?.value;
        const requester = await verifyJWT(token);
        
        if (!requester || requester.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Forbidden: Requires SuperAdmin' }, { status: 403 });
        }

        const { id } = await params;
        const [result] = await db.query('DELETE FROM sto_branch_mappings WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
             return NextResponse.json({ error: 'Mapping tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Mapping berhasil dihapus' });
    } catch (error) {
        console.error("Delete Mapping Error:", error);
        return NextResponse.json({ error: 'Gagal hapus mapping' }, { status: 500 });
    }
}
