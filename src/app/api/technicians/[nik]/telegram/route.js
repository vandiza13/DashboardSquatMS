import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, props) {
    try {
        const params = await props.params;
        const { nik } = params;

        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || user.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Akses ditolak. Hanya SuperAdmin yang diperbolehkan.' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const { action } = body;

        // Cek keberadaan teknisi
        const [techRows] = await db.query('SELECT nik, name, telegram_chat_id, telegram_is_active FROM technicians WHERE nik = ?', [nik]);
        if (techRows.length === 0) {
            return NextResponse.json({ error: 'Teknisi tidak ditemukan' }, { status: 404 });
        }

        const tech = techRows[0];

        if (action === 'reset') {
            await db.query(
                'UPDATE technicians SET telegram_chat_id = NULL, telegram_username = NULL, telegram_registered_at = NULL WHERE nik = ?',
                [nik]
            );
            return NextResponse.json({ message: `Akun Telegram untuk ${tech.name} berhasil di-reset.` });
        }

        if (action === 'toggle-status') {
            const nextStatus = tech.telegram_is_active === 1 ? 0 : 1;
            await db.query(
                'UPDATE technicians SET telegram_is_active = ? WHERE nik = ?',
                [nextStatus, nik]
            );
            return NextResponse.json({ 
                message: `Akses Telegram untuk ${tech.name} berhasil ${nextStatus === 1 ? 'diaktifkan' : 'dinonaktifkan'}.`,
                telegram_is_active: nextStatus
            });
        }

        return NextResponse.json({ error: 'Aksi tidak valid. Gunakan action "reset" atau "toggle-status".' }, { status: 400 });

    } catch (error) {
        console.error('Technician Telegram API Error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
    }
}
