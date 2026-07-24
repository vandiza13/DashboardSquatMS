import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export function getGoogleAuth() {
    let client_email = process.env.GOOGLE_CLIENT_EMAIL;
    let private_key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // Fallback to service-account.json locally
    if (!client_email || !private_key) {
        try {
            const saPath = path.join(process.cwd(), 'service-account.json');
            if (fs.existsSync(saPath)) {
                const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
                client_email = sa.client_email;
                private_key = sa.private_key;
            }
        } catch (err) {
            console.error("⚠️ [GSheet] Failed to load local service-account.json:", err.message);
        }
    }

    return new google.auth.GoogleAuth({
        credentials: {
            client_email,
            private_key,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}


export async function appendTicketToSheet(ticketData) {
    try {
        console.log("🛠️ [GSheet] Starting input process...");

        // 1. SETUP AUTH (WITH LOCAL FALLBACK)
        const auth = getGoogleAuth();

        const sheets = google.sheets({ version: 'v4', auth });
        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '19OIHJz9U0KsCpeNcy0faoOuQzIvu6ChsZ4CpZQqOTCw';

        // Destructure Data (Added priority and id_tiket_tacc)
        const {
            category, subcategory, priority,
            id_tiket, id_tiket_tacc,
            deskripsi, sto, branch, tiket_time, close_time, root_cause, technician_full
        } = ticketData;

        // ==========================================================
        // 2. DETERMINE SHEET NAME (TAB)
        // ==========================================================
        let sheetName = '';

        if (category === 'SQUAT') {
            if (subcategory === 'TSEL') sheetName = 'TSEL';
            else if (subcategory === 'OLO') sheetName = 'OLO';
        }
        else if (category === 'MTEL') {
            sheetName = 'MTEL';
        }
        else if (category === 'UMT') {
            sheetName = 'UMT';
        }
        else if (category === 'CENTRATAMA') {
            sheetName = 'FSI';
        }

        if (!sheetName) {
            console.log(`⚠️ [GSheet] Skip: Category ${category} has no target Sheet.`);
            return false;
        }

        // ==========================================================
        // 3. AUTOMATIC SERIAL NUMBER LOGIC
        // ==========================================================

        // A. Check Empty Row (Use Column B as ID reference)
        const responseB = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!B:B`,
        });
        const rowsB = responseB.data.values || [];
        const nextRow = rowsB.length + 1;

        // B. Check Last Number in Column A
        const responseA = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:A`,
        });
        const rowsA = responseA.data.values || [];

        let lastNumber = 0;
        for (let i = rowsA.length - 1; i >= 0; i--) {
            const val = rowsA[i][0];
            if (val && !isNaN(parseInt(val))) {
                lastNumber = parseInt(val);
                break;
            }
        }

        const nomorUrut = lastNumber + 1;

        // 4. DATE FORMAT (WIB)
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return '';
            return new Intl.DateTimeFormat('id-ID', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false, timeZone: 'Asia/Jakarta'
            }).format(d).replace(/\./g, ':');
        };

        // ==========================================================
        // 5. DATA MAPPING (SAFE & TARGETED UPDATES)
        // ==========================================================
        let rowValues = [];

        if (sheetName === 'TSEL') {
            // --- TSEL: Has PRIORITY & BRANCH Column ---
            rowValues = [
                nomorUrut,          // A
                id_tiket,           // B
                deskripsi,          // C
                sto || '',          // D
                priority || '-',     // E: PRIORITY
                branch || '',       // F: BRANCH
                '', '', '',         // G-I (Empty)
                formatDate(tiket_time), // J
                formatDate(close_time), // K
                '', '',             // L-M
                technician_full,    // N
                'CLOSED',           // O
                root_cause,         // P
                ''                  // Q
            ];

        } else if (sheetName === 'OLO') {
            // --- OLO: With PRIORITY & BRANCH ---
            rowValues = [
                nomorUrut,          // A
                id_tiket,           // B
                deskripsi,          // C
                sto || '',          // D
                priority || '-',     // E: PRIORITY
                branch || '',       // F: BRANCH
                '', '',             // G-H (Empty)
                formatDate(tiket_time), // I
                formatDate(close_time), // J
                '', '',             // K-L
                technician_full,    // M
                'CLOSED',           // N
                root_cause,         // O
                ''                  // P
            ];

        } else if (sheetName === 'MTEL') {
            // --- MTEL: Has ID TACC, STO, BRANCH ---
            rowValues = [
                nomorUrut,              // A
                id_tiket_tacc || '-',   // B: ID TACC [NEW]
                id_tiket,               // C
                deskripsi,              // D
                '',                     // E: TTR HOUR
                sto || '',              // F: STO [NEW]
                branch || '',           // G: BRANCH [NEW]
                subcategory || '',      // H: TICKET TYPE
                formatDate(tiket_time), // I
                formatDate(close_time), // J
                'CLOSED',               // K
                technician_full,        // L
                root_cause,             // M
                ''                      // N
            ];

        } else if (sheetName === 'UMT' || sheetName === 'FSI') {
            // --- UMT & FSI: Has ID TACC, STO, BRANCH ---
            rowValues = [
                nomorUrut,              // A
                id_tiket_tacc || '-',   // B
                id_tiket,               // C
                deskripsi,              // D
                '',                     // E: TTR HOUR
                sto || '',              // F: STO [NEW]
                branch || '',           // G: BRANCH [NEW]
                formatDate(tiket_time), // H
                formatDate(close_time), // I
                'CLOSED',               // J
                technician_full,        // K
                root_cause,             // L
                ''                      // M
            ];
        }

        // 6. EXECUTE UPDATE
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A${nextRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowValues] },
        });

        console.log(`✅ [GSheet] SUCCESS input ${id_tiket} to Tab ${sheetName} (No. ${nomorUrut})`);
        return true;

    } catch (error) {
        console.error('❌ [GSheet] Error:', error.message);
        return false;
    }
}

export async function appendSiteToSheet(siteData, provider = 'TSEL') {
    try {
        console.log(`🛠️ [GSheet] Starting Site ${provider} input process...`);

        // 1. SETUP AUTH (WITH LOCAL FALLBACK)
        const auth = getGoogleAuth();

        const sheets = google.sheets({ version: 'v4', auth });
        // Gunakan Google Sheet TERPISAH khusus data Site
        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID_SITES || '1lybP7L6_T9LUIM4tFCA7UhEgBEq4OllV37_g5RPhLj4';
        const sheetName = provider; // Nama Tab di Google Sheet Site (TSEL, FSI, MTEL, UMT)

        // 2. CHECK SHEET ACCESSIBILITY & GET COLUMNS
        const responseB = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!B:B`,
        }).catch(err => {
            console.log(`⚠️ [GSheet] Tab ${sheetName} does not exist or sheet error:`, err.message);
            return null;
        });

        if (!responseB) {
            console.log(`⚠️ [GSheet] Skip Google Sheet sync for Site because Tab ${sheetName} is not accessible.`);
            return false;
        }

        const rowsB = responseB.data.values || [];
        const nextRow = rowsB.length + 1;

        // Check if site_id already exists in column B
        let targetRow = nextRow;
        let isUpdate = false;
        
        for (let i = 0; i < rowsB.length; i++) {
            if (rowsB[i][0] && String(rowsB[i][0]).trim().toLowerCase() === String(siteData.site_id).trim().toLowerCase()) {
                targetRow = i + 1; // 1-indexed row number
                isUpdate = true;
                break;
            }
        }

        const responseA = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:A`,
        });
        const rowsA = responseA.data.values || [];

        let nomorUrut = 1;
        if (isUpdate) {
            const responseRowA = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!A${targetRow}`,
            });
            const existingA = responseRowA.data.values;
            if (existingA && existingA[0] && existingA[0][0]) {
                nomorUrut = existingA[0][0];
            } else {
                nomorUrut = targetRow - 1;
            }
        } else {
            let lastNumber = 0;
            for (let i = rowsA.length - 1; i >= 0; i--) {
                const val = rowsA[i][0];
                if (val && !isNaN(parseInt(val))) {
                    lastNumber = parseInt(val);
                    break;
                }
            }
            nomorUrut = lastNumber + 1;
        }

        // 3. DATA MAPPING
        let rowValues = [];
        const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        if (provider === 'TSEL') {
            rowValues = [
                nomorUrut,                               // A
                siteData.site_id || '',                  // B
                siteData.site_name || '',                // C
                siteData.latitude || '',                 // D
                siteData.longitude || '',                // E
                siteData.site_class || '',               // F
                siteData.branch || '',                   // G
                siteData.sto || '',                      // H
                siteData.metro || '',                    // I
                siteData.port_metro || '',               // J
                siteData.akses || '',                    // K
                siteData.port_connection || '',          // L
                siteData.ip_olt || '',                   // M
                siteData.gpon || '',                     // N
                siteData.port_gpon || '',                // O
                siteData.ip_ont || '',                   // P
                siteData.sn_ont || '',                   // Q
                siteData.ea_subrack_core || '',          // R
                siteData.oa_subrack_core || '',          // S
                siteData.site_name_odc || '',            // T
                siteData.capacity_odc || '',             // U
                siteData.bastray_feeder_odc || '',       // V
                siteData.core_feeder_odc || '',          // W
                siteData.bastray_distribusi || '',       // X
                siteData.distribusi_core || '',          // Y
                siteData.latitude_odc || '',             // Z
                siteData.longitude_odc || '',            // AA
                siteData.site_name_odp || '',            // AB
                siteData.latitude_odp || '',             // AC
                siteData.longitude_odp || '',            // AD
                siteData.keterangan || '',               // AE
                timestamp                                // AF
            ];
        } else if (provider === 'FSI' || provider === 'UMT') {
            rowValues = [
                nomorUrut,                               // A
                siteData.site_id || '',                  // B
                siteData.site_name || '',                // C
                siteData.latitude || '',                 // D
                siteData.longitude || '',                // E
                siteData.sto || '',                      // F
                siteData.ring || '',                     // G
                siteData.keterangan || '',               // H
                timestamp                                // I
            ];
        } else if (provider === 'MTEL') {
            rowValues = [
                nomorUrut,                               // A
                siteData.site_id || '',                  // B
                siteData.site_name || '',                // C
                siteData.latitude || '',                 // D
                siteData.longitude || '',                // E
                siteData.sto || '',                      // F
                siteData.keterangan || '',               // G
                timestamp                                // H
            ];
        }

        // 4. EXECUTE UPDATE
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A${targetRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowValues] },
        });

        console.log(`✅ [GSheet] SUCCESS ${isUpdate ? 'UPDATE' : 'INSERT'} Site ${siteData.site_id} in Tab ${sheetName} (Row ${targetRow}, No. ${nomorUrut})`);
        return true;

    } catch (error) {
        console.error('❌ [GSheet] Error appending Site:', error.message);
        return false;
    }
}