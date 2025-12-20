import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: Ambil Profil Saya
export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const [rows] = await db.query(
            'SELECT id, username, role, created_at FROM users WHERE id = ?',
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

// PUT: Ganti Password Sendiri
export async function PUT(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { currentPassword, newPassword } = body;

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

        // 3. Hash Password Baru & Update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.userId]);

        return NextResponse.json({ message: 'Password berhasil diubah' });

    } catch (error) {
        console.error('Change Password Error:', error);
        return NextResponse.json({ error: 'Gagal mengubah password' }, { status: 500 });
    }
}