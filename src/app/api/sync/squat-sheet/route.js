import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { getGoogleAuth } from '@/lib/googleSheets';
import { google } from 'googleapis';
import { pusherServer } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID_SQUAT_REPORT || '1ix3EEkDp6WGPB14WTsdkl-OI63XTLaT2JJC182sIpOM';
const SHEET_TAB_NAME = 'MASTER REPORT SD H-1';

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

// Helper parsing datetime ke format MySQL YYYY-MM-DD HH:mm:ss
function parseDateTimeToMySQL(val) {
    if (!val) return null;
    const str = String(val).trim();
    if (!str || str === '0000-00-00' || str === '0000-00-00 00:00:00' || str === '?' || str === 'None' || str === 'null') return null;

    // Excel serial number format (misal 45538.6139)
    const num = Number(str);
    if (!isNaN(num) && num > 40000 && num < 60000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const ms = excelEpoch.getTime() + num * 86400 * 1000;
        const d = new Date(ms);
        return formatMySQLDate(d);
    }

    // Pola YYYY-MM-DD HH:mm:ss
    const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ymdMatch) {
        const [, y, m, day, hh = '00', mm = '00', ss = '00'] = ymdMatch;
        return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')} ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
    }

    // Pola DD/MM/YYYY HH:mm:ss
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
        const [, day, m, y, hh = '00', mm = '00', ss = '00'] = dmyMatch;
        return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')} ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return formatMySQLDate(d);
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
        // 1. Verifikasi Keamanan (Session User ATAU Secret Key untuk Cron)
        const token = request.cookies.get('token')?.value;
        const user = token ? await verifyJWT(token) : null;

        const authHeader = request.headers.get('authorization') || '';
        const secretHeader = request.headers.get('x-scraper-secret') || '';
        const providedSecret = secretHeader || authHeader.replace(/^Bearer\s+/i, '');
        const validSecret = process.env.SCRAPER_SECRET_KEY || 'rahasia-scraper-tacc-2026';

        const isUserAuthorized = user && ['SuperAdmin', 'Admin', 'User'].includes(user.role);
        const isSecretAuthorized = providedSecret && providedSecret === validSecret;

        if (!isUserAuthorized && !isSecretAuthorized) {
            return NextResponse.json({ error: 'Akses ditolak: Tidak memiliki otorisasi' }, { status: 401 });
        }

        console.log("🔄 [Sync-SQUAT-GSheet] Memulai proses sinkronisasi dari Google Sheet...");

        // 2. Setup Google Sheets API
        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });

        // Ambil data dari Tab 'MASTER REPORT SD H-1'
        const resSheet = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${SHEET_TAB_NAME}'!A2:EZ`,
        });

        const allRows = resSheet.data.values || [];
        if (allRows.length < 2) {
            return NextResponse.json({ error: `Data di sheet '${SHEET_TAB_NAME}' kosong atau tidak ditemukan.` }, { status: 400 });
        }

        const headers = allRows[0] || [];
        const dataRows = allRows.slice(1);

        // 3. Deteksi Index Kolom secara Dinamis
        const findColIdx = (candidates) => {
            return headers.findIndex(h => {
                if (!h) return false;
                const lower = h.trim().toLowerCase();
                return candidates.some(c => lower === c.toLowerCase());
            });
        };

        const incidentColIdx = findColIdx(['Incident', 'Incident ID', 'Incident_ID', 'ID Tiket']);
        const ttrColIdx = findColIdx(['TTR_Finale', 'TTR Finale', 'TTR', 'TTR_Customer', 'TTR Customer']);
        const resolveDateColIdx = findColIdx(['c_resolve_date', 'Resolve Date', 'c_resolve_time', 'c_close_date']);
        const impactedColIdx = findColIdx(['total impacted site (manual)', 'total impacted site', 'impacted sites']);
        const outageColIdx = findColIdx(['total outage (manual)', 'total outage', 'outage hours']);

        if (incidentColIdx === -1 || ttrColIdx === -1) {
            return NextResponse.json({
                error: `Kolom wajib tidak ditemukan di Google Sheet: Incident (${incidentColIdx}), TTR_Finale (${ttrColIdx})`
            }, { status: 400 });
        }

        console.log(`📑 [Sync-SQUAT-GSheet] Kolom ditemukan: Incident (col ${incidentColIdx}), TTR (col ${ttrColIdx}), ResolveDate (col ${resolveDateColIdx}), Impacted Sites (col ${impactedColIdx}), Outage Hours (col ${outageColIdx})`);

        // 4. Ambil seluruh tiket SQUAT dari Database
        const [dbTickets] = await db.query(
            `SELECT id, id_tiket, id_tiket_tacc, status, ttr_tacc, closed_at, impacted_sites, outage_hours FROM tickets WHERE category = 'SQUAT'`
        );

        if (!dbTickets || dbTickets.length === 0) {
            return NextResponse.json({
                message: "Tidak ada tiket SQUAT di database untuk disinkronkan.",
                updated: 0
            });
        }

        // Buat Multi-Key Map di memory
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

        // 5. Bandingkan data Google Sheet dengan DB
        const toUpdate = [];
        const seenDbIds = new Set();

        for (const row of dataRows) {
            const rawIncident = row[incidentColIdx];
            if (!rawIncident) continue;

            const rowKeys = getNormalizedKeys(rawIncident);
            let matchedTicket = null;

            for (const rk of rowKeys) {
                if (ticketMap.has(rk)) {
                    matchedTicket = ticketMap.get(rk);
                    break;
                }
            }

            if (matchedTicket && !seenDbIds.has(matchedTicket.id)) {
                seenDbIds.add(matchedTicket.id);

                // Parsing nilai TTR (misal "2,79" -> "2.79")
                const rawTtr = row[ttrColIdx] !== undefined ? String(row[ttrColIdx]).trim() : '';
                let cleanTtr = rawTtr.replace(',', '.');
                const ttrNumMatch = cleanTtr.match(/^-?\d+(?:\.\d+)?/);
                const finalTtr = ttrNumMatch ? ttrNumMatch[0] : null;

                // Parsing waktu closed
                const rawClose = resolveDateColIdx !== -1 && row[resolveDateColIdx] ? row[resolveDateColIdx] : null;
                const parsedClose = parseDateTimeToMySQL(rawClose);

                // Parsing impacted_sites & outage_hours
                const rawImpacted = impactedColIdx !== -1 && row[impactedColIdx] !== undefined ? String(row[impactedColIdx]).trim() : '';
                const rawOutage = outageColIdx !== -1 && row[outageColIdx] !== undefined ? String(row[outageColIdx]).trim() : '';
                
                const finalImpacted = rawImpacted && !isNaN(parseInt(rawImpacted, 10)) ? parseInt(rawImpacted, 10) : null;
                let finalOutage = null;
                if (rawOutage) {
                    const cleanOutage = rawOutage.replace(',', '.');
                    const outageNumMatch = cleanOutage.match(/^-?\d+(?:\.\d+)?/);
                    if (outageNumMatch) finalOutage = parseFloat(outageNumMatch[0]);
                }

                // Hanya update jika ada data baru
                if (finalTtr !== null || parsedClose !== null || finalImpacted !== null || finalOutage !== null) {
                    toUpdate.push({
                        id: matchedTicket.id,
                        id_tiket: matchedTicket.id_tiket,
                        ttr: finalTtr !== null ? finalTtr : matchedTicket.ttr_tacc,
                        close_time: parsedClose,
                        impacted_sites: finalImpacted !== null ? finalImpacted : matchedTicket.impacted_sites,
                        outage_hours: finalOutage !== null ? finalOutage : matchedTicket.outage_hours,
                        old_ttr: matchedTicket.ttr_tacc,
                        old_status: matchedTicket.status
                    });
                }
            }
        }

        if (toUpdate.length === 0) {
            return NextResponse.json({
                message: `Sinkronisasi selesai. Dari ${dataRows.length} baris Google Sheet, tidak ada tiket yang memerlukan pembaruan.`,
                total_sheet_rows: dataRows.length,
                matched: seenDbIds.size,
                updated: 0
            });
        }

        // 6. Eksekusi Batch Update (CASE-WHEN) ke Database
        let updatedCount = 0;
        const BATCH_SIZE = 50;

        for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
            const batch = toUpdate.slice(i, i + BATCH_SIZE);
            const ids = batch.map(b => b.id);

            const ttrCases = [];
            const ttrParams = [];

            const closeTimeCases = [];
            const closeTimeParams = [];
            
            const impactedCases = [];
            const impactedParams = [];
            
            const outageCases = [];
            const outageParams = [];

            for (const item of batch) {
                if (item.ttr !== null) {
                    ttrCases.push(`WHEN id = ? THEN ?`);
                    ttrParams.push(item.id, item.ttr);
                }

                if (item.close_time) {
                    closeTimeCases.push(`WHEN id = ? THEN ?`);
                    closeTimeParams.push(item.id, item.close_time);
                }
                
                if (item.impacted_sites !== null && item.impacted_sites !== undefined) {
                    impactedCases.push(`WHEN id = ? THEN ?`);
                    impactedParams.push(item.id, item.impacted_sites);
                }

                if (item.outage_hours !== null && item.outage_hours !== undefined) {
                    outageCases.push(`WHEN id = ? THEN ?`);
                    outageParams.push(item.id, item.outage_hours);
                }
            }

            let sql = `UPDATE tickets SET status = 'CLOSED'`;
            let params = [];

            if (ttrCases.length > 0) {
                sql += `, ttr_tacc = CASE ${ttrCases.join(' ')} ELSE ttr_tacc END`;
                params.push(...ttrParams);
            }

            if (closeTimeCases.length > 0) {
                sql += `, closed_at = CASE ${closeTimeCases.join(' ')} ELSE closed_at END`;
                sql += `, last_update_time = CASE ${closeTimeCases.join(' ')} ELSE last_update_time END`;
                params.push(...closeTimeParams, ...closeTimeParams);
            } else {
                sql += `, last_update_time = NOW()`;
            }
            
            if (impactedCases.length > 0) {
                sql += `, impacted_sites = CASE ${impactedCases.join(' ')} ELSE impacted_sites END`;
                params.push(...impactedParams);
            }

            if (outageCases.length > 0) {
                sql += `, outage_hours = CASE ${outageCases.join(' ')} ELSE outage_hours END`;
                params.push(...outageParams);
            }

            sql += ` WHERE id IN (${ids.map(() => '?').join(',')})`;
            params.push(...ids);

            const [result] = await db.query(sql, params);
            if (result && result.affectedRows > 0) {
                updatedCount += result.affectedRows;
            }

            // Catat ke ticket_history
            for (const item of batch) {
                try {
                    await db.query(
                        `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) 
                         VALUES (?, ?, 'Auto-Sync GSheet SQUAT', NOW())`,
                        [item.id, `Status disinkronkan ke CLOSED (TTR: ${item.ttr || '-'} Jam, Closed: ${item.close_time || 'N/A'})`]
                    );
                } catch (histErr) {
                    // Ignore duplicate history errors
                }
            }
        }

        // 7. Trigger Pusher Realtime
        if (updatedCount > 0) {
            try {
                await pusherServer.trigger('dashboard-channel', 'ticket-update', {
                    message: `Auto-Sync GSheet SQUAT: ${updatedCount} tiket diperbarui`,
                    type: 'SQUAT_GSHEET_SYNC',
                    category: 'SQUAT',
                    updated_ttr: updatedCount,
                    timestamp: new Date().toISOString()
                });
            } catch (pErr) {
                console.error("⚠️ [Sync-SQUAT-GSheet] Gagal kirim Pusher:", pErr.message);
            }
        }

        console.log(`✅ [Sync-SQUAT-GSheet] Sukses memperbarui ${updatedCount} tiket SQUAT.`);

        return NextResponse.json({
            success: true,
            message: `Sinkronisasi SQUAT dari Google Sheet berhasil! ${updatedCount} tiket telah diperbarui nilai TTR & status CLOSED.`,
            total_sheet_rows: dataRows.length,
            matched: seenDbIds.size,
            updated: updatedCount,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ [Sync-SQUAT-GSheet] Error:", error);
        return NextResponse.json({ error: 'Gagal sinkronisasi dari Google Sheet: ' + error.message }, { status: 500 });
    }
}
