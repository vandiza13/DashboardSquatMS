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

        let dbCategory = category;
        if (category.startsWith('MTEL_')) {
            dbCategory = 'MTEL';
        }

        // 1. Ambil seluruh tiket kategori terkait dari database dalam 1 query cepat
        const [dbTickets] = await db.query(
            `SELECT id, id_tiket, id_tiket_tacc, status FROM tickets WHERE category = ?`,
            [dbCategory]
        );

        if (!dbTickets || dbTickets.length === 0) {
            return NextResponse.json({
                message: `Retro-Sync selesai. Tidak ada tiket kategori ${dbCategory} di database.`,
                updated: 0
            });
        }

        // 2. Buat Lookup Map di Memory (O(1))
        const ticketMap = new Map();
        for (const t of dbTickets) {
            if (t.id_tiket) {
                ticketMap.set(String(t.id_tiket).trim().toUpperCase(), t);
            }
            if (t.id_tiket_tacc) {
                ticketMap.set(String(t.id_tiket_tacc).trim().toUpperCase(), t);
            }
        }

        // 3. Cocokkan data Excel dengan tiket yang benar-benar ada di DB
        const toUpdate = [];
        const seenDbIds = new Set();

        for (const row of data) {
            if (!row.tacc_id || row.ttr === undefined) continue;

            const taccKey = String(row.tacc_id).trim().toUpperCase();
            const tiketKey = row.tiket_id ? String(row.tiket_id).trim().toUpperCase() : null;

            const matchedTicket = ticketMap.get(taccKey) || (tiketKey ? ticketMap.get(tiketKey) : null);

            if (matchedTicket && !seenDbIds.has(matchedTicket.id)) {
                seenDbIds.add(matchedTicket.id);
                toUpdate.push({
                    id: matchedTicket.id,
                    status: matchedTicket.status,
                    tacc_id: String(row.tacc_id),
                    ttr: String(row.ttr),
                    req_close: row.req_close
                });
            }
        }

        if (toUpdate.length === 0) {
            return NextResponse.json({
                message: `Retro-Sync selesai. Dari ${data.length} baris Excel, tidak ada tiket yang cocok dengan database.`,
                updated: 0
            });
        }

        // 4. Mulai Transaksi Database
        await db.query('START TRANSACTION');

        let updatedCount = 0;
        const chunkSize = 30;

        for (let i = 0; i < toUpdate.length; i += chunkSize) {
            const chunk = toUpdate.slice(i, i + chunkSize);

            await Promise.all(chunk.map(async (item) => {
                let updateQuery = `UPDATE tickets SET ttr_tacc = ?, id_tiket_tacc = ?`;
                let updateParams = [item.ttr, item.tacc_id];

                if (item.req_close && String(item.req_close).trim() !== '') {
                    const dateParsed = new Date(item.req_close);
                    if (!isNaN(dateParsed.getTime())) {
                        const isYMD = /^\d{4}-\d{2}-\d{2}/.test(String(item.req_close));
                        let finalDateStr = String(item.req_close);

                        if (!isYMD) {
                            const y = dateParsed.getFullYear();
                            const m = String(dateParsed.getMonth() + 1).padStart(2, '0');
                            const d = String(dateParsed.getDate()).padStart(2, '0');
                            const h = String(dateParsed.getHours()).padStart(2, '0');
                            const min = String(dateParsed.getMinutes()).padStart(2, '0');
                            const s = String(dateParsed.getSeconds()).padStart(2, '0');
                            finalDateStr = `${y}-${m}-${d} ${h}:${min}:${s}`;
                        }

                        updateQuery += `, last_update_time = IF(status = 'CLOSED', ?, last_update_time), closed_at = IF(status = 'CLOSED', ?, closed_at)`;
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

        await db.query('COMMIT');

        return NextResponse.json({
            message: `Retro-Sync berhasil! ${updatedCount} tiket ${category} telah disinkronisasi (ID TACC & TTR-nya).`,
            updated: updatedCount
        });

    } catch (error) {
        try {
            await db.query('ROLLBACK');
        } catch (rollbackError) {
            console.error("Gagal melakukan rollback:", rollbackError);
        }

        console.error("Sync TACC Error:", error);
        return NextResponse.json({ error: 'Gagal sinkronisasi: ' + error.message }, { status: 500 });
    }
}