import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';
import { getGoogleAuth } from '@/lib/googleSheets';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

function parseDate(dateStr) {
    if (!dateStr) return null;
    const [datePart, timePart] = dateStr.split(' ');
    if (!datePart || !timePart) return null;
    const [dd, mm, yyyy] = datePart.split('/');
    if (!dd || !mm || !yyyy) return null;
    const [hh, min] = timePart.split(':');
    return `${yyyy}-${mm}-${dd} ${hh || '00'}:${min || '00'}:00`;
}

function determinePriority(subcategory, summary, rawPriority) {
    const summaryUpper = (summary || '').toUpperCase();
    
    if (subcategory === 'OLO') {
        if (summaryUpper.includes('QUALITY')) {
            return 'QUALITY';
        }
        return 'NON-GAMAS';
    }
    
    if (subcategory === 'TSEL') {
        if (summaryUpper.includes('CRITICAL')) return 'CRITICAL';
        if (summaryUpper.includes('MAJOR')) return 'MAJOR';
        if (summaryUpper.includes('MINOR')) return 'MINOR';
        if (summaryUpper.includes('LOW')) return 'LOW';
        if (summaryUpper.includes('PREMIUM')) return 'PREMIUM';
        if (summaryUpper.includes('CNQ')) return 'CNQ';
        
        if (rawPriority && rawPriority.trim() !== '') {
            return rawPriority.trim().toUpperCase();
        }
        return 'LOW'; // Default fallback TSEL
    }

    return rawPriority || null;
}

export async function POST(request) {
    const connection = await db.getConnection();
    try {
        // Cek apakah request berasal dari Webhook menggunakan custom header
        const webhookSecret = request.headers.get('x-webhook-secret');
        const expectedSecret = process.env.WEBHOOK_SECRET || 'SquatSync2026';
        let isWebhook = false;
        let user = null;

        if (webhookSecret === expectedSecret) {
            isWebhook = true;
        } else {
            // Jika bukan Webhook, verifikasi melalui JWT dari cookies browser
            const token = request.cookies.get('token')?.value;
            if (!token) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            user = await verifyJWT(token);
            if (!user || user.role !== 'SuperAdmin') {
                return NextResponse.json({ error: 'Hanya SuperAdmin yang dapat melakukan sync manual.' }, { status: 403 });
            }
        }

        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID_SCRAPE || '15JQXtM0p_pXIyYzuuV7tdC0mdIR75ZVvQtSXh1Zztp0';
        
        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'MainSheet!A1:FF',
        });

        const data = res.data.values;
        if (!data || data.length < 2) {
            return NextResponse.json({ message: 'Tidak ada data di sheet' }, { status: 200 });
        }

        const headers = data[0];
        const rows = data.slice(1);

        const getVal = (row, name) => {
            const idx = headers.indexOf(name);
            return idx !== -1 && row[idx] !== undefined ? String(row[idx]).trim() : '';
        };

        // Fetch STO mappings to accurately map STO to Branch
        const [mappings] = await connection.query('SELECT sto, branch FROM sto_branch_mappings');
        const stoToBranch = {};
        for (const m of mappings) {
            if (m.sto && m.branch) {
                stoToBranch[m.sto.toUpperCase()] = m.branch;
            }
        }

        let syncedCount = 0;
        let skippedCount = 0;

        for (const row of rows) {
            const incident = getVal(row, 'INCIDENT');
            if (!incident) continue;

            const summary = getVal(row, 'SUMMARY');
            const reportedBy = getVal(row, 'REPORTED BY').toUpperCase();
            const layanan = (getVal(row, 'LAYANAN') || getVal(row, 'LAYANAN NEW') || '').toUpperCase();
            const customerSegment = getVal(row, 'CUSTOMER SEGMENT').toUpperCase();
            const rawPriority = getVal(row, 'REPORTED PRIORITY');
            const reportedDateStr = getVal(row, 'REPORTED DATE');
            const spreadsheetStatus = getVal(row, 'STATUS').toUpperCase();
            
            // Skip tickets that are already closed in the spreadsheet
            const closedStatuses = ['CLOSED', 'RESOLVED', 'COMPLETED', 'CANCELED', 'CANCELLED', 'DONE', 'SALAMSIM', 'MEDIACARE', 'FINALCHECK'];
            if (closedStatuses.includes(spreadsheetStatus) || spreadsheetStatus.includes('CLOSE')) {
                skippedCount++;
                continue;
            }

            // Map WITEL to branch and WORKZONE to sto
            const rawWitel = getVal(row, 'WITEL');
            const rawWorkzone = getVal(row, 'WORKZONE');
            
            const sto = rawWorkzone ? rawWorkzone.toUpperCase() : null;
            let branch = rawWitel || null;
            if (sto && stoToBranch[sto]) {
                branch = stoToBranch[sto];
            }

            let subcategory = null;
            if (layanan === 'TSEL' || reportedBy === 'INAP_TSEL' || summary.toUpperCase().startsWith('TSEL_')) {
                subcategory = 'TSEL';
            } else if (layanan.includes('OLO') && (customerSegment === 'DWS' || customerSegment === 'TELKOM INFRACO')) {
                subcategory = 'OLO';
            }

            if (!subcategory) {
                skippedCount++;
                continue;
            }

            const priority = determinePriority(subcategory, summary, rawPriority);
            const tiketTime = parseDate(reportedDateStr) || new Date();

            // Insert Ignore to avoid duplicates
            // We use 'SQUAT' as category for TSEL and OLO
            const [result] = await connection.query(
                `INSERT IGNORE INTO tickets 
                (category, subcategory, priority, id_tiket, tiket_time, deskripsi, status, created_by_user_id, updated_by_user_id, last_update_time, sto, branch) 
                VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, NOW(), ?, ?)`,
                [
                    'SQUAT',
                    subcategory,
                    priority,
                    incident,
                    tiketTime,
                    summary || '-',
                    isWebhook ? 1 : user.userId,
                    isWebhook ? 1 : user.userId,
                    sto,
                    branch
                ]
            );

            if (result.affectedRows === 1) {
                // New ticket inserted
                syncedCount++;
                const ticketId = result.insertId;
                
                await connection.query(
                    `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())`,
                    [ticketId, `Tiket disinkronisasi dari Google Sheets (Auto)`, 'Sistem']
                );

                try {
                    await pusherServer.trigger('dashboard-channel', 'ticket-update', {
                        message: `Tiket ${incident} baru saja disinkronisasi dari Sheet`,
                        type: 'NEW_TICKET',
                        timestamp: new Date().toISOString()
                    });
                } catch (pusherError) {
                    console.error(">>> Pusher Trigger Error on Sync:", pusherError);
                }
            } else {
                skippedCount++;
            }
        }

        return NextResponse.json({ 
            message: 'Sinkronisasi selesai', 
            synced: syncedCount,
            skipped: skippedCount
        }, { status: 200 });

    } catch (error) {
        console.error("Sync Sheet Error:", error);
        return NextResponse.json({ error: 'Gagal melakukan sinkronisasi: ' + error.message }, { status: 500 });
    } finally {
        connection.release();
    }
}
