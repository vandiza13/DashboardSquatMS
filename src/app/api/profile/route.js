import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET: Ambil Profil Saya
export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const [rows] = await db.query(
            'SELECT id, username, full_name, display_name, role, created_at FROM users WHERE id = ?',
            [user.userId]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil profil' }, { status: 500 });
    }
}

// PUT: Ganti Profil Sendiri
export async function PUT(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { full_name, display_name, currentPassword, newPassword } = body;

        // Validasi minimal salah satu harus ada
        if (full_name === undefined && display_name === undefined && !currentPassword && !newPassword) {
            return NextResponse.json({ error: 'Tidak ada data untuk diupdate' }, { status: 400 });
        }

        const updates = [];
        const values = [];

        if (full_name !== undefined) {
            updates.push('full_name = ?');
            values.push(full_name);
        }
        if (display_name !== undefined) {
            updates.push('display_name = ?');
            values.push(display_name);
        }

        // Jika user bermaksud mengubah password
        if (currentPassword || newPassword) {
            if (!currentPassword || !newPassword) {
                return NextResponse.json({ error: 'Password lama dan baru harus diisi' }, { status: 400 });
            }

            if (newPassword.length < 6) {
                return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
            }

            // 1. Ambil Password Lama dari DB
            const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [user.userId]);
            if (rows.length === 0) {
                return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
            }

            // 2. Cek Password Lama
            const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
            if (!isMatch) {
                return NextResponse.json({ error: 'Password lama salah' }, { status: 400 });
            }

            // 3. Hash Password Baru
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updates.push('password = ?');
            values.push(hashedPassword);
        }

        if (updates.length > 0) {
            values.push(user.userId);
            await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        return NextResponse.json({ message: 'Profil berhasil diperbarui' });

    } catch (error) {
        console.error('Change Profile Error:', error);
        return NextResponse.json({ error: 'Gagal memperbarui profil' }, { status: 500 });
    }
}