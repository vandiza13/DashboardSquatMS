import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth';

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        // 1. Validasi Input
        if (!username || !password) {
            return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
        }

        // 2. Cek User di Database
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (rows.length === 0) {
            return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 401 });
        }

        const user = rows[0];

        // 3. Cek Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json({ error: 'Password salah' }, { status: 401 });
        }

        // 4. Buat Token JWT
        const token = await signJWT({ 
            userId: user.id, 
            username: user.username, 
            role: user.role 
        });

        // 5. Kirim Response dengan Cookie
        const response = NextResponse.json({ 
            message: 'Login Berhasil',
            user: { username: user.username, role: user.role }
        });

        // Set Cookie yang Aman (HTTP Only)
        response.cookies.set('token', token, {
            httpOnly: true, // Tidak bisa dibaca script frontend (Anti-XSS)
            secure: process.env.NODE_ENV === 'production', // Wajib HTTPS di production
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 7 Hari
        });

        return response;

    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}