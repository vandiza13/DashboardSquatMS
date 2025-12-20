import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(request, { params }) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        
        // HANYA ADMIN YANG BOLEH RESET PASSWORD ORANG LAIN
        if (!user || user.role !== 'Admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = params;
        const body = await request.json();
        const { newPassword } = body;

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

        return NextResponse.json({ message: 'Password berhasil di-reset' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        return NextResponse.json({ error: 'Gagal reset password' }, { status: 500 });
    }
}