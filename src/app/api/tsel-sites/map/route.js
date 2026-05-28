import { NextResponse } from 'next/server';
import { pgPool } from '@/lib/pgDb';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Ambil SEMUA Site TSEL dengan koordinat untuk GIS Map (Semua User Login)
export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user) {
            return NextResponse.json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const branchFilter = searchParams.get('branch') || '';
        const siteClassFilter = searchParams.get('siteClass') || '';
        const search = searchParams.get('search') || '';

        let queryConditions = ['latitude IS NOT NULL', 'longitude IS NOT NULL'];
        let params = [];

        if (branchFilter) {
            params.push(branchFilter);
            queryConditions.push(`branch = $${params.length}`);
        }

        if (siteClassFilter) {
            params.push(siteClassFilter);
            queryConditions.push(`site_class = $${params.length}`);
        }

        if (search) {
            params.push(`%${search}%`);
            queryConditions.push(`(site_id ILIKE $${params.length} OR site_name ILIKE $${params.length} OR sto ILIKE $${params.length})`);
        }

        const whereClause = ' WHERE ' + queryConditions.join(' AND ');

        // Ambil field yang dibutuhkan untuk peta + popup detail + data ODC
        const query = `
            SELECT site_id, site_name, latitude, longitude, site_class, branch, sto, metro,
                   port_metro, gpon, port_gpon, akses,
                   site_name_odc, latitude_odc, longitude_odc, capacity_odc, core_feeder_odc
            FROM public.tsel_sites
            ${whereClause}
            ORDER BY site_id ASC
        `;

        const result = await pgPool.query(query, params);

        return NextResponse.json({
            data: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error("GET Map Sites Error:", error);
        return NextResponse.json({ error: 'Gagal mengambil data peta: ' + error.message }, { status: 500 });
    }
}
