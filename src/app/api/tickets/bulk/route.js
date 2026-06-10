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

        if (!user || !['SuperAdmin', 'Admin', 'User'].includes(user.role)) {
            return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
        }

        // --- [PERBAIKAN UTAMA DISINI] ---
        const body = await request.json();

        // Kita dukung 2 format: Array langsung [...] ATAU Object { tickets: [...] }
        // Ini menjaga kompatibilitas dengan MultiTicketModal & BulkTicketModal
        const data = Array.isArray(body) ? body : (body.tickets || []);

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'Data kosong atau format salah.' }, { status: 400 });
        }
        // --------------------------------

        await connection.beginTransaction();

        let insertedCount = 0;

        // Loop setiap baris
        for (const row of data) {
        // Validasi Field Wajib (ID & Kategori)
            if (!row.id_tiket || !row.category) continue;

            const allowedCategoriesMap = {
                SQUAT: ['SQUAT'],
                MS: ['MTEL', 'UMT', 'CENTRATAMA'],
                ALL: ['SQUAT', 'MTEL', 'UMT', 'CENTRATAMA']
            };

            const currentDivision = user.division || 'SQUAT';
            if (user.role !== 'SuperAdmin' && currentDivision !== 'ALL') {
                const allowedCategories = allowedCategoriesMap[currentDivision] || [];
                if (!allowedCategories.includes(row.category)) {
                    continue; // Skip tiket yang tidak sesuai divisinya
                }
            }

            // Konversi Tanggal (Prevent Invalid Date)
            let ticketTime = new Date();
            if (row.tiket_time) {
                const parsed = new Date(row.tiket_time);
                if (!isNaN(parsed)) ticketTime = parsed;
            }

            // Look up branch if STO is provided
            let finalBranch = row.branch || null;
            if (row.sto) {
                const [mappingRes] = await connection.query('SELECT branch FROM sto_branch_mappings WHERE sto = ?', [row.sto.toUpperCase()]);
                if (mappingRes.length > 0) {
                    finalBranch = mappingRes[0].branch;
                }
            }

            // INSERT DATA
            await connection.query(
                `INSERT INTO tickets 
                (id_tiket, category, subcategory, tiket_time, deskripsi, sto, branch, priority, id_tiket_tacc, status, created_by_user_id, updated_by_user_id, last_update_time) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, NOW())`,
                [
                    row.id_tiket,
                    row.category,
                    row.subcategory || '-',
                    ticketTime,
                    row.deskripsi || '-',
                    row.sto || null,
                    finalBranch,               // Branch
                    row.priority || null,      // Priority (SQUAT)
                    row.id_tiket_tacc || null, // TACC (Provider Lain)
                    user.userId,
                    user.userId
                ]
            );

            // Insert History
            const [res] = await connection.query('SELECT LAST_INSERT_ID() as id');
            const ticketId = res[0].id;

            await connection.query(
                `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())`,
                [ticketId, 'Import massal via Bulk/Excel', user.username]
            );

            insertedCount++;
        }

        await connection.commit();

        // [PUSHER] Trigger notifikasi
        try {
            if (insertedCount > 0) {
                await pusherServer.trigger('dashboard-channel', 'ticket-update', {
                    message: `${insertedCount} tiket baru diimport`,
                    type: 'NEW_TICKET',
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
            return NextResponse.json({ error: 'Gagal: Ada ID Tiket yang duplikat.' }, { status: 400 });
        }

        return NextResponse.json({ error: 'Gagal import: ' + error.message }, { status: 500 });
    } finally {
        connection.release();
    }
}