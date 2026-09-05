import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

// Helper normalisasi ID tiket agar pencocokan 100% presisi
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

// Helper parsing tanggal penutupan (mendukung berbagai format Insera & Excel)
function parseCloseTime(val) {
    if (!val) return null;
    const str = String(val).trim();
    if (!str) return null;

    // Format serial angka Excel (misal 45538.6139)
    const num = Number(str);
    if (!isNaN(num) && num > 40000 && num < 60000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const ms = excelEpoch.getTime() + num * 86400 * 1000;
        const d = new Date(ms);
        return formatMySQLDate(d);
    }

    // Format YYYY-MM-DD HH:mm:ss
    const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ymdMatch) {
        const [, y, m, d, hh = '00', mm = '00', ss = '00'] = ymdMatch;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
    }

    // Format DD/MM/YYYY atau DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
        const [, d, m, y, hh = '00', mm = '00', ss = '00'] = dmyMatch;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return formatMySQLDate(parsed);
    }

    return null;
}

function formatMySQLDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

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

        // 1. Ambil seluruh tiket SQUAT dari database
        // Catatan: Tidak membatasi status = 'CLOSED' agar tiket yang masih OPEN/SC di sistem
        // namun sudah CLOSED di Insera otomatis tersinkron & ditutup rapi.
        const [dbTickets] = await db.query(
            `SELECT id, id_tiket, id_tiket_tacc, status FROM tickets WHERE category = 'SQUAT'`
        );

        if (!dbTickets || dbTickets.length === 0) {
            return NextResponse.json({
                message: `Sync SQUAT (${category}) selesai. Tidak ada tiket SQUAT di database.`,
                updated: 0
            });
        }

        // 2. Buat Multi-Key Lookup Map di Memory
        const ticketMap = new Map();
        for (const t of dbTickets) {
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

        // 3. Cocokkan data Excel dengan tiket yang ada di DB
        const toUpdate = [];
        const seenDbIds = new Set();

        for (const row of data) {
            if (!row.id_tiket || row.ttr === undefined) continue;

            const rowKeys = getNormalizedKeys(row.id_tiket);
            let matchedTicket = null;

            for (const rk of rowKeys) {
                if (ticketMap.has(rk)) {
                    matchedTicket = ticketMap.get(rk);
                    break;
                }
            }

            if (matchedTicket && !seenDbIds.has(matchedTicket.id)) {
                seenDbIds.add(matchedTicket.id);

                // Bersihkan nilai TTR (misal "0.35 Jam" -> "0.35")
                let cleanTtr = String(row.ttr).trim().replace(',', '.');
                const ttrNumMatch = cleanTtr.match(/^-?\d+(?:\.\d+)?/);
                const finalTtr = ttrNumMatch ? ttrNumMatch[0] : '0';

                toUpdate.push({
                    id: matchedTicket.id,
                    ttr: finalTtr,
                    close_time_str: parseCloseTime(row.close_time)
                });
            }
        }

        if (toUpdate.length === 0) {
            return NextResponse.json({
                message: `Sync SQUAT (${category}) selesai. Dari ${data.length} baris Excel, tidak ada tiket yang cocok dengan database.`,
                updated: 0
            });
        }

        // 4. Eksekusi Update Menggunakan Query Batching CASE-WHEN
        // Bebas dari transaksi gantung & Lock wait timeout exceeded, serta 1000x lebih cepat!
        let updatedCount = 0;
        const BATCH_SIZE = 50;

        for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
            const batch = toUpdate.slice(i, i + BATCH_SIZE);
            const ids = batch.map(b => b.id);

            const ttrCases = [];
            const ttrParams = [];

            const closeTimeCases = [];
            const closeTimeParams = [];

            for (const item of batch) {
                ttrCases.push(`WHEN id = ? THEN ?`);
                ttrParams.push(item.id, item.ttr);

                if (item.close_time_str) {
                    closeTimeCases.push(`WHEN id = ? THEN ?`);
                    closeTimeParams.push(item.id, item.close_time_str);
                }
            }

            let sql = `UPDATE tickets SET ttr_tacc = CASE ${ttrCases.join(' ')} ELSE ttr_tacc END, status = 'CLOSED'`;
            let params = [...ttrParams];

            if (closeTimeCases.length > 0) {
                sql += `, closed_at = CASE ${closeTimeCases.join(' ')} ELSE closed_at END, last_update_time = CASE ${closeTimeCases.join(' ')} ELSE last_update_time END`;
                params.push(...closeTimeParams, ...closeTimeParams);
            }

            sql += ` WHERE id IN (${ids.map(() => '?').join(',')})`;
            params.push(...ids);

            const [result] = await db.query(sql, params);
            if (result && result.affectedRows > 0) {
                updatedCount += result.affectedRows;
            }
        }

        return NextResponse.json({
            message: `Sync SQUAT (${category}) sukses! ${updatedCount} tiket telah disinkronisasi (TTR & Waktu Close).`,
            updated: updatedCount
        });

    } catch (error) {
        console.error("Sync SQUAT Error:", error);
        return NextResponse.json({ error: 'Gagal sinkronisasi SQUAT: ' + error.message }, { status: 500 });
    }
}
