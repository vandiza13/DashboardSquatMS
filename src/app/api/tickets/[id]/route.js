import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { appendTicketToSheet, updateOwnerGroupInScrapeSheet } from '@/lib/googleSheets';
// [PUSHER] 1. Import Pusher Server
import { pusherServer } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

// GET Detail 1 Tiket
export async function GET(request, props) {
    const params = await props.params;
    const { id } = params;

    try {
            const [rows] = await db.query(`
                SELECT t.*, 
                       COALESCE(MAX(u.display_name), MAX(u.username)) as updater_name,
                       MAX(tt.technician_nik) as technician_nik,
                       MAX(tech.name) as technician_name,
                       MAX(tech.phone_number) as technician_phone
                FROM tickets t
                LEFT JOIN users u ON t.updated_by_user_id = u.id
                LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id AND tt.role = 'LEAD'
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


// PUT: UPDATE TIKET (UPDATE TACC + PUSHER)
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

        const [oldData] = await connection.query('SELECT status, update_progres, category, material, closed_at FROM tickets WHERE id = ?', [id]);
        if (oldData.length === 0) return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });

        const oldStatus = oldData[0].status;
        const oldProgress = oldData[0].update_progres || '-';
        const oldCategory = oldData[0].category;
        const oldMaterial = oldData[0].material || '';
        let newClosedAt = oldData[0].closed_at;

        if (body.status === 'CLOSED') {
            if (oldStatus !== 'CLOSED' || !newClosedAt) {
                newClosedAt = new Date();
            }
        } else {
            newClosedAt = null;
        }

        // Validasi Edit Tiket CLOSED
        if (oldStatus === 'CLOSED' && user.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Akses ditolak: Hanya Super Admin yang diperbolehkan mengubah tiket yang sudah CLOSED.' }, { status: 403 });
        }

        // Validasi Edit Lintas Divisi
        const allowedCategoriesMap = {
            SQUAT: ['SQUAT'],
            MS: ['MTEL', 'UMT', 'CENTRATAMA'],
            ALL: ['SQUAT', 'MTEL', 'UMT', 'CENTRATAMA']
        };

        if (user.role !== 'SuperAdmin' && user.division !== 'ALL') {
            const allowedCategories = allowedCategoriesMap[user.division] || [];
            if (!allowedCategories.includes(oldCategory)) {
                return NextResponse.json({ error: `Akses ditolak: Anda hanya bisa mengedit tiket kategori divisi ${user.division}.` }, { status: 403 });
            }
        }

        await connection.beginTransaction();

        // 1. Update Tabel Tiket
        await connection.query(
            `UPDATE tickets SET 
                category = ?, 
                subcategory = ?, 
                priority = ?, 
                id_tiket = ?, 
                id_tiket_tacc = ?, 
                sto = ?,
                branch = ?,
                tiket_time = ?, 
                deskripsi = ?, 
                status = ?, 
                update_progres = ?, 
                updated_by_user_id = ?, 
                last_update_time = NOW(), 
                partner_technicians = ?,
                material = ?,
                closed_at = ?
            WHERE id = ?`,
            [
                body.category,
                body.subcategory,
                body.priority || null,
                body.id_tiket,
                body.id_tiket_tacc || null,
                body.sto || null,
                body.branch || null,
                body.tiket_time,
                body.deskripsi,
                body.status,
                body.update_progres,
                user.userId,
                body.partner_technicians || null,
                body.material || null,
                newClosedAt,
                id
            ]
        );

        // 2. Update Teknisi
        let picName = '';
        let picPhone = '';
        let isNewTechnician = false; // Flag untuk Lensa Telegram

        if (body.technician_niks && Array.isArray(body.technician_niks) && body.technician_niks.length > 0) {
            const newNik = body.technician_niks[0];

            // Cek teknisi lama sebelum dihapus untuk mendeteksi perubahan assign atau retry yang gagal
            if (newNik) {
                const [oldTechs] = await connection.query("SELECT technician_nik, lensa_status FROM ticket_technicians WHERE ticket_id = ? AND role = 'LEAD'", [id]).catch(() => {
                    // Fallback if lensa_status column doesn't exist yet to avoid deadlock
                    return connection.query("SELECT technician_nik FROM ticket_technicians WHERE ticket_id = ? AND role = 'LEAD'", [id]).catch(() => [[]]);
                });
                const oldTech = oldTechs && oldTechs[0];
                
                // Jika teknisi baru atau berbeda
                if (!oldTech || oldTech.technician_nik !== newNik) {
                    isNewTechnician = true;
                } else if (oldTech.lensa_status !== undefined && oldTech.lensa_status !== 'SUCCESS') {
                    // Jika teknisi sama tapi sebelumnya gagal, retry!
                    isNewTechnician = true;
                }
            }

            await connection.query('DELETE FROM ticket_technicians WHERE ticket_id = ?', [id]);

            if (newNik) {
                await connection.query("INSERT INTO ticket_technicians (ticket_id, technician_nik, role) VALUES (?, ?, 'LEAD')", [id, newNik]);

                const [techRows] = await connection.query('SELECT name, phone_number FROM technicians WHERE nik = ?', [newNik]);
                if (techRows.length > 0) {
                    picName = techRows[0].name;
                    picPhone = techRows[0].phone_number;
                }
            }

            if (body.partner_niks && Array.isArray(body.partner_niks) && body.partner_niks.length > 0) {
                for (const pNik of body.partner_niks) {
                    if (pNik) {
                        await connection.query("INSERT INTO ticket_technicians (ticket_id, technician_nik, role) VALUES (?, ?, 'PARTNER')", [id, pNik]);
                    }
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
        if (body.material && body.material !== oldMaterial) historyNote.push(`Update Material Pekerjaan`);
        if (historyNote.length === 0) historyNote.push('Melakukan update detail tiket');

        const [userRows] = await connection.query('SELECT display_name, username FROM users WHERE id = ?', [user.userId]);
        const updaterDisplayName = userRows.length > 0 ? (userRows[0].display_name || userRows[0].username) : user.username;

        await connection.query(
            `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())`,
            [id, historyNote.join('. '), updaterDisplayName]
        );

        // Commit transaksi DB dulu
        await connection.commit();

        // [TELEGRAM] Integrasi Lensa Bot (Send /assign message)
        // Hanya dikirim jika ada teknisi baru yang di-assign (bukan update biasa) dan kategori SQUAT
        const telegramNik = (body.technician_niks && body.technician_niks.length > 0) ? body.technician_niks[0] : null;

        let lensaMessage = '';
        if (isNewTechnician && telegramNik && body.category === 'SQUAT') {
            const lensaApiUrl = process.env.LENSA_API_URL || 'http://36.93.188.82:8347/ambil';

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout

                const res = await fetch(lensaApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        incident: body.id_tiket,
                        em: telegramNik
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!res.ok) {
                    console.error(">>> Lensa API Error HTTP Status:", res.status);
                    lensaMessage = ' (TAPI Assign Lensa GAGAL)';
                    await db.query("UPDATE ticket_technicians SET lensa_status = ? WHERE ticket_id = ? AND role = 'LEAD'", ['FAILED', id]).catch(() => {});
                } else {
                    console.log(`>>> Lensa Assign Berhasil untuk tiket ${body.id_tiket} ke teknisi ${telegramNik}`);
                    lensaMessage = ' & Assign Lensa SUKSES';
                    await db.query("UPDATE ticket_technicians SET lensa_status = ? WHERE ticket_id = ? AND role = 'LEAD'", ['SUCCESS', id]).catch(() => {});
                }
            } catch (lensaErr) {
                console.error(">>> Failed to hit Lensa API:", lensaErr.message);
                lensaMessage = ' (TAPI API Lensa Down/Timeout)';
                await db.query("UPDATE ticket_technicians SET lensa_status = ? WHERE ticket_id = ? AND role = 'LEAD'", ['FAILED', id]).catch(() => {});
            }
        }

        // [PUSHER] 2. Kirim Notifikasi Edit (PUT)
        try {
            await pusherServer.trigger('dashboard-channel', 'ticket-update', {
                message: `Tiket ${body.id_tiket} telah diupdate`,
                type: 'UPDATE_TICKET',
                ticketId: id,
                status: body.status
            });
        } catch (pusherError) {
            console.error(">>> PUSHER UPDATE ERROR:", pusherError);
        }

        // 4. INTEGRASI GOOGLE SHEET
        if (body.status === 'CLOSED' && oldStatus !== 'CLOSED') {
            console.log("🛠️ Upload ke Google Sheet...");
            let fullTechInfo = picName ? `${picName} (${picPhone || '-'})` : 'Belum Assign';
            if (body.partner_technicians) fullTechInfo += ` | Partner: ${body.partner_technicians}`;

            const sheetData = {
                category: body.category,
                subcategory: body.subcategory,
                priority: body.priority,
                id_tiket: body.id_tiket,
                id_tiket_tacc: body.id_tiket_tacc,
                deskripsi: body.deskripsi,
                sto: body.sto,
                branch: body.branch,
                tiket_time: body.tiket_time,
                close_time: new Date().toISOString(),
                root_cause: body.update_progres,
                technician_full: fullTechInfo,
                material: body.material
            };

            try {
                await appendTicketToSheet(sheetData);
                await updateOwnerGroupInScrapeSheet(body.id_tiket);
            } catch (sheetError) {
                console.error("❌ Exception Google Sheet:", sheetError);
            }
        }

        return NextResponse.json({ message: `Berhasil update tiket${lensaMessage}` });

    } catch (error) {
        await connection.rollback();
        console.error("Update Error:", error);
        return NextResponse.json({ error: 'Gagal update tiket' }, { status: 500 });
    } finally {
        connection.release();
    }
}

// DELETE: HAPUS TIKET (DENGAN PUSHER)
export async function DELETE(request, props) {
    const params = await props.params;
    const { id } = params;

    const connection = await db.getConnection();
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || user.role !== 'SuperAdmin') {
            return NextResponse.json({ error: 'Akses ditolak. Hanya Super Admin yang bisa menghapus tiket permanen.' }, { status: 403 });
        }

        await connection.beginTransaction();
        await connection.query('DELETE FROM ticket_technicians WHERE ticket_id = ?', [id]);
        await connection.query('DELETE FROM ticket_history WHERE ticket_id = ?', [id]);
        await connection.query('DELETE FROM tickets WHERE id = ?', [id]);
        await connection.commit();

        // [PUSHER] 3. Kirim Notifikasi Hapus (DELETE)
        try {
            await pusherServer.trigger('dashboard-channel', 'ticket-update', {
                message: `Sebuah tiket telah dihapus`,
                type: 'DELETE_TICKET',
                ticketId: id
            });
        } catch (pusherError) {
            console.error(">>> PUSHER DELETE ERROR:", pusherError);
        }

        return NextResponse.json({ message: 'Tiket dihapus permanen' });
    } catch (error) {
        await connection.rollback();
        return NextResponse.json({ error: 'Gagal hapus tiket' }, { status: 500 });
    } finally {
        connection.release();
    }
}