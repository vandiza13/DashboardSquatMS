import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
// [PUSHER] 
import { pusherServer } from '@/lib/pusher';

export async function POST(request) {
    const connection = await db.getConnection();
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || (user.role !== 'Admin' && user.role !== 'User')) {
            return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
        }

        const data = await request.json();

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'Data kosong atau format salah.' }, { status: 400 });
        }

        await connection.beginTransaction();

        let insertedCount = 0;
        
        // Loop setiap baris dari Excel
        for (const row of data) {
            // Validasi Field Wajib
            if (!row.id_tiket || !row.category) continue; // Skip jika data vital kosong

            // Konversi Tanggal Excel ke JS Date (Opsional, jaga-jaga format number excel)
            let ticketTime = new Date();
            if (row.tiket_time) {
                // Handle format string "YYYY-MM-DD HH:mm" atau JS Date standard
                ticketTime = new Date(row.tiket_time);
                if (isNaN(ticketTime)) ticketTime = new Date(); // Fallback jika format ngaco
            }

            // INSERT DATA (Termasuk Priority & TACC)
            await connection.query(
                `INSERT INTO tickets 
                (id_tiket, category, subcategory, tiket_time, deskripsi, sto, priority, id_tiket_tacc, status, created_by_user_id, updated_by_user_id, last_update_time) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, NOW())`,
                [
                    row.id_tiket,
                    row.category,
                    row.subcategory || '-',
                    ticketTime,
                    row.deskripsi || '-',
                    row.sto || null,
                    row.priority || null,      // [BARU]
                    row.id_tiket_tacc || null, // [BARU]
                    user.userId,
                    user.userId
                ]
            );

            // Insert History Awal
            const [res] = await connection.query('SELECT LAST_INSERT_ID() as id');
            const ticketId = res[0].id;
            
            await connection.query(
                `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())`,
                [ticketId, 'Import massal via Excel', user.username]
            );

            insertedCount++;
        }

        await connection.commit();

        // [PUSHER] Trigger notifikasi (Cukup sekali "Bulk Import" agar tidak spam suara)
        try {
            if (insertedCount > 0) {
                await pusherServer.trigger('dashboard-channel', 'ticket-update', {
                    message: `${insertedCount} tiket baru diimport`,
                    type: 'NEW_TICKET', // Gunakan tipe ini agar suara "Ting!" bunyi
                    count: insertedCount
                });
            }
        } catch (err) {
            console.error("Pusher Bulk Error:", err);
        }

        return NextResponse.json({ message: 'Import berhasil', inserted: insertedCount });

    } catch (error) {
        await connection.rollback();
        console.error("Bulk Import Error:", error);
        
        // Handle Error Duplicate
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Terdapat ID Tiket yang duplikat dalam database.' }, { status: 400 });
        }
        
        return NextResponse.json({ error: 'Gagal import: ' + error.message }, { status: 500 });
    } finally {
        connection.release();
    }
}