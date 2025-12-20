import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// PUT: Edit User (Ganti Role atau Reset Password)
export async function PUT(request, { params }) {
    try {
        const token = request.cookies.get('token')?.value;
        const requester = await verifyJWT(token);
        if (!requester || requester.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = params;
        const { role, password } = await request.json(); // Password dikirim hanya jika mau di-reset

        if (password) {
            // Logic Reset Password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
            return NextResponse.json({ message: 'Password berhasil di-reset' });
        } 
        
        if (role) {
            // Logic Ganti Role
            await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
            return NextResponse.json({ message: 'Role berhasil diubah' });
        }

        return NextResponse.json({ message: 'Tidak ada perubahan' });

    } catch (error) {
        return NextResponse.json({ error: 'Gagal update user' }, { status: 500 });
    }
}

// DELETE: Hapus User
export async function DELETE(request, { params }) {
    try {
        const token = request.cookies.get('token')?.value;
        const requester = await verifyJWT(token);
        if (!requester || requester.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = params;

        // Cegah Admin menghapus dirinya sendiri
        if (parseInt(id) === requester.userId) {
            return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });
        }

        await db.query('DELETE FROM users WHERE id = ?', [id]);
        return NextResponse.json({ message: 'User berhasil dihapus' });

    } catch (error) {
        return NextResponse.json({ error: 'Gagal hapus user' }, { status: 500 });
    }
}