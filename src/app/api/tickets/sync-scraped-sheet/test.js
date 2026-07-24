const path = require('path');
const fs = require('fs');

const rootDir = process.cwd();
const { google } = require(path.join(rootDir, 'node_modules', 'googleapis'));

async function testCols() {
  try {
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
      range: 'MainSheet!A1:FF10',
    });

    const headers = res.data.values[0];
    const rows = res.data.values.slice(1);
    const getVal = (row, name) => {
      const idx = headers.indexOf(name);
      return idx !== -1 && row[idx] !== undefined ? String(row[idx]).trim() : '';
    };

    rows.forEach(row => {
      console.log('INCIDENT:', getVal(row, 'INCIDENT'));
      console.log('REPORTED DATE:', getVal(row, 'REPORTED DATE'));
      console.log('---');
    });
  } catch(e) {
    console.error(e);
  }
}
testCols();
