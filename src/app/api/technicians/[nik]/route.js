import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

// PUT: Update Data Teknisi (Nama/HP) - Hanya Admin
export async function PUT(request, { params }) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user || user.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { nik } = params;
        const body = await request.json();
        const { name, phone_number } = body;

        await db.query(
            'UPDATE technicians SET name = ?, phone_number = ? WHERE nik = ?',
            [name, phone_number, nik]
        );

        return NextResponse.json({ message: 'Data teknisi berhasil diperbarui' });
    } catch (error) {
        return NextResponse.json({ error: 'Gagal update teknisi' }, { status: 500 });
    }
}

// DELETE: Hapus Teknisi - Hanya Admin
export async function DELETE(request, { params }) {
    const connection = await db.getConnection();
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user || user.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { nik } = params;

        // Gunakan Transaction agar bersih (Hapus relasi di tiket dulu)
        await connection.beginTransaction();

        await connection.query('DELETE FROM ticket_technicians WHERE technician_nik = ?', [nik]);
        await connection.query('DELETE FROM technicians WHERE nik = ?', [nik]);

        await connection.commit();
        return NextResponse.json({ message: 'Teknisi berhasil dihapus' });

    } catch (error) {
        await connection.rollback();
        return NextResponse.json({ error: 'Gagal menghapus teknisi' }, { status: 500 });
    } finally {
        connection.release();
    }
}