// --- UPDATE PAKSA VERCEL (VERSI FIX) ---
import { google } from 'googleapis';

export async function appendTicketToSheet(ticketData) {
    try {
        console.log("🛠️ Menggunakan Versi Env Var (Tanpa service-account.json)");

        // 1. SETUP AUTH (Pakai Env Var, bukan File)
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                // Handle newlines untuk Private Key di Vercel
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1Dto5IumIKqzD_cFePc3tH8vY_Lv_w9NLkuhxxZes0ak';

        // Destructure
        const { category, subcategory, id_tiket, deskripsi, sto, tiket_time, close_time, root_cause, technician_full } = ticketData;

        // 2. LOGIC SHEET
        if (category !== 'SQUAT') return false;

        let sheetName = '';
        if (subcategory === 'TSEL') sheetName = 'TSEL';
        else if (subcategory === 'OLO') sheetName = 'OLO';
        
        if (!sheetName) return false;

        // 3. CEK BARIS KOSONG
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!B:B`,
        });

        const rows = response.data.values || [];
        const nextRow = rows.length + 1;
        const nomorUrut = nextRow - 3; 

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

        // 5. MAPPING DATA
        let rowValues = [];
        const commonData = [
            nomorUrut, id_tiket, deskripsi, sto || '', 
            '', '', // Priority/Gamas 
            (sheetName === 'TSEL' ? '' : formatDate(tiket_time)), // TSEL Skip di sini
            (sheetName === 'TSEL' ? '' : formatDate(close_time))  // TSEL Skip di sini
        ];

        // Format khusus per tab (karena urutan kolom beda)
        if (sheetName === 'TSEL') {
             // A=NO, B=ID, C=Desc, D=STO, E-H=Kosong, I=Start, J=Closed
             rowValues = [
                nomorUrut, id_tiket, deskripsi, sto || '', 
                '', '', '', '', 
                formatDate(tiket_time), formatDate(close_time), 
                '', '', technician_full, 'CLOSED', root_cause, ''
            ];
        } else {
             // OLO: A=NO, B=ID, C=Desc, D=STO, E-F=Kosong, G=Start, H=Closed
             rowValues = [
                nomorUrut, id_tiket, deskripsi, sto || '', 
                '', '', 
                formatDate(tiket_time), formatDate(close_time), 
                '', '', technician_full, 'CLOSED', root_cause, ''
            ];
        }

        // 6. EKSEKUSI
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A${nextRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowValues] },
        });

        console.log(`✅ [GSheet] SUKSES input ${id_tiket}`);
        return true;

    } catch (error) {
        console.error('❌ [GSheet] Error:', error.message);
        return false; 
    }
}