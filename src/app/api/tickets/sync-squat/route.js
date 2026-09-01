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

        // 1. Ambil seluruh tiket SQUAT CLOSED dari database dalam 1 query cepat
        const [dbTickets] = await db.query(
            `SELECT id, id_tiket, id_tiket_tacc FROM tickets WHERE category = 'SQUAT' AND status = 'CLOSED'`
        );

        if (!dbTickets || dbTickets.length === 0) {
            return NextResponse.json({
                message: `Sync SQUAT (${category}) selesai. Tidak ada tiket SQUAT CLOSED di database saat ini.`,
                updated: 0
            });
        }

        // 2. Buat Lookup Map di Memory (O(1) lookup)
        const ticketMap = new Map();
        for (const t of dbTickets) {
            if (t.id_tiket) {
                ticketMap.set(String(t.id_tiket).trim().toUpperCase(), t.id);
            }
            if (t.id_tiket_tacc) {
                ticketMap.set(String(t.id_tiket_tacc).trim().toUpperCase(), t.id);
            }
        }

        // 3. Cocokkan data Excel dengan tiket yang benar-benar ada di DB
        const toUpdate = [];
        const seenDbIds = new Set();

        for (const row of data) {
            if (!row.id_tiket || row.ttr === undefined) continue;

            const key = String(row.id_tiket).trim().toUpperCase();
            const matchedDbId = ticketMap.get(key);

            if (matchedDbId && !seenDbIds.has(matchedDbId)) {
                seenDbIds.add(matchedDbId);
                toUpdate.push({
                    id: matchedDbId,
                    ttr: String(row.ttr),
                    close_time: row.close_time
                });
            }
        }

        if (toUpdate.length === 0) {
            return NextResponse.json({
                message: `Sync SQUAT (${category}) selesai. Dari ${data.length} baris Excel, tidak ada tiket yang cocok dengan database.`,
                updated: 0
            });
        }

        // 4. Mulai Transaksi untuk memperbarui HANYA tiket yang cocok secara cepat
        await db.query('START TRANSACTION');

        let updatedCount = 0;
        const chunkSize = 30; // 30 concurrent updates per batch

        for (let i = 0; i < toUpdate.length; i += chunkSize) {
            const chunk = toUpdate.slice(i, i + chunkSize);

            await Promise.all(chunk.map(async (item) => {
                let updateQuery = `UPDATE tickets SET ttr_tacc = ?`;
                let updateParams = [item.ttr];

                if (item.close_time && String(item.close_time).trim() !== '') {
                    const dateParsed = new Date(item.close_time);
                    if (!isNaN(dateParsed.getTime())) {
                        const isYMD = /^\d{4}-\d{2}-\d{2}/.test(String(item.close_time));
                        let finalDateStr = String(item.close_time);

                        if (!isYMD) {
                            const y = dateParsed.getFullYear();
                            const m = String(dateParsed.getMonth() + 1).padStart(2, '0');
                            const d = String(dateParsed.getDate()).padStart(2, '0');
                            const h = String(dateParsed.getHours()).padStart(2, '0');
                            const min = String(dateParsed.getMinutes()).padStart(2, '0');
                            const s = String(dateParsed.getSeconds()).padStart(2, '0');
                            finalDateStr = `${y}-${m}-${d} ${h}:${min}:${s}`;
                        }

                        updateQuery += `, last_update_time = ?, closed_at = ?`;
                        updateParams.push(finalDateStr, finalDateStr);
                    }
                }

                updateQuery += ` WHERE id = ?`;
                updateParams.push(item.id);

                const [result] = await db.query(updateQuery, updateParams);
                if (result && result.affectedRows > 0) {
                    updatedCount += result.affectedRows;
                }
            }));
        }

        // Commit transaksi
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
