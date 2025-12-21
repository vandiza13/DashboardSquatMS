import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PUT: Edit Data Teknisi
export async function PUT(request, props) {
    try {
        const params = await props.params;
        const { nik } = params;

        // Cek Auth
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        
        if (!user || user.role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { name, position_name, phone_number, is_active } = body;

        // FIX: Pastikan status tidak NULL. Jika kosong, anggap 1 (Aktif)
        const status = (is_active === undefined || is_active === null) ? 1 : is_active;

        const [result] = await db.query(
            `UPDATE technicians 
             SET name = ?, position_name = ?, phone_number = ?, is_active = ? 
             WHERE nik = ?`,
            [name, position_name, phone_number, status, nik]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Teknisi tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Data teknisi berhasil diupdate' });
    } catch (error) {
        console.error('Update Technician Error:', error);
        return NextResponse.json({ error: 'Gagal mengupdate teknisi' }, { status: 500 });
    }
}

// DELETE: Hapus Teknisi
export async function DELETE(request, props) {
    try {
        const params = await props.params;
        const { nik } = params;

        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        
        if (!user || user.role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const [result] = await db.query('DELETE FROM technicians WHERE nik = ?', [nik]);

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Teknisi tidak ditemukan' }, { status: 404 });
        }
        
        return NextResponse.json({ message: 'Teknisi dihapus' });
    } catch (error) {
        console.error('Delete Technician Error:', error);
        return NextResponse.json({ error: 'Gagal menghapus teknisi' }, { status: 500 });
    }
}