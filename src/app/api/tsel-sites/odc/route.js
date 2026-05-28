import { NextResponse } from 'next/server';
import { pgPool } from '@/lib/pgDb';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Data agregat ODC (daftar unik ODC, kapasitas, dan jumlah site yang terhubung)
export async function GET(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user) {
            return NextResponse.json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        let params = [];
        let whereClause = 'WHERE site_name_odc IS NOT NULL AND site_name_odc != \'\'';

        if (search) {
            params.push(`%${search}%`);
            whereClause += ` AND site_name_odc ILIKE $${params.length}`;
        }

        const query = `
            SELECT 
                site_name_odc,
                MAX(latitude_odc) as latitude_odc,
                MAX(longitude_odc) as longitude_odc,
                MAX(capacity_odc) as capacity_odc,
                MAX(core_feeder_odc) as core_feeder_odc,
                COUNT(*) as total_connected_sites,
                json_agg(
                    json_build_object(
                        'site_id', site_id,
                        'site_name', site_name,
                        'site_class', site_class,
                        'branch', branch
                    )
                ) as connected_sites
            FROM public.tsel_sites
            ${whereClause}
            GROUP BY site_name_odc
            ORDER BY site_name_odc ASC
        `;

        const result = await pgPool.query(query, params);

        return NextResponse.json({
            data: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error("GET ODC Data Error:", error);
        return NextResponse.json({ error: 'Gagal mengambil data ODC: ' + error.message }, { status: 500 });
    }
}
