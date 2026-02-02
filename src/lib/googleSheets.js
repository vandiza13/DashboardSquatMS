import { google } from 'googleapis';

export async function appendTicketToSheet(ticketData) {
    try {
        console.log("🛠️ [GSheet] Starting input process...");

        // 1. SETUP AUTH (VERCEL COMPATIBLE)
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                // Handle newlines for Private Key in Vercel
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '19OIHJz9U0KsCpeNcy0faoOuQzIvu6ChsZ4CpZQqOTCw';

        // Destructure Data (Added priority and id_tiket_tacc)
        const { 
            category, subcategory, priority, 
            id_tiket, id_tiket_tacc, // [NEW] Get TACC ID
            deskripsi, sto, tiket_time, close_time, root_cause, technician_full 
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
            // --- TSEL: Has PRIORITY Column ---
            // Ensure you add "Priority" column in Excel Column C
            rowValues = [
                nomorUrut,          // A
                id_tiket,           // B    // C: PRIORITY (Specific to TSEL)
                deskripsi,          // C
                sto || '',          // E
                priority || '-',     // D: PRIORITY
                '', '', '',     // F-H (Empty)
                formatDate(tiket_time), // I
                formatDate(close_time), // J
                '', '',             // K-L
                technician_full,    // M
                'CLOSED',           // N
                root_cause,         // O
                ''                  // P
            ];
        
        } else if (sheetName === 'OLO') {
            // --- OLO: ORIGINAL STRUCTURE (No Priority/TACC) ---
            rowValues = [
                nomorUrut,          // A
                id_tiket,           // B
                // SKIP PRIORITY/TACC
                deskripsi,          // C
                sto || '',          // D
                '', '',             // E-F (Empty)
                formatDate(tiket_time), // G
                formatDate(close_time), // H
                '', '',             // I-J
                technician_full,    // K
                'CLOSED',           // L
                root_cause,         // M
                ''                  // N
            ];

        } else if (sheetName === 'MTEL') {
            // --- MTEL: [NEW] Has ID TACC in Column C ---
            // Ensure you add "ID TACC" column in Excel Column C
            rowValues = [
                nomorUrut,              // A
                id_tiket_tacc || '-',   // B: ID TACC [NEW]
                id_tiket,               // C
                deskripsi,              // D
                '',                     // E: TTR HOUR
                subcategory || '',      // F: TICKET TYPE
                formatDate(tiket_time), // G
                formatDate(close_time), // H
                'CLOSED',               // I
                technician_full,        // J
                root_cause,             // K
                ''                      // L
            ];

        } else if (sheetName === 'UMT' || sheetName === 'FSI') {
            // --- UMT & FSI: [NEW] Has ID TACC in Column C ---
            // Ensure you add "ID TACC" column in Excel Column C
            rowValues = [
                nomorUrut,              // A
                id_tiket_tacc || '-',   // B
                id_tiket,               // C
                deskripsi,              // D
                '',                     // E: TTR HOUR
                formatDate(tiket_time), // F
                formatDate(close_time), // G
                'CLOSED',               // H
                technician_full,        // I
                root_cause,             // J
                ''                      // K
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