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

// GET: Ambil detail 1 Site MTEL
export async function GET(request, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || !['SuperAdmin', 'Admin', 'User', 'View'].includes(user.role)) {
            return NextResponse.json({ error: 'Akses ditolak. Tidak memiliki izin yang cukup.' }, { status: 403 });
        }

        const result = await pgPool.query('SELECT * FROM public.mtel_sites WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Data site tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);

    } catch (error) {
        console.error("GET MTEL Site Detail Error:", error);
        return NextResponse.json({ error: 'Database Error' }, { status: 500 });
    }
}

// PUT: Perbarui data Site MTEL
export async function PUT(request, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        const hasAccess = user.role === 'SuperAdmin' || (user.role === 'Admin' && ['ALL', 'MS'].includes(user.division));
        if (!hasAccess) {
            return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengedit master site divisi MS.' }, { status: 403 });
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
            toNullIfEmpty(body.sto),
            toNullIfEmpty(body.keterangan),
            id // $7
        ];

        const updateQuery = `
            UPDATE public.mtel_sites SET 
                site_id = $1, site_name = $2, latitude = $3, longitude = $4, 
                sto = $5, keterangan = $6
            WHERE id = $7
            RETURNING *
        `;

        const result = await pgPool.query(updateQuery, values);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Data site tidak ditemukan' }, { status: 404 });
        }

        const updatedSite = result.rows[0];

        // Sync ke Google Sheets (Provider: MTEL)
        try {
            await appendSiteToSheet(updatedSite, 'MTEL');
        } catch (sheetError) {
            console.error("❌ Exception Google Sheet Sync MTEL:", sheetError);
        }

        return NextResponse.json({ message: 'Data site berhasil diperbarui', data: updatedSite });

    } catch (error) {
        console.error("Update MTEL Site Error:", error);
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Site ID sudah terdaftar.' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Gagal memperbarui data: ' + error.message }, { status: 500 });
    }
}

// DELETE: Hapus data Site MTEL secara permanen
export async function DELETE(request, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || user.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Akses ditolak. Hanya Super Admin yang bisa menghapus master site.' }, { status: 403 });
        }

        const result = await pgPool.query('DELETE FROM public.mtel_sites WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Data site tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Site berhasil dihapus permanen' });

    } catch (error) {
        console.error("DELETE MTEL Site Error:", error);
        return NextResponse.json({ error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
    }
}
