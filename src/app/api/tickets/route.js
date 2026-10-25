import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
// [PUSHER] 1. Import Pusher Server
import { pusherServer } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

// --- GET: AMBIL DATA TIKET (OPTIMIZED DENGAN INDEX & PARALLEL QUERY) ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'ALL';
    const categoryFilter = searchParams.get('category') || 'ALL';
    const subcategoryFilter = searchParams.get('subcategory') || 'ALL';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;

    try {
        const whereConditions = [];
        const whereParams = [];

        if (search) {
            whereConditions.push(`(t.id_tiket LIKE ? OR t.deskripsi LIKE ? OR t.category LIKE ? OR t.id_tiket_tacc LIKE ?)`);
            const likeTerm = `%${search}%`;
            whereParams.push(likeTerm, likeTerm, likeTerm, likeTerm);
        }

        if (statusFilter === 'RUNNING') {
            whereConditions.push(`t.status IN ('OPEN', 'SC')`);
        } else if (statusFilter === 'CLOSED') {
            whereConditions.push(`t.status = 'CLOSED'`);
        } else if (statusFilter && statusFilter !== 'ALL') {
            whereConditions.push(`t.status = ?`);
            whereParams.push(statusFilter);
        }

        if (categoryFilter === 'MS') {
            whereConditions.push(`t.category IN ('UMT', 'CENTRATAMA', 'MTEL')`);
        } else if (categoryFilter && categoryFilter !== 'ALL') {
            whereConditions.push(`t.category = ?`);
            whereParams.push(categoryFilter);
        }

        if (subcategoryFilter && subcategoryFilter !== 'ALL') {
            whereConditions.push(`t.subcategory = ?`);
            whereParams.push(subcategoryFilter);
        }

        // Optimasi: SARGable index filter untuk tanggal (menghindari DATE(t.tiket_time))
        if (startDate && endDate) {
            whereConditions.push(`t.tiket_time >= ? AND t.tiket_time < DATE_ADD(?, INTERVAL 1 DAY)`);
            whereParams.push(startDate, endDate);
        } else if (startDate) {
            whereConditions.push(`t.tiket_time >= ?`);
            whereParams.push(startDate);
        } else if (endDate) {
            whereConditions.push(`t.tiket_time < DATE_ADD(?, INTERVAL 1 DAY)`);
            whereParams.push(endDate);
        }

        const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        let tickets = [];
        let totalItems = 0;

        if (limit >= 10000) {
            // Kasus Export: Ambil seluruh tiket langsung
            const exportQuery = `
                SELECT 
                    t.*, 
                    COALESCE(MAX(u.display_name), MAX(u.username)) as updater_name,
                    MAX(tt.technician_nik) as technician_nik,
                    MAX(tech.name) as technician_name,
                    MAX(tech.phone_number) as technician_phone
                FROM tickets t
                LEFT JOIN users u ON t.updated_by_user_id = u.id
                LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id AND tt.role = 'LEAD'
                LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
                ${whereSql}
                GROUP BY t.id
                ORDER BY t.tiket_time DESC
            `;
            const [exportRows] = await db.query(exportQuery, whereParams);
            tickets = exportRows;
            totalItems = exportRows.length;
        } else {
            // Optimasi Two-Step Pagination:
            // 1. Ambil target 10 ID dengan index scan (0-1ms) dan total count secara paralel
            const idQuery = `SELECT t.id FROM tickets t ${whereSql} ORDER BY t.tiket_time DESC LIMIT ? OFFSET ?`;
            const countQuery = `SELECT COUNT(*) as total FROM tickets t ${whereSql}`;

            const [[idRows], [countRows]] = await Promise.all([
                db.query(idQuery, [...whereParams, limit, offset]),
                db.query(countQuery, whereParams)
            ]);

            totalItems = countRows[0]?.total || 0;
            const targetIds = idRows.map(r => r.id);

            // 2. Jika ada ID, ambil detail dan relasi HANYA untuk 10 baris tersebut
            if (targetIds.length > 0) {
                const placeholders = targetIds.map(() => '?').join(',');
                const detailQuery = `
                    SELECT 
                        t.*, 
                        COALESCE(MAX(u.display_name), MAX(u.username)) as updater_name,
                        MAX(tt.technician_nik) as technician_nik,
                        MAX(tech.name) as technician_name,
                        MAX(tech.phone_number) as technician_phone
                    FROM tickets t
                    LEFT JOIN users u ON t.updated_by_user_id = u.id
                    LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id AND tt.role = 'LEAD'
                    LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
                    WHERE t.id IN (${placeholders})
                    GROUP BY t.id
                    ORDER BY t.tiket_time DESC
                `;
                const [detailRows] = await db.query(detailQuery, targetIds);
                tickets = detailRows;
            }
        }

        return NextResponse.json({
            data: tickets,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalItems / limit),
                totalItems,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// --- POST: BUAT TIKET BARU (DENGAN PUSHER) ---
export async function POST(request) {
    const connection = await db.getConnection();
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);

        if (!user || !['SuperAdmin', 'Admin', 'User'].includes(user.role)) {
            return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
        }

        const body = await request.json();

        const {
            category, subcategory, id_tiket, tiket_time, deskripsi,
            technician_niks, partner_technicians, partner_niks, sto, branch,
            priority,
            id_tiket_tacc
        } = body;

        if (!category || !subcategory || !id_tiket) {
            return NextResponse.json({ error: 'Data wajib tidak lengkap' }, { status: 400 });
        }

        // Fallback untuk token versi lama yang belum memiliki division
        const currentRole = user.role || 'User';
        const currentDivision = user.division || 'SQUAT';

        // Validasi Divisi saat Create
        const allowedCategoriesMap = {
            SQUAT: ['SQUAT'],
            MS: ['MTEL', 'UMT', 'CENTRATAMA'],
            ALL: ['SQUAT', 'MTEL', 'UMT', 'CENTRATAMA']
        };

        if (currentRole !== 'SuperAdmin' && currentDivision !== 'ALL') {
            const allowedCategories = allowedCategoriesMap[currentDivision] || [];
            if (!allowedCategories.includes(category)) {
                return NextResponse.json({ error: `Akses ditolak. Divisi ${currentDivision} tidak bisa membuat tiket kategori ${category}.` }, { status: 403 });
            }
        }

        await connection.beginTransaction();

        let finalBranch = branch || null;
        let finalServiceArea = null;
        if (sto) {
            const [mappingRes] = await connection.query('SELECT branch, service_area FROM sto_branch_mappings WHERE sto = ?', [sto.toUpperCase()]);
            if (mappingRes.length > 0) {
                finalBranch = mappingRes[0].branch;
                finalServiceArea = mappingRes[0].service_area;
            }
        }

        const [result] = await connection.query(
            `INSERT INTO tickets 
            (category, subcategory, priority, id_tiket, id_tiket_tacc, tiket_time, deskripsi, status, created_by_user_id, updated_by_user_id, last_update_time, partner_technicians, sto, branch, service_area) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, NOW(), ?, ?, ?, ?)`,
            [
                category,
                subcategory,
                priority || null,
                id_tiket,
                id_tiket_tacc || null,
                tiket_time || new Date(),
                deskripsi || '-',
                user.userId,
                user.userId,
                partner_technicians || null,
                sto || null,
                finalBranch,
                finalServiceArea
            ]
        );

        const ticketId = result.insertId;

        if (technician_niks && Array.isArray(technician_niks) && technician_niks.length > 0) {
            const nik = technician_niks[0];
            if (nik) {
                await connection.query("INSERT INTO ticket_technicians (ticket_id, technician_nik, role) VALUES (?, ?, 'LEAD')", [ticketId, nik]);
            }
        }
        
        if (partner_niks && Array.isArray(partner_niks) && partner_niks.length > 0) {
            for (const pNik of partner_niks) {
                if (pNik) {
                    await connection.query("INSERT INTO ticket_technicians (ticket_id, technician_nik, role) VALUES (?, ?, 'PARTNER')", [ticketId, pNik]);
                }
            }
        }

        const [userRows] = await connection.query('SELECT display_name, username FROM users WHERE id = ?', [user.userId]);
        const updaterDisplayName = userRows.length > 0 ? (userRows[0].display_name || userRows[0].username) : user.username;

        await connection.query(
            `INSERT INTO ticket_history (ticket_id, change_details, changed_by, change_timestamp) VALUES (?, ?, ?, NOW())`,
            [ticketId, `Tiket dibuat dengan status OPEN`, updaterDisplayName]
        );

        // Commit transaksi database dulu
        await connection.commit();

        let lensaMessage = '';
        const telegramNik = (technician_niks && Array.isArray(technician_niks) && technician_niks.length > 0) ? technician_niks[0] : null;
        if (telegramNik && category === 'SQUAT') {
            const lensaApiUrl = process.env.LENSA_API_URL || 'http://36.93.188.84:8793/process';
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout

                const payload = {
                    sto: sto || '',
                    ticket: id_tiket,
                    nik: telegramNik
                };

                const res = await fetch(lensaApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!res.ok) {
                    console.error(">>> Lensa API Error (Create) HTTP Status:", res.status);
                    lensaMessage = ' (TAPI Assign Lensa GAGAL)';
                    await db.query("UPDATE ticket_technicians SET lensa_status = ? WHERE ticket_id = ? AND role = 'LEAD'", ['FAILED', ticketId]).catch(() => {});
                } else {
                    console.log(`>>> Lensa Assign Berhasil (Create) untuk tiket ${id_tiket} ke teknisi ${telegramNik}`);
                    lensaMessage = ' & Assign Lensa SUKSES';
                    await db.query("UPDATE ticket_technicians SET lensa_status = ? WHERE ticket_id = ? AND role = 'LEAD'", ['SUCCESS', ticketId]).catch(() => {});
                }
            } catch (lensaErr) {
                console.error(">>> Failed to hit Lensa API (Create):", lensaErr.message);
                lensaMessage = ' (TAPI API Lensa Down/Timeout)';
                await db.query("UPDATE ticket_technicians SET lensa_status = ? WHERE ticket_id = ? AND role = 'LEAD'", ['FAILED', ticketId]).catch(() => {});
            }
        }

        // [PUSHER] 2. Kirim Notifikasi Realtime SETELAH commit sukses
        try {
            await pusherServer.trigger('dashboard-channel', 'ticket-update', {
                message: `Tiket ${id_tiket} baru saja dibuat`,
                type: 'NEW_TICKET',
                timestamp: new Date().toISOString()
            });
            console.log(">>> Pusher Trigger Sent Successfully!"); // Cek terminal VSCode saat create tiket
        } catch (pusherError) {
            console.error(">>> Pusher Trigger Error:", pusherError);
        }

        // [TELEGRAM BROADCAST] Otomatis kirim ke grup jika kategori SQUAT
        if (category === 'SQUAT') {
            try {
                const { broadcastNewSquatTicket } = await import('@/lib/telegram/broadcast');
                await broadcastNewSquatTicket({
                    id: ticketId,
                    id_tiket,
                    category,
                    subcategory,
                    deskripsi,
                    sto,
                    tiket_time: tiket_time || new Date()
                });
            } catch (teleErr) {
                console.error(">>> Telegram Broadcast Error on Ticket Creation:", teleErr.message);
            }
        }

        return NextResponse.json({ message: `Tiket berhasil dibuat${lensaMessage}`, ticketId }, { status: 201 });

    } catch (error) {
        await connection.rollback();
        console.error("Create Ticket Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'ID Tiket sudah ada' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Gagal membuat tiket: ' + error.message }, { status: 500 });
    } finally {
        connection.release();
    }
}
