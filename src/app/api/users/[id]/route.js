import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// PUT: Edit User (Ganti Role atau Reset Password)
export async function PUT(request, props) {
    // FIX: Await params wajib untuk Next.js 15+
    const params = await props.params;
    const { id } = params;

    try {
        const token = request.cookies.get('token')?.value;
        const requester = await verifyJWT(token);
        if (!requester || requester.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { role, password } = body; 

        if (password) {
            // Logic Reset Password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
            return NextResponse.json({ message: 'Password berhasil di-reset' });
        } 
        
        if (role) {
            // --- SECURITY PATCH: PROTEKSI MUTLAK ID 1 ---
            // Mencegah perubahan role untuk User ID 1
            if (parseInt(id) === 1) {
                return NextResponse.json({ error: 'Role Super Admin (ID: 1) bersifat mutlak dan tidak bisa diubah.' }, { status: 403 });
            }
            // --------------------------------------------

            // Logic Ganti Role
            await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
            return NextResponse.json({ message: 'Role berhasil diubah' });
        }

        return NextResponse.json({ message: 'Tidak ada perubahan' });

    } catch (error) {
        console.error("Update User Error:", error);
        return NextResponse.json({ error: 'Gagal update user' }, { status: 500 });
    }
}

// DELETE: Hapus User
export async function DELETE(request, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const token = request.cookies.get('token')?.value;
        const requester = await verifyJWT(token);
        if (!requester || requester.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // --- SECURITY PATCH: PROTEKSI MUTLAK ID 1 ---
        // Mencegah penghapusan User ID 1
        if (parseInt(id) === 1) {
            return NextResponse.json({ error: 'Super Admin (ID: 1) adalah akun sistem utama dan tidak bisa dihapus.' }, { status: 403 });
        }
        // --------------------------------------------

        // Cegah Admin menghapus dirinya sendiri (jika bukan ID 1 pun)
        if (parseInt(id) === requester.userId) {
            return NextResponse.json({ error: 'Tidak bisa menghapus akun yang sedang login' }, { status: 400 });
        }

        await db.query('DELETE FROM users WHERE id = ?', [id]);
        return NextResponse.json({ message: 'User berhasil dihapus' });

    } catch (error) {
        console.error("Delete User Error:", error);
        return NextResponse.json({ error: 'Gagal hapus user' }, { status: 500 });
    }
}