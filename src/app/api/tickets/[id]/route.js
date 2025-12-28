import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { appendTicketToSheet } from '@/lib/googleSheets'; // <--- 1. IMPORT HELPER

export const dynamic = 'force-dynamic';

// GET Detail 1 Tiket
export async function GET(request, props) {
    const params = await props.params; 
    const { id } = params;

    try {
        // --- 2. UPDATE QUERY GET (Agar dapat Nama & No HP Teknisi) ---
        const [rows] = await db.query(`
            SELECT t.*, 
                   u.username as updater_name,
                   GROUP_CONCAT(tt.technician_nik) as assigned_technician_niks,
                   tech.name as technician_name,
                   tech.phone_number as technician_phone
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

        // --- PROTEKSI ROLE EDIT ---
        if (!user || user.role === 'View') {
            return NextResponse.json({ error: 'Akses ditolak. Role View tidak bisa mengedit.' }, { status: 403 });
        }

        const body = await request.json();
        
        // Ambil data lama (Untuk history & Cek perubahan status)
        const [oldData] = await connection.query('SELECT status, update_progres FROM tickets WHERE id = ?', [id]);
        if (oldData.length === 0) return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });
        
        const oldStatus = oldData[0].status;
        const oldProgress = oldData[0].update_progres || '-';

        // === MULAI TRANSAKSI ===
        await connection.beginTransaction();

        // 1. Update Tabel Tiket (TAMBAH STO)
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
                body.sto || null, // <--- UPDATE KOLOM STO
                id
            ]
        );

        // 2. Update Teknisi
        let picName = '';  // Variabel untuk menyimpan Nama PIC (ke Excel)
        let picPhone = ''; // Variabel untuk menyimpan HP PIC (ke Excel)

        // Skenario A: Ada update teknisi dari Client (Dropdown berubah)
        if (body.technician_niks && Array.isArray(body.technician_niks) && body.technician_niks.length > 0) {
            await connection.query('DELETE FROM ticket_technicians WHERE ticket_id = ?', [id]);
            
            const nik = body.technician_niks[0];
            if(nik) {
                await connection.query('INSERT INTO ticket_technicians (ticket_id, technician_nik) VALUES (?, ?)', [id, nik]);
                
                // Ambil info teknisi BARU untuk Sheet
                const [techRows] = await connection.query('SELECT name, phone_number FROM technicians WHERE nik = ?', [nik]);
                if (techRows.length > 0) {
                    picName = techRows[0].name;
                    picPhone = techRows[0].phone_number;
                }
            }
        } 
        // Skenario B: Tidak ada update teknisi, tapi Tiket CLOSED. 
        // Kita harus ambil teknisi eksisting di DB agar tidak "Belum Assign" di Sheet.
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
            `INSERT INTO ticket_history 
            (ticket_id, change_details, changed_by, change_timestamp) 
            VALUES (?, ?, ?, NOW())`,
            [id, historyNote.join('. '), user.username]
        );

        // === COMMIT ===
        await connection.commit();

        // ==============================================================
        // 4. INTEGRASI GOOGLE SHEET (HANYA JIKA CLOSED & BUKAN DARI CLOSED SEBELUMNYA)
        // ==============================================================
        if (body.status === 'CLOSED' && oldStatus !== 'CLOSED') {
            console.log("🛠️ Memulai proses upload ke Google Sheet...");

            // Format Teknisi: "Budi (0812) | Partner: Asep (0856)"
            let fullTechInfo = picName ? `${picName} (${picPhone || '-'})` : 'Belum Assign';
            
            if (body.partner_technicians) {
                fullTechInfo += ` | Partner: ${body.partner_technicians}`;
            }

            const sheetData = {
                category: body.category,       // SQUAT
                subcategory: body.subcategory, // TSEL / OLO
                id_tiket: body.id_tiket,
                deskripsi: body.deskripsi,
                sto: body.sto,                 // <--- KIRIM STO KE HELPER
                tiket_time: body.tiket_time,   
                close_time: new Date().toISOString(), 
                root_cause: body.update_progres,      
                technician_full: fullTechInfo
            };

            // [PERBAIKAN] Tambahkan 'await' agar Vercel tidak mematikan proses
            try {
                await appendTicketToSheet(sheetData);
                console.log("✅ Berhasil upload ke Google Sheet");
            } catch (sheetError) {
                console.error("❌ Exception Google Sheet:", sheetError);
                // Kita tidak throw error agar response ke user tetap sukses
            }
        }
        // ==============================================================

        return NextResponse.json({ message: 'Berhasil update tiket' });

    } catch (error) {
        await connection.rollback();
        console.error("Update Error:", error);
        return NextResponse.json({ error: 'Gagal update tiket' }, { status: 500 });
    } finally {
        connection.release();
    }
}

// DELETE: HAPUS TIKET (TRANSACTIONAL)
export async function DELETE(request, props) {
    const params = await props.params; 
    const { id } = params;

    const connection = await db.getConnection();
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        // --- PROTEKSI ROLE HAPUS ---
        if (!user || user.role !== 'Admin') {
            return NextResponse.json({ error: 'Akses ditolak. Hanya Admin yang bisa menghapus tiket.' }, { status: 403 });
        }

        // === MULAI TRANSAKSI ===
        await connection.beginTransaction();

        // Hapus bertahap (Teknisi -> History -> Tiket) agar bersih
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