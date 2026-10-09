import XLSX from 'xlsx';
try {
    const workbook = XLSX.readFile('C:\\Users\\Hp\\Downloads\\Export Datatable Insera Closed(1).xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); 
    
    if (data.length > 0) {
        console.log("Values for first row:");
        console.log("impacted_site:", JSON.stringify(data[0]['impacted_site']));
        console.log("ne_site_total:", data[0]['ne_site_total']);
        console.log("first_site_total:", data[0]['first_site_total']);
        console.log("site_down_value:", data[0]['site_down_value']);
        console.log("matched_site:", data[0]['matched_site']);
    }
} catch(err) {}
