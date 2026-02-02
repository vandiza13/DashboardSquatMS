import { google } from 'googleapis';

export async function appendTicketToSheet(ticketData) {
    try {
        console.log("🛠️ [GSheet] Memulai proses input...");

        // 1. SETUP AUTH (VERCEL COMPATIBLE)
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                // Handle newlines untuk Private Key di Vercel
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '19OIHJz9U0KsCpeNcy0faoOuQzIvu6ChsZ4CpZQqOTCw';

        // Destructure Data
        const { 
            category, subcategory, priority, // Ambil priority (Hanya dipakai TSEL)
            id_tiket, deskripsi, sto, tiket_time, close_time, root_cause, technician_full 
        } = ticketData;

        // ==========================================================
        // 2. TENTUKAN NAMA SHEET (TAB)
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
            console.log(`⚠️ [GSheet] Skip: Kategori ${category} tidak punya Sheet tujuan.`);
            return false;
        }

        // ==========================================================
        // 3. LOGIKA NOMOR URUT OTOMATIS
        // ==========================================================
        
        // A. Cek Baris Kosong (Pakai Kolom B sebagai acuan ID)
        const responseB = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!B:B`,
        });
        const rowsB = responseB.data.values || [];
        const nextRow = rowsB.length + 1;

        // B. Cek Nomor Terakhir di Kolom A
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

        // 4. FORMAT WAKTU (WIB)
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
        // 5. MAPPING DATA (HANYA TSEL YANG PAKAI PRIORITY)
        // ==========================================================
        let rowValues = [];

        if (sheetName === 'TSEL') {
            // --- KHUSUS TSEL: ADA KOLOM PRIORITY ---
            // Pastikan di Excel Tab TSEL kamu sudah Insert Column "Priority" di sebelah kanan ID Tiket
            rowValues = [
                nomorUrut,          // A
                id_tiket,           // B
                deskripsi,          // C
                sto || '',          // D
                priority || '-',    // E: PRIORITY (KHUSUS TSEL)
                '', '', '',     // F-H (Kosong)
                formatDate(tiket_time), // I
                formatDate(close_time), // J
                '', '',             // K-L
                technician_full,    // M
                'CLOSED',           // N
                root_cause,         // O
                ''                  // P
            ];
        
        } else if (sheetName === 'OLO') {
            // --- OLO: STRUKTUR LAMA (TIDAK ADA PRIORITY) ---
            rowValues = [
                nomorUrut,          // A
                id_tiket,           // B
                // SKIP PRIORITY
                deskripsi,          // C
                sto || '',          // D
                '', '',             // E-F (Kosong)
                formatDate(tiket_time), // G
                formatDate(close_time), // H
                '', '',             // I-J
                technician_full,    // K
                'CLOSED',           // L
                root_cause,         // M
                ''                  // N
            ];

        } else if (sheetName === 'MTEL') {
            // --- MTEL: STRUKTUR LAMA (TIDAK ADA PRIORITY) ---
            rowValues = [
                nomorUrut,              // A
                id_tiket,               // B
                // SKIP PRIORITY
                deskripsi,              // C
                '',                     // D: TTR JAM
                subcategory || '',      // E: JENIS TIKET
                formatDate(tiket_time), // F
                formatDate(close_time), // G
                'CLOSED',               // H
                technician_full,        // I
                root_cause,             // J
                ''                      // K
            ];

        } else if (sheetName === 'UMT' || sheetName === 'FSI') {
            // --- UMT/FSI: STRUKTUR LAMA (TIDAK ADA PRIORITY) ---
            rowValues = [
                nomorUrut,              // A
                id_tiket,               // B
                // SKIP PRIORITY
                deskripsi,              // C
                '',                     // D: TTR JAM
                formatDate(tiket_time), // E
                formatDate(close_time), // F
                'CLOSED',               // G
                technician_full,        // H
                root_cause,             // I
                ''                      // J
            ];
        }

        // 6. EKSEKUSI UPDATE
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A${nextRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowValues] },
        });

        console.log(`✅ [GSheet] SUKSES input ${id_tiket} ke Tab ${sheetName} (No. ${nomorUrut})`);
        return true;

    } catch (error) {
        console.error('❌ [GSheet] Error:', error.message);
        return false; 
    }
}