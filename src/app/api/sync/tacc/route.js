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
            // KASUS 1: TIKET SUDAH ADA DI DATABASE
            // ==============================================================
            if (existing) {
                // Keamanan Data & RCA: Status di dashboard TIDAK diubah ke CLOSED sepihak
                // agar kolom RCA, material, dan investigasi teknisi tidak kosong.
                // Sistem HANYA menyinkronkan nilai TTR (ttr_tacc) & ID TACC jika ada data baru.
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
            // ==============================================================
            // KASUS 2: TIKET BELUM ADA DI DATABASE -> AUTO-INSERT JIKA MASIH AKTIF
            // ==============================================================
            else {
                // Hanya insert tiket yang berstatus aktif (Open, Pending, In Progress, Delivered)
                const isActiveStatus = ['OPEN', 'PENDING', 'IN PROGRESS', 'DELIVERED'].includes(rawStatus);

                if (isActiveStatus) {
                    const finalIdTiket = String(rawTiketId || `TR-${rawNomorTT}`).trim();
                    const finalNomorTT = String(rawNomorTT || '').trim() || null;
                    const finalOpenTime = parseDateTimeToMySQL(row.start_time || row['Start TT Open Time'] || new Date()) || new Date();
                    
                    // Smart Description Builder (Route Case / Pair Site Down <> Site Detector)
                    const cleanStr = (val) => {
                        if (!val) return '';
                        const s = String(val).trim();
                        return (s.toLowerCase() === 'nan' || s.toLowerCase() === 'null') ? '' : s;
                    };

                    const routeCase = cleanStr(row['Route Case'] || row['route_case'] || row['RouteCase']);
                    const siteDown = cleanStr(row['Site Down Name'] || row['Site Down ID'] || row['Site Down'] || row.site_name);
                    const siteDetector = cleanStr(row['Site Detector Name'] || row['Site Detector ID'] || row['Site Detector']);

                    let finalDeskripsi = '';
                    if (routeCase) {
                        finalDeskripsi = routeCase;
                    } else if (siteDown && siteDetector && siteDown !== siteDetector) {
                        finalDeskripsi = `${siteDown} <> ${siteDetector}`;
                    } else if (siteDown) {
                        finalDeskripsi = siteDown;
                    } else if (siteDetector) {
                        finalDeskripsi = siteDetector;
                    } else {
                        const spanOrRing = cleanStr(row['Span ID FSI'] || row['Spand ID'] || row['Ring ID']);
                        const descInfo = cleanStr(row.keterangan || row['Keterangan'] || row.deskripsi || row['Ticket Info'] || row['Tiket Info']);
                        finalDeskripsi = spanOrRing || descInfo || `Tiket ${finalIdTiket}`;
                    }

                    // Priority
                    const finalPriority = row.priority || row['Priority'] || null;
                    const finalBranch = row.branch || row['Branch'] || row['BRANCH'] || 'BEKASI';

                    // Status awal di dashboard: jika di TACC 'PENDING' maka 'SC' (Stop Clock), selain itu 'OPEN'
                    const dbStatus = (rawStatus === 'PENDING') ? 'SC' : 'OPEN';

                    const [insertRes] = await connection.query(
                        `INSERT INTO tickets (
                            category, subcategory, priority, id_tiket, id_tiket_tacc,
                            tiket_time, deskripsi, status, branch, created_by_user_id,
                            updated_by_user_id, last_update_time
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW())`,
                        [
                            targetCategory,
                            targetSubcategory,
                            finalPriority,
                            finalIdTiket,
                            finalNomorTT,
                            finalOpenTime,
                            finalDeskripsi,
                            dbStatus,
                            finalBranch
                        ]
                    );

                    const newTicketId = insertRes.insertId;

                    await connection.query(
                        `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) 
                         VALUES (?, ?, 'Auto-Sync TACC Scraper', NOW())`,
                        [newTicketId, `Tiket baru dibuat otomatis dari TACC Scraper (Status: ${dbStatus})`]
                    );

                    // Tambahkan ke map agar tidak terduplikasi
                    const newEntry = { id: newTicketId, id_tiket: finalIdTiket, id_tiket_tacc: finalNomorTT, status: dbStatus };
                    for (const k of candidateKeys) {
                        ticketMap.set(k, newEntry);
                    }

                    insertedCount++;
                } else {
                    // Tiket belum ada tapi di TACC sudah CLOSED/CANCELLED lama, abaikan
                    skippedCount++;
                }
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
