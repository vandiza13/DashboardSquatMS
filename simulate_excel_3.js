import XLSX from 'xlsx';
try {
    const workbook = XLSX.readFile('C:\\Users\\Hp\\Downloads\\Export Datatable Insera Closed(1).xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); 
    
    if (data.length > 0) {
        for(let i=0; i<3; i++) {
            console.log(`--- Row ${i} ---`);
            console.log("TTR_Finale:", data[i]['TTR_Finale']);
            console.log("impacted_site:", data[i]['impacted_site']);
            console.log("outage:", data[i]['outage']);
            console.log("-----------------");
        }
    }
} catch(err) {}
