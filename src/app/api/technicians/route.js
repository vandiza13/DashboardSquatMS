import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Ambil Semua Teknisi
export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const [technicians] = await db.query('SELECT * FROM technicians ORDER BY name ASC');
        return NextResponse.json(technicians);
    } catch (error) {
        console.error('Technicians Error:', error);
        return NextResponse.json({ error: 'Gagal mengambil data teknisi' }, { status: 500 });
    }
}

// POST: Tambah Teknisi Baru
export async function POST(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        
        if (!user || user.role !== 'Admin') {
            return NextResponse.json({ error: 'Akses ditolak. Hanya Admin.' }, { status: 403 });
        }

        const body = await request.json();
        // HAPUS sto & sector dari sini
        const { nik, name, position_name, phone_number } = body;

        if (!nik || !name) {
            return NextResponse.json({ error: 'NIK dan nama harus diisi' }, { status: 400 });
        }

        // Query Insert Tanpa STO & Sector
        await db.query(
            'INSERT INTO technicians (nik, name, position_name, phone_number, is_active) VALUES (?, ?, ?, ?, 1)',
            [nik, name, position_name, phone_number]
        );

        return NextResponse.json({ message: 'Teknisi berhasil ditambahkan' }, { status: 201 });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 400 });
        }
        console.error('Add Technician Error:', error);
        return NextResponse.json({ error: 'Gagal menambahkan teknisi' }, { status: 500 });
    }
}