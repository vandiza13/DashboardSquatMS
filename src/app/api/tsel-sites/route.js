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

// GET: Ambil daftar Site TSEL (Khusus Admin, User, View)
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
        const branchFilter = searchParams.get('branch') || '';
        const siteClassFilter = searchParams.get('siteClass') || '';
        const stoFilter = searchParams.get('sto') || '';

        const offset = (page - 1) * limit;

        let queryConditions = [];
        let params = [];

        if (search) {
            params.push(`%${search}%`);
            queryConditions.push(`(site_id ILIKE $${params.length} OR site_name ILIKE $${params.length} OR sto ILIKE $${params.length} OR branch ILIKE $${params.length} OR metro ILIKE $${params.length})`);
        }

        if (branchFilter) {
            params.push(branchFilter);
            queryConditions.push(`branch = $${params.length}`);
        }

        if (siteClassFilter) {
            params.push(siteClassFilter);
            queryConditions.push(`site_class = $${params.length}`);
        }

        if (stoFilter) {
            params.push(stoFilter);
            queryConditions.push(`sto = $${params.length}`);
        }

        let whereClause = queryConditions.length > 0 ? ' WHERE ' + queryConditions.join(' AND ') : '';

        const dataQuery = `SELECT * FROM public.tsel_sites${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const countQuery = `SELECT COUNT(*) as total FROM public.tsel_sites${whereClause}`;

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
        console.error("GET Sites Error:", error);
        return NextResponse.json({ error: 'Gagal mengambil data: ' + error.message }, { status: 500 });
    }
}

// POST: Buat Site TSEL Baru (Khusus Admin & Sync GSheet)
export async function POST(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || user.role !== 'Admin') {
            return NextResponse.json({ error: 'Akses ditolak. Menu ini khusus Admin.' }, { status: 403 });
        }

        const body = await request.json();

        const site_id = toNullIfEmpty(body.site_id);
        const site_name = toNullIfEmpty(body.site_name);

        if (!site_id) {
            return NextResponse.json({ error: 'Site ID wajib diisi.' }, { status: 400 });
        }

        const columns = [
            'site_id', 'site_name', 'latitude', 'longitude', 'site_class', 'branch', 'sto',
            'metro', 'port_metro', 'akses', 'port_connection', 'ip_olt', 'gpon', 'port_gpon',
            'ip_ont', 'sn_ont', 'ea_subrack_core', 'oa_subrack_core', 'site_name_odc',
            'capacity_odc', 'bastray_feeder_odc', 'core_feeder_odc', 'bastray_distribusi',
            'distribusi_core', 'latitude_odc', 'longitude_odc', 'site_name_odp',
            'latitude_odp', 'longitude_odp', 'keterangan'
        ];

        const values = [
            site_id,
            site_name,
            toNumberOrNull(body.latitude),
            toNumberOrNull(body.longitude),
            toNullIfEmpty(body.site_class),
            toNullIfEmpty(body.branch),
            toNullIfEmpty(body.sto),
            toNullIfEmpty(body.metro),
            toNullIfEmpty(body.port_metro),
            toNullIfEmpty(body.akses),
            toNullIfEmpty(body.port_connection),
            toNullIfEmpty(body.ip_olt),
            toNullIfEmpty(body.gpon),
            toNullIfEmpty(body.port_gpon),
            toNullIfEmpty(body.ip_ont),
            toNullIfEmpty(body.sn_ont),
            toNullIfEmpty(body.ea_subrack_core),
            toNullIfEmpty(body.oa_subrack_core),
            toNullIfEmpty(body.site_name_odc),
            toNumberOrNull(body.capacity_odc),
            toNullIfEmpty(body.bastray_feeder_odc),
            toNullIfEmpty(body.core_feeder_odc),
            toNullIfEmpty(body.bastray_distribusi),
            toNullIfEmpty(body.distribusi_core),
            toNumberOrNull(body.latitude_odc),
            toNumberOrNull(body.longitude_odc),
            toNullIfEmpty(body.site_name_odp),
            toNumberOrNull(body.latitude_odp),
            toNumberOrNull(body.longitude_odp),
            toNullIfEmpty(body.keterangan)
        ];

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        const insertQuery = `
            INSERT INTO public.tsel_sites (${columns.join(', ')}) 
            VALUES (${placeholders})
            RETURNING *
        `;

        const result = await pgPool.query(insertQuery, values);
        const createdSite = result.rows[0];

        // Sync ke Google Sheets secara asinkron (tidak memblokir respon client)
        try {
            await appendSiteToSheet(createdSite);
        } catch (sheetError) {
            console.error("❌ Exception Google Sheet Sync:", sheetError);
        }

        return NextResponse.json({ message: 'Site TSEL berhasil ditambahkan', data: createdSite }, { status: 201 });

    } catch (error) {
        console.error("Create Site Error:", error);
        if (error.code === '23505') { // Postgres duplicate key error code
            return NextResponse.json({ error: 'Site ID sudah terdaftar.' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Gagal menambahkan data site: ' + error.message }, { status: 500 });
    }
}
