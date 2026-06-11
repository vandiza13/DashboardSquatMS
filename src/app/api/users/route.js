import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET: Ambil Semua User
export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        // Validasi Role (Hanya SuperAdmin yang bisa mengelola User)
        if (!user || user.role !== 'SuperAdmin') return NextResponse.json({ error: 'Forbidden: Requires SuperAdmin' }, { status: 403 });

        const [users] = await db.query('SELECT id, username, full_name, display_name, role, division FROM users ORDER BY username ASC');
        return NextResponse.json(users);
    } catch (error) {
        console.error("Get Users Error:", error.message, error.stack);
        return NextResponse.json({ error: 'Gagal ambil data user', details: error.message }, { status: 500 });
    }
}

// POST: Tambah User Baru
export async function POST(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const requester = await verifyJWT(token);
        // Validasi Role (Hanya SuperAdmin)
        if (!requester || requester.role !== 'SuperAdmin') return NextResponse.json({ error: 'Forbidden: Requires SuperAdmin' }, { status: 403 });

        const body = await request.json();
        const { username, password, role, division, full_name, display_name } = body;

        // Validasi Input
        if (!username || !password) {
            return NextResponse.json({ error: 'Username dan Password wajib diisi' }, { status: 400 });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert ke DB
        await db.query(
            'INSERT INTO users (username, full_name, display_name, password, role, division) VALUES (?, ?, ?, ?, ?, ?)',
            [username, full_name || null, display_name || null, hashedPassword, role || 'User', division || 'SQUAT']
        );

        return NextResponse.json({ message: 'User berhasil dibuat' }, { status: 201 });

    } catch (error) {
        console.error("Create User Error:", error); // Log error di terminal
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Gagal membuat user' }, { status: 500 });
    }
}
