import { google } from 'googleapis';
import path from 'path';

export async function appendTicketToSheet(ticketData) {
    try {
        // 1. SETUP AUTHENTICATION
        // Pastikan file service-account.json ada di root folder project
        const keyFile = path.join(process.cwd(), 'service-account.json');
        
        const auth = new google.auth.GoogleAuth({
            keyFile,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // ID SPREADSHEET (Sesuaikan dengan ID Spreadsheet Anda)
        const SPREADSHEET_ID = '1Dto5IumIKqzD_cFePc3tH8vY_Lv_w9NLkuhxxZes0ak';

        // Destructure Data
        const { 
            category, 
            subcategory, 
            id_tiket, 
            deskripsi, 
            sto,             // Data STO (Baru)
            tiket_time, 
            close_time, 
            root_cause, 
            technician_full 
        } = ticketData;

        // 2. TENTUKAN TAB (SHEET)
        // Logic: Hanya proses SQUAT, lalu pecah ke TSEL atau OLO
        if (category !== 'SQUAT') return false;

        let sheetName = '';
        if (subcategory === 'TSEL') sheetName = 'TSEL';
        else if (subcategory === 'OLO') sheetName = 'OLO';
        
        // Jika subkategori bukan TSEL atau OLO, berhenti
        if (!sheetName) return false;

        // --- VALIDASI BARIS KOSONG (READ BEFORE WRITE) ---
        // Kita baca Kolom B (TIKET ID) untuk mengetahui baris terakhir yang ada isinya.
        const checkRange = `${sheetName}!B:B`;
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: checkRange,
        });

        const rows = response.data.values || [];
        // Baris target = Jumlah baris yang ada isinya + 1
        const nextRow = rows.length + 1;
        
        // Hitung Nomor Urut (Kolom A)
        // Header di baris 3, jadi data pertama (No 1) ada di Baris 4.
        const nomorUrut = nextRow - 3; 

        // 3. FORMAT WAKTU (YYYY-MM-DD HH:mm:ss)
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const d = new Date(dateString);
            return d.getFullYear() + '-' +
                   String(d.getMonth() + 1).padStart(2, '0') + '-' +
                   String(d.getDate()).padStart(2, '0') + ' ' +
                   String(d.getHours()).padStart(2, '0') + ':' +
                   String(d.getMinutes()).padStart(2, '0') + ':' +
                   String(d.getSeconds()).padStart(2, '0');
        };

        // 4. SUSUN DATA (MAPPING KOLOM BERBEDA UNTUK TSEL & OLO)
        let rowValues = [];

        if (sheetName === 'TSEL') {
            // --- MAPPING TSEL ---
            // A=NO, B=ID, C=Desc, D=STO, I=Start, J=Closed, M=Teknisi, N=Status, O=RCA, P=Action
            rowValues = [
                nomorUrut,              // A: NO
                id_tiket,               // B: TIKET ID
                deskripsi,              // C: DESCRIPTION
                sto || '',              // D: STO (DATA BARU)
                '',                     // E: Priority
                '',                     // F: Gamas
                '',                     // G: Material
                '',                     // H: Gaul
                formatDate(tiket_time), // I: ACTUAL START
                formatDate(close_time), // J: ACTUAL CLOSED
                '',                     // K: MTTR REG
                '',                     // L: C / NC
                technician_full,        // M: Teknisi (Lensa + Partner)
                'CLOSED',               // N: TICKET TSEL (Status)
                root_cause,             // O: ROOT CAUSE
                ''                  // P: ACTION
            ];
        } else if (sheetName === 'OLO') {
            // --- MAPPING OLO ---
            // A=NO, B=ID, C=Desc, D=STO, H=Start, I=Closed, L=Teknisi, M=Status, N=RCA, O=Action
            rowValues = [
                nomorUrut,              // A: NO
                id_tiket,               // B: TIKET ID
                deskripsi,              // C: DESCRIPTION
                sto || '',              // D: STO (DATA BARU)
                '',                     // E: GAMAS
                '',                     // F: GAUL
                formatDate(tiket_time), // G: ACTUAL START
                formatDate(close_time), // H: ACTUAL CLOSED
                '',                     // I: MTTR REG
                '',                     // J: C / NC
                technician_full,        // K: Teknisi (Lensa + Partner)
                'CLOSED',               // L: TICKET OLO (Status)
                root_cause,             // M: ROOT CAUSE
                ''                  // N: ACTION
            ];
        }

        // 5. EKSEKUSI UPDATE KE BARIS SPESIFIK
        const updateRange = `${sheetName}!A${nextRow}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [rowValues],
            },
        });

        console.log(`✅ [GSheet] Sukses input ${id_tiket} ke Tab ${sheetName} di Baris ${nextRow}`);
        return true;

    } catch (error) {
        console.error('❌ [GSheet] Gagal input:', error.message);
        return false; 
    }
}