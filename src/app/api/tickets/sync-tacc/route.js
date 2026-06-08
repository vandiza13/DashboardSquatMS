import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || !['SuperAdmin', 'Admin', 'User'].includes(user.role)) {
            return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
        }

        const body = await request.json();
        const data = body.data || [];
        const category = body.category;

        if (!category) {
            return NextResponse.json({ error: 'Kategori sumber data tidak valid.' }, { status: 400 });
        }

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'Data Excel kosong atau format tidak sesuai.' }, { status: 400 });
        }

        // [FIX ERROR] Menggunakan perintah SQL murni untuk transaksi
        // Jauh lebih aman untuk TiDB Serverless dibandingkan getConnection()
        await db.query('START TRANSACTION');

        let updatedCount = 0;

        for (const row of data) {
            if (!row.tacc_id || row.ttr === undefined) continue;
            
            const tiketIdFallback = row.tiket_id ? row.tiket_id.toString() : 'INVALID_FALLBACK';

            let updateQuery = `UPDATE tickets SET ttr_tacc = ?, id_tiket_tacc = ?`;
            let updateParams = [row.ttr.toString(), row.tacc_id.toString()];

            // Jika ada nilai req_close yang valid (bukan null/kosong)
            if (row.req_close && row.req_close.trim() !== '') {
                // Validasi apakah ini format tanggal yang dikenali
                const dateParsed = new Date(row.req_close);
                if (!isNaN(dateParsed.getTime())) {
                    const isYMD = /^\d{4}-\d{2}-\d{2}/.test(row.req_close);
                    let finalDateStr = row.req_close;
                    
                    if (!isYMD) {
                        // Ambil waktu lokal tanpa terpengaruh pergeseran UTC
                        const y = dateParsed.getFullYear();
                        const m = String(dateParsed.getMonth() + 1).padStart(2, '0');
                        const d = String(dateParsed.getDate()).padStart(2, '0');
                        const h = String(dateParsed.getHours()).padStart(2, '0');
                        const min = String(dateParsed.getMinutes()).padStart(2, '0');
                        const s = String(dateParsed.getSeconds()).padStart(2, '0');
                        finalDateStr = `${y}-${m}-${d} ${h}:${min}:${s}`;
                    }

                    updateQuery += `, last_update_time = IF(status = 'CLOSED', ?, last_update_time)`;
                    updateParams.push(finalDateStr);
                }
            }

            updateQuery += ` WHERE (id_tiket_tacc = ? OR id_tiket = ?) AND category = ?`;
            updateParams.push(row.tacc_id.toString(), tiketIdFallback, category);

            const [result] = await db.query(updateQuery, updateParams);

            // Cek apakah ada baris yang berhasil diupdate
            if (result && result.affectedRows > 0) {
                updatedCount++;
            }
        }

        // Jika semua loop sukses, simpan permanen ke database
        await db.query('COMMIT');

        return NextResponse.json({ 
            message: `Retro-Sync berhasil! ${updatedCount} tiket ${category} telah disinkronisasi (ID TACC & TTR-nya).`, 
            updated: updatedCount 
        });

    } catch (error) {
        // [FIX ERROR] Batalkan update menggunakan SQL murni jika terjadi masalah
        try {
            await db.query('ROLLBACK');
        } catch (rollbackError) {
            console.error("Gagal melakukan rollback:", rollbackError);
        }
        
        console.error("Sync TACC Error:", error);
        return NextResponse.json({ error: 'Gagal sinkronisasi: ' + error.message }, { status: 500 });
    }
}