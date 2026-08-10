import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ExcelJS from 'exceljs';
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get('month'); // Format: YYYY-MM

        if (!monthParam) {
            return NextResponse.json({ error: 'Parameter month diperlukan (YYYY-MM)' }, { status: 400 });
        }

        const year = monthParam.split('-')[0];
        const month = monthParam.split('-')[1];

        // 1. Fetch data directly from DB with joins
        // Filter: Category = SQUAT, Status = CLOSED, and tiket_time in the requested month
        const query = `
            SELECT 
                t.*,
                tech.nik as chief_nik,
                tech.name as chief_name
            FROM tickets t
            LEFT JOIN ticket_technicians tt ON tt.ticket_id = t.id
            LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
            WHERE t.category = 'SQUAT'
              AND t.status = 'CLOSED'
              AND YEAR(t.tiket_time) = ?
              AND MONTH(t.tiket_time) = ?
        `;

        const [rawData] = await db.query(query, [year, month]);

        if (!rawData || rawData.length === 0) {
            return NextResponse.json({ error: 'Tidak ada data tiket SQUAT CLOSED pada bulan tersebut.' }, { status: 404 });
        }

        // 2. STO Mapping Dictionary
        const stoMapping = {
            'BGG': { branch: 'KARAWANG', serviceArea: 'BANTARGEBANG' },
            'DNI': { branch: 'KARAWANG', serviceArea: 'BANTARGEBANG' },
            'GDM': { branch: 'KARAWANG', serviceArea: 'BANTARGEBANG' },
            
            'SUE': { branch: 'KARAWANG', serviceArea: 'SUKARESMI' },
            'CBR': { branch: 'KARAWANG', serviceArea: 'SUKARESMI' },
            'EJI': { branch: 'KARAWANG', serviceArea: 'SUKARESMI' },
            'SMH': { branch: 'KARAWANG', serviceArea: 'SUKARESMI' },
            
            'CIB': { branch: 'KARAWANG', serviceArea: 'CIBITUNG' },
            
            'CIK': { branch: 'KARAWANG', serviceArea: 'CIKARANG' },
            'JBB': { branch: 'KARAWANG', serviceArea: 'CIKARANG' },
            
            'LMA': { branch: 'KARAWANG', serviceArea: 'LEMAHABANG' },
            'STN': { branch: 'KARAWANG', serviceArea: 'LEMAHABANG' },
            'TBL': { branch: 'KARAWANG', serviceArea: 'LEMAHABANG' },
            'MGB': { branch: 'KARAWANG', serviceArea: 'LEMAHABANG' },
            'PBY': { branch: 'KARAWANG', serviceArea: 'LEMAHABANG' },
            'CBG': { branch: 'KARAWANG', serviceArea: 'LEMAHABANG' },
            
            'TAR': { branch: 'KARAWANG', serviceArea: 'TARUMAJAYA' },
            'BBL': { branch: 'KARAWANG', serviceArea: 'TARUMAJAYA' },

            'BEK': { branch: 'BEKASI', serviceArea: 'BEKASI' },
            'PKY': { branch: 'BEKASI', serviceArea: 'PEKAYON' },
            'PDE': { branch: 'BEKASI', serviceArea: 'PONDOKGEDE' },
            'KLB': { branch: 'BEKASI', serviceArea: 'KALIABANG' },
            'KRA': { branch: 'BEKASI', serviceArea: 'KRANJI' },
            'DEP': { branch: 'BEKASI', serviceArea: 'DEPOK' },
            'CNE': { branch: 'BEKASI', serviceArea: 'CINERE' },
            'PCM': { branch: 'BEKASI', serviceArea: 'CINERE' },
            'SKJ': { branch: 'BEKASI', serviceArea: 'SUKMAJAYA' },
            'CSL': { branch: 'BEKASI', serviceArea: 'SUKMAJAYA' }
        };

        const formatDateToWIB = (dateStr) => {
            if (!dateStr) return '';
            return new Date(dateStr).toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' });
        };

        const getJenisOrder = (subcat, priority) => {
            const sub = (subcat || '').toUpperCase();
            const prio = (priority || '').toUpperCase();
            
            if (sub === 'TSEL') {
                if (prio === 'LOW') return 'Tiket NodeB Low';
                if (prio === 'MINOR') return 'Tiket NodeB Minor';
                if (prio === 'MAJOR') return 'Tiket NodeB Major';
                if (prio === 'CRITICAL') return 'Tiket NodeB Critical';
                if (prio === 'PREMIUM') return 'Tiket NodeB Premium';
                if (prio === 'CNQ') return 'Tiket NodeB CNQ';
                return 'Tiket NodeB'; // fallback
            } else if (sub === 'OLO') {
                if (prio === 'NON-GAMAS' || prio === 'NONGAMAS') return 'Tiket OLO Datin Non Gamas';
                if (prio === 'GAMAS') return 'Tiket OLO Datin Gamas';
                if (prio === 'QUALITY') return 'Tiket OLO Datin Quality';
                return 'Tiket OLO Datin'; // fallback
            }
            return '-';
        };

        const extractServiceNumber = (description) => {
            if (!description) return '-';
            // Regex to find service number patterns like BKS120 or 1797005541
            const match = description.match(/([A-Z]{3}\d{3,4}|\d{9,12})/);
            return match ? match[1] : '-';
        };

        // 3. Process Data for Sheet 1 & 2
        const summaryMap = {};
        const detailData = [];

        for (const row of rawData) {
            // Mapping STO
            const stoCode = (row.sto || '').trim().toUpperCase();
            const mapping = stoMapping[stoCode] || { branch: '-', serviceArea: '-' };
            
            // Format Dates
            const createDate = formatDateToWIB(row.tiket_time);
            const closedDate = formatDateToWIB(row.last_update_time);

            // Jenis Order
            const jenisOrder = getJenisOrder(row.subcategory, row.priority);

            // Sheet 2 Data
            detailData.push({
                'Service Number': extractServiceNumber(row.deskripsi),
                'WO Number': '-',
                'Ticket Id': row.id_tiket,
                'Chief': row.chief_nik || '-',
                'GAUL': '-',
                'Guarantee Status': '-',
                'Jenis Order': jenisOrder,
                'Order Type': '-',
                'Create Date(YYYY-MM-DD HH:MM:SS)': createDate,
                'Closed Date(YYYY-MM-DD HH:MM:SS)': closedDate,
                'AREA': 'JABOTABEK JABAR',
                'BRANCH': mapping.branch,
                'SERVICE AREA': mapping.serviceArea
            });

            // Sheet 1 Data Prep
            const nik = row.chief_nik || 'UNKNOWN';
            const name = row.chief_name || 'Tanpa Chief';
            
            if (!summaryMap[nik]) {
                summaryMap[nik] = {
                    nik: nik,
                    name: name,
                    total: 0
                };
            }
            summaryMap[nik].total += 1;
        }

        // Generate Sheet 1 Data
        const TARGET_BOBOT = 176;
        const summaryData = Object.values(summaryMap).map((item) => {
            const bobot = item.total * 4;
            const produktivitas = ((bobot / TARGET_BOBOT) * 100).toFixed(2);
            return {
                'NIK': item.nik,
                'Nama Teknisi': item.name,
                'Jumlah Tiket': item.total,
                'Total Bobot': bobot,
                'Produktivitas (%)': `${produktivitas}%`
            };
        });

        // 4. Create Workbook with ExcelJS
        const workbook = new ExcelJS.Workbook();
        
        // Sheet 1
        const wsSummary = workbook.addWorksheet('Rekap Produktivitas');
        wsSummary.columns = [
            { header: 'NIK', key: 'NIK', width: 15 },
            { header: 'Nama Teknisi', key: 'Nama Teknisi', width: 25 },
            { header: 'Jumlah Tiket', key: 'Jumlah Tiket', width: 15 },
            { header: 'Total Bobot', key: 'Total Bobot', width: 15 },
            { header: 'Produktivitas (%)', key: 'Produktivitas (%)', width: 20 }
        ];
        
        wsSummary.addRows(summaryData);
        
        // Style Header
        wsSummary.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF92D050' } // Hijau muda standar
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Sheet 2
        const wsDetail = workbook.addWorksheet('Data Tiket Detail');
        wsDetail.columns = [
            { header: 'Service Number', key: 'Service Number', width: 15 },
            { header: 'WO Number', key: 'WO Number', width: 15 },
            { header: 'Ticket Id', key: 'Ticket Id', width: 20 },
            { header: 'Chief', key: 'Chief', width: 15 },
            { header: 'GAUL', key: 'GAUL', width: 10 },
            { header: 'Guarantee Status', key: 'Guarantee Status', width: 20 },
            { header: 'Jenis Order', key: 'Jenis Order', width: 25 },
            { header: 'Order Type', key: 'Order Type', width: 15 },
            { header: 'Create Date(YYYY-MM-DD HH:MM:SS)', key: 'Create Date(YYYY-MM-DD HH:MM:SS)', width: 30 },
            { header: 'Closed Date(YYYY-MM-DD HH:MM:SS)', key: 'Closed Date(YYYY-MM-DD HH:MM:SS)', width: 30 },
            { header: 'AREA', key: 'AREA', width: 20 },
            { header: 'BRANCH', key: 'BRANCH', width: 15 },
            { header: 'SERVICE AREA', key: 'SERVICE AREA', width: 20 }
        ];

        wsDetail.addRows(detailData);

        wsDetail.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF92D050' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // 5. Output to buffer
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="Laporan_PBS_SQUAT_${year}_${month}.xlsx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

    } catch (error) {
        console.error("Error generating PBS report:", error);
        return NextResponse.json({ error: 'Gagal men-generate laporan PBS: ' + error.message }, { status: 500 });
    }
}
