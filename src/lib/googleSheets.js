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
        const { category, subcategory, id_tiket, deskripsi, sto, tiket_time, close_time, root_cause, technician_full } = ticketData;

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
            // Masuk ke sheet FSI (Subkategori FSI atau default)
            sheetName = 'FSI'; 
        }

        // Validasi: Jika sheetName tidak ditemukan
        if (!sheetName) {
            console.log(`⚠️ [GSheet] Skip: Kategori ${category} tidak punya Sheet tujuan.`);
            return false;
        }

        // ==========================================================
        // 3. LOGIKA NOMOR URUT OTOMATIS (FIX)
        // ==========================================================
        
        // A. Cek Baris Kosong Berdasarkan Kolom B (ID Tiket)
        // Kita pakai kolom B untuk menentukan di baris mana kita akan MENULIS (nextRow)
        const responseB = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!B:B`,
        });
        const rowsB = responseB.data.values || [];
        const nextRow = rowsB.length + 1;

        // B. Cek Nomor Terakhir di Kolom A (No)
        // Kita baca Kolom A untuk menentukan ANGKA NOMOR URUT (agar continue)
        const responseA = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:A`,
        });
        const rowsA = responseA.data.values || [];
        
        let lastNumber = 0;
        // Loop dari bawah ke atas untuk mencari angka valid terakhir
        // Ini berguna jika baris terakhir ternyata kosong di kolom A atau berisi footer
        for (let i = rowsA.length - 1; i >= 0; i--) {
            const val = rowsA[i][0];
            // Cek apakah nilai tersebut angka valid
            if (val && !isNaN(parseInt(val))) {
                lastNumber = parseInt(val);
                break; // Ketemu angka terakhir, stop loop
            }
        }
        
        // Nomor Urut Baru = Angka Terakhir + 1
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
        // 5. MAPPING DATA (SUSUN KOLOM)
        // ==========================================================
        let rowValues = [];

        if (sheetName === 'TSEL') {
            // Sheet TSEL: A=NO, B=ID, C=Desc, D=STO ... I=Start, J=Close
            rowValues = [
                nomorUrut, id_tiket, deskripsi, sto || '', 
                '', '', '', '', // E-H Kosong
                formatDate(tiket_time), formatDate(close_time), 
                '', '', technician_full, 'CLOSED', root_cause, ''
            ];
        
        } else if (sheetName === 'OLO') {
            // Sheet OLO: A=NO, B=ID, C=Desc, D=STO ... G=Start, H=Close
            rowValues = [
                nomorUrut, id_tiket, deskripsi, sto || '', 
                '', '', // E-F Kosong
                formatDate(tiket_time), formatDate(close_time), 
                '', '', technician_full, 'CLOSED', root_cause, ''
            ];

        } else if (sheetName === 'MTEL') {
            // Sheet MTEL: E=JENIS TIKET
            rowValues = [
                nomorUrut,              // A
                id_tiket,               // B
                deskripsi,              // C
                '',                     // D: TTR JAM (Kosong)
                subcategory || '',      // E: JENIS TIKET (TIS/MMP/FIBERISASI)
                formatDate(tiket_time), // F
                formatDate(close_time), // G
                'CLOSED',               // H: STATUS
                technician_full,        // I: TEKNISI
                root_cause,             // J: ROOT CAUSE
                ''                      // K: ACTION
            ];

        } else if (sheetName === 'UMT' || sheetName === 'FSI') {
            // Sheet UMT & FSI: Standard
            rowValues = [
                nomorUrut,              // A
                id_tiket,               // B
                deskripsi,              // C
                '',                     // D: TTR JAM
                formatDate(tiket_time), // E
                formatDate(close_time), // F
                'CLOSED',               // G: STATUS
                technician_full,        // H: TEKNISI
                root_cause,             // I: ROOT CAUSE
                ''                      // J: ACTION
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