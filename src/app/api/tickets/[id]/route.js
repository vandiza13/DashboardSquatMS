import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { appendTicketToSheet } from '@/lib/googleSheets'; 

export const dynamic = 'force-dynamic';

// GET Detail 1 Tiket
export async function GET(request, props) {
    const params = await props.params; 
    const { id } = params;

    try {
        // --- PERBAIKAN QUERY: Tambahkan MAX() untuk menghindari error GROUP BY ---
        const [rows] = await db.query(`
            SELECT t.*, 
                   MAX(u.username) as updater_name,
                   GROUP_CONCAT(tt.technician_nik) as assigned_technician_niks,
                   MAX(tech.name) as technician_name,
                   MAX(tech.phone_number) as technician_phone
            FROM tickets t
            LEFT JOIN users u ON t.updated_by_user_id = u.id
            LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
            LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
            WHERE t.id = ?
            GROUP BY t.id
        `, [id]);

        if (rows.length === 0) return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });
        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error("Detail API Error:", error);
        return NextResponse.json({ error: 'Database Error' }, { status: 500 });
    }
}


// PUT: UPDATE TIKET (TRANSACTIONAL)
export async function PUT(request, props) {
    const params = await props.params; 
    const { id } = params;

    const connection = await db.getConnection();
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || user.role === 'View') {
            return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
        }

        const body = await request.json();
        
        const [oldData] = await connection.query('SELECT status, update_progres FROM tickets WHERE id = ?', [id]);
        if (oldData.length === 0) return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });
        
        const oldStatus = oldData[0].status;
        const oldProgress = oldData[0].update_progres || '-';

        await connection.beginTransaction();

        // 1. Update Tabel Tiket
        await connection.query(
            `UPDATE tickets SET 
                category = ?, subcategory = ?, id_tiket = ?, tiket_time = ?, deskripsi = ?, 
                status = ?, update_progres = ?, updated_by_user_id = ?, last_update_time = NOW(), 
                partner_technicians = ?, sto = ? 
            WHERE id = ?`,
            [
                body.category, body.subcategory, body.id_tiket, body.tiket_time, body.deskripsi, 
                body.status, body.update_progres, user.userId, 
                body.partner_technicians, 
                body.sto || null, 
                id
            ]
        );

        // 2. Update Teknisi
        let picName = '';  
        let picPhone = ''; 

        if (body.technician_niks && Array.isArray(body.technician_niks) && body.technician_niks.length > 0) {
            await connection.query('DELETE FROM ticket_technicians WHERE ticket_id = ?', [id]);
            
            const nik = body.technician_niks[0];
            if(nik) {
                await connection.query('INSERT INTO ticket_technicians (ticket_id, technician_nik) VALUES (?, ?)', [id, nik]);
                
                const [techRows] = await connection.query('SELECT name, phone_number FROM technicians WHERE nik = ?', [nik]);
                if (techRows.length > 0) {
                    picName = techRows[0].name;
                    picPhone = techRows[0].phone_number;
                }
            }
        } 
        else if (body.status === 'CLOSED') {
             const [existingTech] = await connection.query(`
                SELECT t.name, t.phone_number 
                FROM ticket_technicians tt
                JOIN technicians t ON tt.technician_nik = t.nik
                WHERE tt.ticket_id = ? LIMIT 1
            `, [id]);
            
            if (existingTech.length > 0) {
                picName = existingTech[0].name;
                picPhone = existingTech[0].phone_number;
            }
        }

        // 3. Catat History
        let historyNote = [];
        if (oldStatus !== body.status) historyNote.push(`Status berubah: ${oldStatus} ➝ ${body.status}`);
        if (body.update_progres && body.update_progres !== oldProgress) historyNote.push(`Update Progress: "${body.update_progres}"`);
        if (historyNote.length === 0) historyNote.push('Melakukan update detail tiket');

        await connection.query(
            `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())`,
            [id, historyNote.join('. '), user.username]
        );

        await connection.commit();

        // 4. INTEGRASI GOOGLE SHEET
        if (body.status === 'CLOSED' && oldStatus !== 'CLOSED') {
            console.log("🛠️ Upload ke Google Sheet...");
            let fullTechInfo = picName ? `${picName} (${picPhone || '-'})` : 'Belum Assign';
            if (body.partner_technicians) fullTechInfo += ` | Partner: ${body.partner_technicians}`;

            const sheetData = {
                category: body.category,      
                subcategory: body.subcategory, 
                id_tiket: body.id_tiket,
                deskripsi: body.deskripsi,
                sto: body.sto,                
                tiket_time: body.tiket_time,   
                close_time: new Date().toISOString(), 
                root_cause: body.update_progres,      
                technician_full: fullTechInfo
            };

            try {
                await appendTicketToSheet(sheetData);
            } catch (sheetError) {
                console.error("❌ Exception Google Sheet:", sheetError);
            }
        }

        return NextResponse.json({ message: 'Berhasil update tiket' });

    } catch (error) {
        await connection.rollback();
        console.error("Update Error:", error);
        return NextResponse.json({ error: 'Gagal update tiket' }, { status: 500 });
    } finally {
        connection.release();
    }
}

// DELETE: HAPUS TIKET
export async function DELETE(request, props) {
    const params = await props.params; 
    const { id } = params;

    const connection = await db.getConnection();
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || user.role !== 'Admin') {
            return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
        }

        await connection.beginTransaction();
        await connection.query('DELETE FROM ticket_technicians WHERE ticket_id = ?', [id]);
        await connection.query('DELETE FROM ticket_history WHERE ticket_id = ?', [id]);
        await connection.query('DELETE FROM tickets WHERE id = ?', [id]);
        await connection.commit();
        
        return NextResponse.json({ message: 'Tiket dihapus permanen' });
    } catch (error) {
        await connection.rollback();
        return NextResponse.json({ error: 'Gagal hapus tiket' }, { status: 500 });
    } finally {
        connection.release();
    }
}