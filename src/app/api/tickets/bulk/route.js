// src/app/api/tickets/bulk/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const connection = await db.getConnection();
    try {
        // 1. Auth Check
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || (user.role !== 'Admin' && user.role !== 'User')) {
            return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
        }

        const body = await request.json();
        const { tickets } = body; // Array tiket dari Excel

        if (!Array.isArray(tickets) || tickets.length === 0) {
            return NextResponse.json({ error: 'Data tiket kosong.' }, { status: 400 });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        await connection.beginTransaction();

        // 2. Loop Insert
        for (const ticket of tickets) {
            try {
                // Validasi dasar
                if (!ticket.id_tiket || !ticket.category || !ticket.subcategory) {
                    throw new Error(`Data tidak lengkap untuk ID: ${ticket.id_tiket || 'Tanpa ID'}`);
                }

                // Cek Duplikat ID di Database
                const [existing] = await connection.query(
                    'SELECT id FROM tickets WHERE id_tiket = ?', 
                    [ticket.id_tiket]
                );

                if (existing.length > 0) {
                    throw new Error(`ID Tiket ${ticket.id_tiket} sudah ada.`);
                }

                // Insert Tiket
                // Format tanggal Excel mungkin perlu disesuaikan, tapi kita asumsikan FE mengirim ISO String
                const [res] = await connection.query(
                    `INSERT INTO tickets 
                    (category, subcategory, id_tiket, tiket_time, deskripsi, status, created_by_user_id, updated_by_user_id, last_update_time, sto) 
                    VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, NOW(), ?)`,
                    [
                        ticket.category,
                        ticket.subcategory,
                        ticket.id_tiket,
                        ticket.tiket_time || new Date(), // Default NOW jika kosong
                        ticket.deskripsi || '-',
                        user.userId,
                        user.userId,
                        ticket.sto || null
                    ]
                );

                const ticketId = res.insertId;

                // Insert History
                await connection.query(
                    `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())`,
                    [ticketId, `Tiket diimport via Bulk Upload`, user.username]
                );

                results.success++;

            } catch (err) {
                results.failed++;
                results.errors.push(err.message);
                // Kita continue agar tiket lain yang valid tetap masuk (Partial Success)
                // Jika ingin "All or Nothing", pindahkan catch ini ke luar loop
            }
        }

        await connection.commit();
        
        return NextResponse.json({ 
            message: `Proses selesai. Sukses: ${results.success}, Gagal: ${results.failed}`,
            details: results
        }, { status: 200 });

    } catch (error) {
        await connection.rollback();
        console.error("Bulk API Error:", error);
        return NextResponse.json({ error: 'Gagal memproses data: ' + error.message }, { status: 500 });
    } finally {
        connection.release();
    }
}