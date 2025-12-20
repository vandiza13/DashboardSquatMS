import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: Ambil Semua User (Kecuali Password)
export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user || user.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const [users] = await db.query('SELECT id, username, role FROM users ORDER BY username ASC');
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Gagal ambil data user' }, { status: 500 });
    }
}

// POST: Tambah User Baru
export async function POST(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const requester = await verifyJWT(token);
        if (!requester || requester.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { username, password, role } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username dan Password wajib' }, { status: 400 });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert
        await db.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role || 'User']
        );

        return NextResponse.json({ message: 'User berhasil dibuat' }, { status: 201 });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Username sudah dipakai' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}