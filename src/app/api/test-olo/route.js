import { NextResponse } from 'next/server';
import { getGoogleAuth } from '@/lib/googleSheets';
import { google } from 'googleapis';

export async function GET() {
    try {
        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID_SCRAPE || '15JQXtM0p_pXIyYzuuV7tdC0mdIR75ZVvQtSXh1Zztp0';
        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'MainSheet!A1:FF150',
        });

        const data = res.data.values;
        if (!data || data.length < 2) return NextResponse.json({ message: 'No data' });

        const headers = data[0];
        const rows = data.slice(1);

        const getVal = (row, name) => {
            const idx = headers.indexOf(name);
            return idx !== -1 && row[idx] !== undefined ? String(row[idx]).trim() : '';
        };

        const results = [];
        for (const row of rows) {
            const layanan = (getVal(row, 'LAYANAN') || getVal(row, 'LAYANAN NEW') || '').toUpperCase();
            const customerSegment = getVal(row, 'CUSTOMER SEGMENT').toUpperCase();
            const reportedBy = getVal(row, 'REPORTED BY').toUpperCase();
            const summary = getVal(row, 'SUMMARY').toUpperCase();

            // Collect anything that looks remotely like OLO or DWS
            if (layanan.includes('OLO') || customerSegment.includes('DWS') || customerSegment.includes('TELKOM INFRACO') || summary.includes('OLO') || summary.includes('DWS')) {
                results.push({
                    INCIDENT: getVal(row, 'INCIDENT'),
                    LAYANAN: layanan,
                    CUSTOMER_SEGMENT: customerSegment,
                    REPORTED_BY: reportedBy,
                    STATUS: getVal(row, 'STATUS')
                });
            }
        }

        return NextResponse.json({ total_found: results.length, data: results });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
