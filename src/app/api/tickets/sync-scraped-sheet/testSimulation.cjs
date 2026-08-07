const path = require('path');
const fs = require('fs');

const rootDir = process.cwd();
const { google } = require(path.join(rootDir, 'node_modules', 'googleapis'));

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
        if (summaryUpper.includes('QUALITY')) return 'QUALITY';
        return 'NON-GAMAS';
    }
    if (subcategory === 'TSEL') {
        if (summaryUpper.includes('CRITICAL')) return 'CRITICAL';
        if (summaryUpper.includes('MAJOR')) return 'MAJOR';
        if (summaryUpper.includes('MINOR')) return 'MINOR';
        if (summaryUpper.includes('LOW')) return 'LOW';
        if (summaryUpper.includes('PREMIUM')) return 'PREMIUM';
        if (summaryUpper.includes('CNQ')) return 'CNQ';
        if (rawPriority && rawPriority.trim() !== '') return rawPriority.trim().toUpperCase();
        return 'LOW';
    }
    return rawPriority || null;
}

async function testSimulation() {
  try {
    console.log("=== MEMULAI SIMULASI PENARIKAN DATA SINKRONISASI ===");
    const saPath = path.join(rootDir, 'service-account.json');
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: sa.client_email, private_key: sa.private_key },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const SPREADSHEET_ID = '15JQXtM0p_pXIyYzuuV7tdC0mdIR75ZVvQtSXh1Zztp0';
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'MainSheet!A1:FF',
    });

    const data = res.data.values;
    const headers = data[0];
    const rows = data.slice(1);

    const getVal = (row, name) => {
        const idx = headers.indexOf(name);
        return idx !== -1 && row[idx] !== undefined ? String(row[idx]).trim() : '';
    };

    let syncedCount = 0;
    let skippedCount = 0;
    let sampleResults = [];

    for (const row of rows) {
        const incident = getVal(row, 'INCIDENT');
        if (!incident) continue;

        const summary = getVal(row, 'SUMMARY');
        const reportedBy = getVal(row, 'REPORTED BY').toUpperCase();
        const layanan = (getVal(row, 'LAYANAN') || getVal(row, 'LAYANAN NEW') || '').toUpperCase();
        const customerSegment = getVal(row, 'CUSTOMER SEGMENT').toUpperCase();
        const rawPriority = getVal(row, 'REPORTED PRIORITY');
        const reportedDateStr = getVal(row, 'REPORTED DATE');
        const witel = getVal(row, 'WITEL');
        const workzone = getVal(row, 'WORKZONE');

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

        syncedCount++;
        if (sampleResults.length < 5) {
            sampleResults.push({
                incident, subcategory, priority, tiketTime, witel, workzone
            });
        }
    }

    console.log(`✅ Simulasi Selesai!`);
    console.log(`📊 Total tiket yang akan di-sync (TSEL & OLO): ${syncedCount}`);
    console.log(`⏩ Total baris yang dilewati (Bukan TSEL/OLO): ${skippedCount}`);
    console.log(`\n🔍 Contoh 5 Tiket yang berhasil diproses:`);
    console.table(sampleResults);

  } catch(e) {
    console.error(e);
  }
}
testSimulation();
