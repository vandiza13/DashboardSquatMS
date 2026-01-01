import { google } from 'googleapis';

export async function appendTicketToSheet(ticketData) {
    try {
        console.log("🛠️ [GSheet] Memulai proses input...");

        // 1. SETUP AUTH (Aman untuk Vercel)
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                // Handle newlines di Private Key Vercel
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        // Gunakan Env Var atau Fallback ID
        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '19OIHJz9U0KsCpeNcy0faoOuQzIvu6ChsZ4CpZQqOTCw';

        // Destructure Data
        const { category, subcategory, id_tiket, deskripsi, sto, tiket_time, close_time, root_cause, technician_full } = ticketData;

        // ==========================================================
        // 2. TENTUKAN NAMA SHEET (TAB)
        // ==========================================================
        let sheetName = '';

        // Hapus filter 'if (category !== SQUAT)' agar kategori lain bisa masuk

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
            // Centratama (Sub FSI) masuk ke sheet 'FSI'
            // Jika nanti ada sub lain, sesuaikan di sini. Default ke FSI.
            sheetName = 'FSI'; 
        }

        // Validasi: Jika sheetName tidak ditemukan (misal kategori tidak dikenal)
        if (!sheetName) {
            console.log(`⚠️ [GSheet] Skip: Kategori ${category} - ${subcategory} tidak punya Sheet tujuan.`);
            return false;
        }

        // ==========================================================
        // 3. CEK BARIS KOSONG
        // ==========================================================
        // Cek kolom B (ID TIKET) untuk mencari baris kosong terakhir
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!B:B`,
        });

        const rows = response.data.values || [];
        const nextRow = rows.length + 1;
        
        // Nomor Urut: 
        // Asumsi data mulai baris 5 (Header di baris 4), maka Nomor 1 adalah Baris 5.
        // Rumus: Baris Target - 4
        // (Sesuaikan angka 4 ini jika ternyata nomor urutnya meleset)
        const nomorUrut = nextRow - 4; 

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
        // 5. MAPPING DATA (SUSUN KOLOM SESUAI REAL SHEET)
        // ==========================================================
        let rowValues = [];

        if (sheetName === 'TSEL') {
            // Sheet TSEL: A=NO, B=ID, C=Desc, D=STO ... I=Start, J=Close ... N=Status
            rowValues = [
                nomorUrut, id_tiket, deskripsi, sto || '', 
                '', '', '', '', // E-H Kosong (Prio, Gamas, Material, Gaul)
                formatDate(tiket_time), formatDate(close_time), 
                '', '', technician_full, 'CLOSED', root_cause, ''
            ];
        
        } else if (sheetName === 'OLO') {
            // Sheet OLO: A=NO, B=ID, C=Desc, D=STO ... G=Start, H=Close ... L=Status
            rowValues = [
                nomorUrut, id_tiket, deskripsi, sto || '', 
                '', '', // E-F Kosong (Gamas, Gaul)
                formatDate(tiket_time), formatDate(close_time), 
                '', '', technician_full, 'CLOSED', root_cause, ''
            ];

        } else if (sheetName === 'MTEL') {
            // Sheet MTEL: 
            // A=NO, B=ID, C=Desc, D=TTR(Empty), E=JENIS TIKET, F=Start, G=Close, H=Status, I=Teknisi, J=Root, K=Action
            rowValues = [
                nomorUrut,              // A
                id_tiket,               // B
                deskripsi,              // C
                '',                     // D: TTR JAM (Dikosongkan)
                subcategory || '',      // E: JENIS TIKET (TIS/MMP/FIBERISASI)
                formatDate(tiket_time), // F
                formatDate(close_time), // G
                'CLOSED',               // H: STATUS TIKET
                technician_full,        // I: TEKNISI
                root_cause,             // J: ROOT CAUSE
                ''                      // K: ACTION
            ];

        } else if (sheetName === 'UMT' || sheetName === 'FSI') {
            // Sheet UMT & FSI (Centratama):
            // A=NO, B=ID, C=Desc, D=TTR(Empty), E=Start, F=Close, G=Status, H=Teknisi, I=Root, J=Action
            rowValues = [
                nomorUrut,              // A
                id_tiket,               // B
                deskripsi,              // C
                '',                     // D: TTR JAM
                formatDate(tiket_time), // E
                formatDate(close_time), // F
                'CLOSED',               // G: STATUS TIKET
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

        console.log(`✅ [GSheet] SUKSES input ${id_tiket} ke Tab ${sheetName}`);
        return true;

    } catch (error) {
        console.error('❌ [GSheet] Error:', error.message);
        return false; 
    }
}