import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Ambil Semua Teknisi (dengan Filter)
export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const divisionFilter = searchParams.get('division') || 'ALL';

        let query = 'SELECT * FROM technicians WHERE 1=1';
        const params = [];

        if (divisionFilter !== 'ALL') {
            query += ' AND division = ?';
            params.push(divisionFilter);
        }

        query += ' ORDER BY name ASC';

        const [technicians] = await db.query(query, params);
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
        
        const currentRole = user?.role || 'User';
        const currentDivision = user?.division || 'SQUAT';

        if (!user || (currentRole !== 'Admin' && currentRole !== 'SuperAdmin')) {
            return NextResponse.json({ error: 'Akses ditolak. Hanya Admin atau SuperAdmin.' }, { status: 403 });
        }

        const body = await request.json();
        const { nik, name, position_name, phone_number, division } = body;

        if (!nik || !name || !division) {
            return NextResponse.json({ error: 'NIK, nama, dan divisi harus diisi' }, { status: 400 });
        }

        if (currentRole !== 'SuperAdmin' && currentDivision !== 'ALL') {
            if (currentDivision !== division) {
                return NextResponse.json({ error: `Akses ditolak. Anda hanya bisa membuat teknisi divisi ${currentDivision}.` }, { status: 403 });
            }
        }

        await db.query(
            'INSERT INTO technicians (nik, name, position_name, phone_number, division, is_active) VALUES (?, ?, ?, ?, ?, 1)',
            [nik, name, position_name, phone_number, division]
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