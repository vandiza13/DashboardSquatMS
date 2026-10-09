import XLSX from 'xlsx';

try {
    const workbook = XLSX.readFile('C:\\Users\\Hp\\Downloads\\Export Datatable Insera Closed(1).xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert only the first row (headers) to JSON
    const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
    console.log("Headers in Excel:");
    console.log(headers);
} catch(err) {
    console.error("Error reading excel:", err);
}
