import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || (user.role !== 'Admin' && user.role !== 'User')) {
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

            // [SOLUSI PERMANEN TANGGAL] last_update_time = last_update_time
            const [result] = await db.query(
                `UPDATE tickets 
                 SET ttr_tacc = ?, 
                     id_tiket_tacc = ?,
                     last_update_time = last_update_time 
                 WHERE (id_tiket_tacc = ? OR id_tiket = ?) 
                   AND category = ?`,
                [
                    row.ttr.toString(),        
                    row.tacc_id.toString(),    
                    row.tacc_id.toString(),    
                    tiketIdFallback,           
                    category                   
                ]
            );

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