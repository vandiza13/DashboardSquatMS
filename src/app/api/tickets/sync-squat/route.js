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
        const category = body.category || 'SQUAT'; // TSEL / OLO

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'Data Excel kosong atau format tidak sesuai.' }, { status: 400 });
        }

        // Mulai transaksi database
        await db.query('START TRANSACTION');

        let updatedCount = 0;

        for (const row of data) {
            if (!row.id_tiket || row.ttr === undefined) continue;

            let updateQuery = `UPDATE tickets SET ttr_tacc = ?`;
            let updateParams = [row.ttr.toString()];

            // Update last_update_time jika ada nilai close_time yang valid
            if (row.close_time && String(row.close_time).trim() !== '') {
                const dateParsed = new Date(row.close_time);
                if (!isNaN(dateParsed.getTime())) {
                    const isYMD = /^\d{4}-\d{2}-\d{2}/.test(String(row.close_time));
                    let finalDateStr = String(row.close_time);

                    if (!isYMD) {
                        const y = dateParsed.getFullYear();
                        const m = String(dateParsed.getMonth() + 1).padStart(2, '0');
                        const d = String(dateParsed.getDate()).padStart(2, '0');
                        const h = String(dateParsed.getHours()).padStart(2, '0');
                        const min = String(dateParsed.getMinutes()).padStart(2, '0');
                        const s = String(dateParsed.getSeconds()).padStart(2, '0');
                        finalDateStr = `${y}-${m}-${d} ${h}:${min}:${s}`;
                    }

                    updateQuery += `, last_update_time = ?`;
                    updateParams.push(finalDateStr);
                }
            }

            // Syarat: Hanya mengupdate tiket SQUAT yang sudah berstatus CLOSED di database
            updateQuery += ` WHERE (id_tiket = ? OR id_tiket_tacc = ?) AND category = 'SQUAT' AND status = 'CLOSED'`;
            updateParams.push(row.id_tiket.toString(), row.id_tiket.toString());

            const [result] = await db.query(updateQuery, updateParams);

            if (result && result.affectedRows > 0) {
                updatedCount++;
            }
        }

        // Commit transaksi jika sukses
        await db.query('COMMIT');

        return NextResponse.json({
            message: `Sync SQUAT (${category}) berhasil! ${updatedCount} tiket CLOSED telah diperbarui (TTR & Close Time).`,
            updated: updatedCount
        });

    } catch (error) {
        try {
            await db.query('ROLLBACK');
        } catch (rollbackError) {
            console.error("Gagal melakukan rollback SQUAT:", rollbackError);
        }

        console.error("Sync SQUAT Error:", error);
        return NextResponse.json({ error: 'Gagal sinkronisasi SQUAT: ' + error.message }, { status: 500 });
    }
}
