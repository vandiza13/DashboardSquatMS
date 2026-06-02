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
        
        const currentRole = user?.role || 'User';
        const currentDivision = user?.division || 'SQUAT';

        if (!user || (currentRole !== 'Admin' && currentRole !== 'SuperAdmin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { name, position_name, phone_number, is_active, new_nik, division } = body;

        // FIX: Pastikan status tidak NULL. Jika kosong, anggap 1 (Aktif)
        const status = (is_active === undefined || is_active === null) ? 1 : is_active;

        const updatedNik = new_nik || nik;
        const isNikChanged = updatedNik !== nik;

        // Cek teknisi saat ini untuk validasi divisi
        const [existingTech] = await db.query('SELECT division FROM technicians WHERE nik = ?', [nik]);
        if (existingTech.length === 0) {
            return NextResponse.json({ error: 'Teknisi tidak ditemukan' }, { status: 404 });
        }

        const techDivision = existingTech[0].division;

        if (currentRole !== 'SuperAdmin' && currentDivision !== 'ALL') {
            if (currentDivision !== techDivision || currentDivision !== division) {
                return NextResponse.json({ error: `Akses ditolak. Anda hanya bisa mengedit teknisi divisi ${currentDivision}.` }, { status: 403 });
            }
        }

        // Gunakan transaction jika NIK berubah agar child table ikut terupdate
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Nonaktifkan foreign key checks sementara agar NIK bisa diubah
            if (isNikChanged) {
                await connection.query('SET FOREIGN_KEY_CHECKS = 0');
            }

            // 1. Update data teknisi di tabel parent
            const [result] = await connection.query(
                `UPDATE technicians 
                 SET nik = ?, name = ?, position_name = ?, phone_number = ?, division = ?, is_active = ? 
                 WHERE nik = ?`,
                [updatedNik, name, position_name, phone_number, division, status, nik]
            );

            if (result.affectedRows === 0) {
                await connection.query('SET FOREIGN_KEY_CHECKS = 1');
                await connection.rollback();
                return NextResponse.json({ error: 'Teknisi tidak ditemukan' }, { status: 404 });
            }

            // 2. Jika NIK berubah, update juga di tabel child (ticket_technicians)
            if (isNikChanged) {
                await connection.query(
                    'UPDATE ticket_technicians SET technician_nik = ? WHERE technician_nik = ?',
                    [updatedNik, nik]
                );
                await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            }

            await connection.commit();
            return NextResponse.json({ message: 'Data teknisi berhasil diupdate' });
        } catch (txError) {
            await connection.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => { });
            await connection.rollback();
            throw txError;
        } finally {
            connection.release();
        }
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

        if (!user || user.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Hanya SuperAdmin yang bisa menghapus data permanen' }, { status: 403 });
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