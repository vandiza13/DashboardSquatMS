import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pusherServer } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

// Helper normalisasi key ID tiket agar pencocokan 100% presisi
function getNormalizedKeys(rawId) {
    if (!rawId) return [];
    const str = String(rawId).trim().replace(/[\r\n\t]/g, '');
    const keys = new Set();

    const cleanUpper = str.toUpperCase();
    keys.add(cleanUpper);

    const alphanumeric = cleanUpper.replace(/[^A-Z0-9]/g, '');
    if (alphanumeric) keys.add(alphanumeric);

    const digits = cleanUpper.replace(/\D/g, '');
    if (digits.length >= 5) {
        keys.add(digits);
        keys.add(`INC${digits}`);
        keys.add(`IN${digits}`);
    }

    return Array.from(keys);
}

// Helper parsing tanggal ke format MySQL (YYYY-MM-DD HH:mm:ss)
function parseDateTimeToMySQL(val) {
    if (!val) return null;
    const str = String(val).trim();
    if (!str || str === '0000-00-00' || str === '0000-00-00 00:00:00' || str === '?' || str === 'None' || str === 'null') return null;

    let d = null;
    const num = Number(str);
    if (!isNaN(num) && num > 40000 && num < 60000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        d = new Date(excelEpoch.getTime() + num * 86400 * 1000);
    } else {
        // Coba pola YYYY-MM-DD HH:mm:ss
        const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (ymdMatch) {
            const [, y, m, day, hh = '00', mm = '00', ss = '00'] = ymdMatch;
            d = new Date(`${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`);
        } else {
            // Coba pola DD-MM-YYYY HH:mm:ss
            const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
            if (dmyMatch) {
                const [, day, m, y, hh = '00', mm = '00', ss = '00'] = dmyMatch;
                d = new Date(`${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`);
            } else {
                d = new Date(str);
            }
        }
    }

    if (d && !isNaN(d.getTime())) {
        const y = d.getFullYear();
        if (y >= 1000 && y <= 9999) {
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            const s = String(d.getSeconds()).padStart(2, '0');
            return `${y}-${m}-${day} ${h}:${min}:${s}`;
        }
    }

    return null;
}

export async function POST(request) {
    // 1. Verifikasi Keamanan (Secret Key)
    const authHeader = request.headers.get('authorization') || '';
    const secretHeader = request.headers.get('x-scraper-secret') || '';
    const providedSecret = secretHeader || authHeader.replace(/^Bearer\s+/i, '');

    const validSecret = process.env.SCRAPER_SECRET_KEY || 'rahasia-scraper-tacc-2026';
    if (!providedSecret || providedSecret !== validSecret) {
        return NextResponse.json({ error: 'Unauthorized: Kunci rahasia scraper tidak valid' }, { status: 401 });
    }

    // 2. Baca Payload
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { category, subcategory, tickets } = body;

    if (!category || !Array.isArray(tickets)) {
        return NextResponse.json({ error: 'Payload wajib memuat category dan array tickets' }, { status: 400 });
    }

    const targetCategory = String(category).trim().toUpperCase();
    const targetSubcategory = subcategory ? String(subcategory).trim().toUpperCase() : targetCategory;

    console.log(`📡 [Sync-TACC] Menerima ${tickets.length} baris tiket untuk ${targetCategory} / ${targetSubcategory}`);

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 3. Ambil data tiket yang sudah ada di database untuk kategori ini
        const [existingTickets] = await connection.query(
            `SELECT id, id_tiket, id_tiket_tacc, status, ttr_tacc, closed_at FROM tickets WHERE category = ?`,
            [targetCategory]
        );

        // Buat Multi-Key Lookup Map di Memory (O(1))
        const ticketMap = new Map();
        for (const t of existingTickets) {
            const keys = [
                ...getNormalizedKeys(t.id_tiket),
                ...getNormalizedKeys(t.id_tiket_tacc)
            ];
            for (const k of keys) {
                if (!ticketMap.has(k)) {
                    ticketMap.set(k, t);
                }
            }
        }

        let insertedCount = 0;
        let updatedClosedCount = 0;
        let updatedStatusCount = 0;
        let skippedCount = 0;

        const seenProcessedKeys = new Set();

        for (const row of tickets) {
            const rawNomorTT = row.nomor_tt || row['Nomor TT'] || row.id_tiket_tacc || '';
            const rawTiketId = row.tiket || row['Tiket'] || row.id_tiket || '';
            const rawStatus = String(row.status || row['Status'] || '').trim().toUpperCase();
            const rawCondition = String(row.condition || row['Condition'] || '').trim().toUpperCase();

            // Abaikan tiket jika kondisinya Degraded
            if (rawCondition.includes('DEGRADED')) {
                skippedCount++;
                continue;
            }

            // Normalisasi kandidat key
            const candidateKeys = [
                ...getNormalizedKeys(rawNomorTT),
                ...getNormalizedKeys(rawTiketId)
            ];

            if (candidateKeys.length === 0) {
                skippedCount++;
                continue;
            }

            // Hindari duplikasi dalam batch yang sama
            const primaryKey = candidateKeys[0];
            if (seenProcessedKeys.has(primaryKey)) {
                skippedCount++;
                continue;
            }
            seenProcessedKeys.add(primaryKey);

            // Cek apakah tiket sudah ada di database
            let existing = null;
            for (const k of candidateKeys) {
                if (ticketMap.has(k)) {
                    existing = ticketMap.get(k);
                    break;
                }
            }

            // TTR parsing
            const rawTtr = row.ttr_net || row['TTR NET (Jam)'] || row.ttr || '';
            let cleanTtr = String(rawTtr).trim().replace(',', '.');
            const ttrMatch = cleanTtr.match(/^-?\d+(?:\.\d+)?/);
            const finalTtr = ttrMatch ? ttrMatch[0] : null;

            // Waktu close parsing
            const rawClose = row.req_close || row['Req Close Time'] || row['Req Close'] || row['Closed Time'] || row.closed_time || '';
            const parsedClose = parseDateTimeToMySQL(rawClose);

            // ==============================================================
            // KASUS 1: TIKET SUDAH ADA DI DATABASE -> SINKRONISASI TTR & STATUS CLOSED
            // ==============================================================
            if (existing) {
                const currentStatus = String(existing.status).toUpperCase();
                const isClosedInTacc = (rawStatus === 'CLOSED' || rawStatus === 'TECH CLOSE' || !!parsedClose);

                // Jika di TACC sudah CLOSED / TECH CLOSE dan di DB masih OPEN atau SC (atau butuh update data closed)
                if (isClosedInTacc && (currentStatus === 'OPEN' || currentStatus === 'SC')) {
                    await connection.query(
                        `UPDATE tickets 
                         SET status = 'CLOSED', 
                             ttr_tacc = COALESCE(?, ttr_tacc),
                             id_tiket_tacc = COALESCE(id_tiket_tacc, ?),
                             closed_at = COALESCE(?, closed_at, NOW()),
                             last_update_time = NOW()
                         WHERE id = ?`,
                        [finalTtr, rawNomorTT || null, parsedClose, existing.id]
                    );

                    await connection.query(
                        `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) 
                         VALUES (?, ?, 'Auto-Sync TACC Scraper', NOW())`,
                        [existing.id, `Status disinkronkan ke CLOSED dari TACC (TTR: ${finalTtr || '-'} Jam, Closed: ${parsedClose || 'Now'})`]
                    );

                    existing.status = 'CLOSED';
                    existing.ttr_tacc = finalTtr || existing.ttr_tacc;
                    updatedClosedCount++;
                } else {
                    // Update ttr_tacc atau id_tiket_tacc jika ada data TTR baru
                    let needUpdate = false;
                    const updates = [];
                    const updateParams = [];

                    if (finalTtr && existing.ttr_tacc !== finalTtr) {
                        updates.push("ttr_tacc = ?");
                        updateParams.push(finalTtr);
                        existing.ttr_tacc = finalTtr;
                        needUpdate = true;
                    }

                    if (rawNomorTT && !existing.id_tiket_tacc) {
                        updates.push("id_tiket_tacc = ?");
                        updateParams.push(rawNomorTT);
                        existing.id_tiket_tacc = rawNomorTT;
                        needUpdate = true;
                    }

                    if (needUpdate) {
                        updates.push("last_update_time = NOW()");
                        updateParams.push(existing.id);
                        await connection.query(
                            `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`,
                            updateParams
                        );

                        await connection.query(
                            `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) 
                             VALUES (?, ?, 'Auto-Sync TACC Scraper', NOW())`,
                            [existing.id, `TTR TACC disinkronkan otomatis: ${finalTtr || '-'} Jam (Status TACC: ${rawStatus})`]
                        );

                        updatedStatusCount++;
                    } else {
                        skippedCount++;
                    }
                }
            }
            // ==============================================================
            // KASUS 2: TIKET BELUM ADA DI DATABASE -> DITUNDA / DILEWATI
            // ==============================================================
            else {
                // Sesuai keputusan: tiket running baru ditunda dulu, fokus sync MTTR/SLA tiket closed yang sudah ada
                skippedCount++;
            }
        }

        await connection.commit();

        console.log(`✅ [Sync-TACC] Selesai: ${insertedCount} inserted, ${updatedClosedCount} closed, ${updatedStatusCount} updated, ${skippedCount} skipped`);

        // 4. Trigger Realtime Pusher jika ada perubahan
        if (insertedCount > 0 || updatedClosedCount > 0 || updatedStatusCount > 0) {
            try {
                await pusherServer.trigger('dashboard-channel', 'ticket-update', {
                    message: `Auto-Sync TACC: ${insertedCount} tiket baru, ${updatedStatusCount} TTR diperbarui`,
                    type: 'TACC_SYNC',
                    category: targetCategory,
                    inserted: insertedCount,
                    updated_ttr: updatedStatusCount,
                    timestamp: new Date().toISOString()
                });
                console.log("📡 [Sync-TACC] Pusher trigger terkirim!");
            } catch (pusherErr) {
                console.error("⚠️ [Sync-TACC] Gagal kirim Pusher:", pusherErr.message);
            }
        }

        return NextResponse.json({
            success: true,
            category: targetCategory,
            subcategory: targetSubcategory,
            summary: {
                total_received: tickets.length,
                inserted_new: insertedCount,
                updated_to_closed: updatedClosedCount,
                updated_status: updatedStatusCount,
                skipped: skippedCount
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error("❌ [Sync-TACC] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        connection.release();
    }
}
