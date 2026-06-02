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

// GET: Ambil detail 1 Site TSEL
export async function GET(request, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || !['Admin', 'User', 'View'].includes(user.role)) {
            return NextResponse.json({ error: 'Akses ditolak. Tidak memiliki izin yang cukup.' }, { status: 403 });
        }

        const result = await pgPool.query('SELECT * FROM public.tsel_sites WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Data site tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);

    } catch (error) {
        console.error("GET Site Detail Error:", error);
        return NextResponse.json({ error: 'Database Error' }, { status: 500 });
    }
}

// PUT: Perbarui data Site TSEL
export async function PUT(request, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        const hasAccess = user.role === 'SuperAdmin' || (user.role === 'Admin' && ['ALL', 'SQUAT'].includes(user.division));
        if (!hasAccess) {
            return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengedit master site TSEL.' }, { status: 403 });
        }

        const body = await request.json();

        const site_id = toNullIfEmpty(body.site_id);
        const site_name = toNullIfEmpty(body.site_name);

        if (!site_id) {
            return NextResponse.json({ error: 'Site ID wajib diisi.' }, { status: 400 });
        }

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
            toNullIfEmpty(body.keterangan),
            id // $31
        ];

        const updateQuery = `
            UPDATE public.tsel_sites SET 
                site_id = $1, site_name = $2, latitude = $3, longitude = $4, site_class = $5, 
                branch = $6, sto = $7, metro = $8, port_metro = $9, akses = $10, 
                port_connection = $11, ip_olt = $12, gpon = $13, port_gpon = $14, ip_ont = $15, 
                sn_ont = $16, ea_subrack_core = $17, oa_subrack_core = $18, site_name_odc = $19, 
                capacity_odc = $20, bastray_feeder_odc = $21, core_feeder_odc = $22, 
                bastray_distribusi = $23, distribusi_core = $24, latitude_odc = $25, 
                longitude_odc = $26, site_name_odp = $27, latitude_odp = $28, longitude_odp = $29, 
                keterangan = $30
            WHERE id = $31
            RETURNING *
        `;

        const result = await pgPool.query(updateQuery, values);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Data site tidak ditemukan' }, { status: 404 });
        }

        const updatedSite = result.rows[0];

        // Sync ke Google Sheets secara asinkron (tidak memblokir respon client)
        try {
            await appendSiteToSheet(updatedSite);
        } catch (sheetError) {
            console.error("❌ Exception Google Sheet Sync:", sheetError);
        }

        return NextResponse.json({ message: 'Data site berhasil diperbarui', data: updatedSite });

    } catch (error) {
        console.error("Update Site Error:", error);
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Site ID sudah terdaftar.' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Gagal memperbarui data: ' + error.message }, { status: 500 });
    }
}

// DELETE: Hapus data Site TSEL secara permanen
export async function DELETE(request, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || user.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Akses ditolak. Hanya Super Admin yang bisa menghapus master site.' }, { status: 403 });
        }

        const result = await pgPool.query('DELETE FROM public.tsel_sites WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Data site tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Site berhasil dihapus permanen' });

    } catch (error) {
        console.error("DELETE Site Error:", error);
        return NextResponse.json({ error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
    }
}
