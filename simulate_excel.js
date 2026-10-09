import XLSX from 'xlsx';

const SQUAT_COLUMN_CANDIDATES = {
    id: ['Incident', 'Incident ID', 'Incident_ID', 'ID Tiket', 'Ticket ID', 'No Tiket', 'id_tiket', 'Nomor TT'],
    ttr: ['TTR_Finale', 'TTR Finale', 'TTR', 'TTR_Customer', 'TTR Customer', 'ttr_finale', 'TTR NET (Jam)', 'TTR NET'],
    close_time: ['c_resolve_date', 'Resolve Date', 'c_resolve_time', 'c_close_date', 'Closed Date', 'Req Close', 'Req Close Time', 'Close Time', 'closed_at'],
    impacted_sites: ['total impacted site (manual)', 'total impacted site', 'impacted sites', 'impacted site', 'impacted_site'],
    outage_hours: ['total outage (manual)', 'total outage', 'outage hours', 'outage']
};

const findMatchingColumn = (row, candidates) => {
    if (!row) return null;
    const rowKeys = Object.keys(row);
    for (const cand of candidates) {
        const found = rowKeys.find(k => k.trim().toLowerCase() === cand.toLowerCase());
        if (found) return found;
    }
    return null;
};

try {
    const workbook = XLSX.readFile('C:\\Users\\Hp\\Downloads\\Export Datatable Insera Closed(1).xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); // Use defval to ensure all keys exist
    
    if (data.length > 0) {
        const firstRow = data[0];
        
        const idCol = findMatchingColumn(firstRow, SQUAT_COLUMN_CANDIDATES.id);
        const ttrCol = findMatchingColumn(firstRow, SQUAT_COLUMN_CANDIDATES.ttr);
        const closeTimeCol = findMatchingColumn(firstRow, SQUAT_COLUMN_CANDIDATES.close_time);
        const impactedCol = findMatchingColumn(firstRow, SQUAT_COLUMN_CANDIDATES.impacted_sites);
        const outageCol = findMatchingColumn(firstRow, SQUAT_COLUMN_CANDIDATES.outage_hours);

        console.log("Matched Columns:");
        console.log({ idCol, ttrCol, closeTimeCol, impactedCol, outageCol });
        
        const mappedData = data.slice(0, 1).map(row => ({
            id_tiket: String(row[idCol]).trim(),
            ttr: row[ttrCol] !== undefined ? String(row[ttrCol]).trim() : '0',
            close_time: closeTimeCol && row[closeTimeCol] ? String(row[closeTimeCol]).trim() : null,
            impacted_sites: impactedCol && row[impactedCol] !== undefined ? String(row[impactedCol]).trim() : null,
            outage_hours: outageCol && row[outageCol] !== undefined ? String(row[outageCol]).trim() : null
        }));
        
        console.log("Sample Mapped Data:");
        console.log(mappedData[0]);
    }
} catch(err) {
    console.error("Error:", err);
}
