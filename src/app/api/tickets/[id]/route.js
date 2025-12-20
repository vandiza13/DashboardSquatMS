import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET Detail 1 Tiket
export async function GET(request, props) {
    const params = await props.params; // FIX: Await Params
    const { id } = params;

    try {
        const [rows] = await db.query(`
            SELECT t.*, 
                   GROUP_CONCAT(tt.technician_nik) as technician_niks 
            FROM tickets t
            LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
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
    const params = await props.params; // FIX: Await Params
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
        
        // Ambil data lama (Untuk history)
        const [oldData] = await connection.query('SELECT status, update_progres FROM tickets WHERE id = ?', [id]);
        if (oldData.length === 0) return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });
        
        const oldStatus = oldData[0].status;
        const oldProgress = oldData[0].update_progres || '-';

        // === MULAI TRANSAKSI ===
        await connection.beginTransaction();

        // 1. Update Tabel Tiket
        await connection.query(
            `UPDATE tickets SET 
                category = ?, subcategory = ?, id_tiket = ?, tiket_time = ?, deskripsi = ?, 
                status = ?, update_progres = ?, updated_by_user_id = ?, last_update_time = NOW()
            WHERE id = ?`,
            [
                body.category, body.subcategory, body.id_tiket, body.tiket_time, body.deskripsi, 
                body.status, body.update_progres, user.userId, id
            ]
        );

        // 2. Update Teknisi (Hapus lama -> Insert baru)
        if (body.technician_niks) {
            await connection.query('DELETE FROM ticket_technicians WHERE ticket_id = ?', [id]);
            
            if (Array.isArray(body.technician_niks) && body.technician_niks.length > 0) {
                 const nik = body.technician_niks[0];
                 if(nik) {
                    await connection.query('INSERT INTO ticket_technicians (ticket_id, technician_nik) VALUES (?, ?)', [id, nik]);
                 }
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
    const params = await props.params; // FIX: Await Params
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