import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || user.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Akses ditolak. Hanya SuperAdmin yang diperbolehkan.' }, { status: 403 });
        }

        const body = await request.json();
        const { action, niks, division } = body;

        if (!action || !Array.isArray(niks) || niks.length === 0) {
            return NextResponse.json({ error: 'Payload tidak valid. Butuh action dan niks.' }, { status: 400 });
        }

        if (action === 'edit-division') {
            if (!division || !['SQUAT', 'MS'].includes(division)) {
                return NextResponse.json({ error: 'Divisi tujuan tidak valid.' }, { status: 400 });
            }

            // Update divisi untuk semua NIK yang dipilih
            await db.query(
                'UPDATE technicians SET division = ? WHERE nik IN (?)',
                [division, niks]
            );

            return NextResponse.json({ message: `Divisi dari ${niks.length} teknisi berhasil diperbarui ke ${division}.` });
        } 

        if (action === 'delete') {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                // Nonaktifkan FK checks sementara agar aman menghapus relasi
                await connection.query('SET FOREIGN_KEY_CHECKS = 0');

                // Bersihkan relasi di ticket_technicians
                await connection.query('DELETE FROM ticket_technicians WHERE technician_nik IN (?)', [niks]);

                // Hapus data teknisi dari tabel parent
                const [result] = await connection.query('DELETE FROM technicians WHERE nik IN (?)', [niks]);

                await connection.query('SET FOREIGN_KEY_CHECKS = 1');
                await connection.commit();

                return NextResponse.json({ message: `${result.affectedRows} teknisi berhasil dihapus secara permanen.` });
            } catch (txError) {
                await connection.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
                await connection.rollback();
                throw txError;
            } finally {
                connection.release();
            }
        }

        return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 });

    } catch (error) {
        console.error('Bulk Action Technicians Error:', error);
        return NextResponse.json({ error: 'Gagal memproses aksi massal: ' + error.message }, { status: 500 });
    }
}
