import { NextResponse } from 'next/server';
import { pgPool } from '@/lib/pgDb';
import { verifyJWT } from '@/lib/auth';
import { appendSiteToSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

const toNullIfEmpty = (val) => {
    if (val === undefined || val === null) return null;
    const str = String(val).trim();
    return str === '' ? null : str;
};

const toNumberOrNull = (val) => {
    if (val === undefined || val === null || String(val).trim() === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
};

// GET: Ambil daftar Site UMT
export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || !['Admin', 'User', 'View'].includes(user.role)) {
            return NextResponse.json({ error: 'Akses ditolak. Tidak memiliki izin yang cukup.' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';

        const offset = (page - 1) * limit;

        let queryConditions = [];
        let params = [];

        if (search) {
            params.push(`%${search}%`);
            queryConditions.push(`(site_id ILIKE $${params.length} OR site_name ILIKE $${params.length} OR sto ILIKE $${params.length} OR ring ILIKE $${params.length})`);
        }

        let whereClause = queryConditions.length > 0 ? ' WHERE ' + queryConditions.join(' AND ') : '';

        const dataQuery = `SELECT * FROM public.umt_sites${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const countQuery = `SELECT COUNT(*) as total FROM public.umt_sites${whereClause}`;

        const dataParams = [...params, limit, offset];
        const countParams = [...params];

        const [dataResult, countResult] = await Promise.all([
            pgPool.query(dataQuery, dataParams),
            pgPool.query(countQuery, countParams)
        ]);

        const totalItems = parseInt(countResult.rows[0]?.total || '0');

        return NextResponse.json({
            data: dataResult.rows,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalItems / limit),
                totalItems,
                itemsPerPage: limit
            }
        });

    } catch (error) {
        console.error("GET UMT Sites Error:", error);
        return NextResponse.json({ error: 'Gagal mengambil data: ' + error.message }, { status: 500 });
    }
}

// POST: Buat Site UMT Baru
export async function POST(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        const hasAccess = user.role === 'SuperAdmin' || (user.role === 'Admin' && ['ALL', 'MS'].includes(user.division));
        if (!hasAccess) {
            return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki wewenang untuk menambah atau mengedit master site divisi MS.' }, { status: 403 });
        }

        const body = await request.json();

        const site_id = toNullIfEmpty(body.site_id);
        const site_name = toNullIfEmpty(body.site_name);

        if (!site_id) {
            return NextResponse.json({ error: 'Site ID wajib diisi.' }, { status: 400 });
        }

        const columns = ['site_id', 'site_name', 'latitude', 'longitude', 'sto', 'ring', 'keterangan'];
        const values = [
            site_id,
            site_name,
            toNumberOrNull(body.latitude),
            toNumberOrNull(body.longitude),
            toNullIfEmpty(body.sto),
            toNullIfEmpty(body.ring),
            toNullIfEmpty(body.keterangan)
        ];

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        const insertQuery = `
            INSERT INTO public.umt_sites (${columns.join(', ')}) 
            VALUES (${placeholders})
            RETURNING *
        `;

        const result = await pgPool.query(insertQuery, values);
        const createdSite = result.rows[0];

        // Sync ke Google Sheets (Provider: UMT)
        try {
            await appendSiteToSheet(createdSite, 'UMT');
        } catch (sheetError) {
            console.error("❌ Exception Google Sheet Sync UMT:", sheetError);
        }

        return NextResponse.json({ message: 'Site UMT berhasil ditambahkan', data: createdSite }, { status: 201 });

    } catch (error) {
        console.error("Create UMT Site Error:", error);
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Site ID sudah terdaftar.' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Gagal menambahkan data site: ' + error.message }, { status: 500 });
    }
}
