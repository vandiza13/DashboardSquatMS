import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
// [PUSHER] 1. Import Pusher Server
import { pusherServer } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

// --- GET: AMBIL DATA TIKET (TETAP SAMA) ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'ALL';
    const categoryFilter = searchParams.get('category') || 'ALL';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT 
                t.*, 
                COALESCE(MAX(u.display_name), MAX(u.username)) as updater_name,
                GROUP_CONCAT(tt.technician_nik) as assigned_technician_niks,
                MAX(tech.name) as technician_name,
                MAX(tech.phone_number) as technician_phone
            FROM tickets t
            LEFT JOIN users u ON t.updated_by_user_id = u.id
            LEFT JOIN ticket_technicians tt ON t.id = tt.ticket_id
            LEFT JOIN technicians tech ON tt.technician_nik = tech.nik
            WHERE 1=1
        `;

        const queryParams = [];

        if (search) {
            query += ` AND (t.id_tiket LIKE ? OR t.deskripsi LIKE ? OR t.category LIKE ? OR t.id_tiket_tacc LIKE ?)`;
            const likeTerm = `%${search}%`;
            queryParams.push(likeTerm, likeTerm, likeTerm, likeTerm);
        }

        if (statusFilter === 'RUNNING') {
            query += ` AND t.status IN ('OPEN', 'SC')`;
        } else if (statusFilter === 'CLOSED') {
            query += ` AND t.status = 'CLOSED'`;
        } else if (statusFilter && statusFilter !== 'ALL') {
            query += ` AND t.status = ?`;
            queryParams.push(statusFilter);
        }

        if (categoryFilter && categoryFilter !== 'ALL') {
            query += ` AND t.category = ?`;
            queryParams.push(categoryFilter);
        }

        if (startDate && endDate) {
            query += ` AND DATE(t.tiket_time) BETWEEN ? AND ?`;
            queryParams.push(startDate, endDate);
        }

        query += ` GROUP BY t.id ORDER BY t.tiket_time DESC`;

        if (limit < 10000) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(limit, offset);
        }

        const [tickets] = await db.query(query, queryParams);

        let countQuery = `SELECT COUNT(*) as total FROM tickets t WHERE 1=1`;
        const countParams = [];

        if (search) {
            countQuery += ` AND (t.id_tiket LIKE ? OR t.deskripsi LIKE ? OR t.category LIKE ? OR t.id_tiket_tacc LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (statusFilter === 'RUNNING') countQuery += ` AND t.status IN ('OPEN', 'SC')`;
        else if (statusFilter === 'CLOSED') countQuery += ` AND t.status = 'CLOSED'`;
        else if (statusFilter && statusFilter !== 'ALL') {
            countQuery += ` AND t.status = ?`;
            countParams.push(statusFilter);
        }
        if (categoryFilter && categoryFilter !== 'ALL') {
            countQuery += ` AND t.category = ?`;
            countParams.push(categoryFilter);
        }
        if (startDate && endDate) {
            countQuery += ` AND DATE(t.tiket_time) BETWEEN ? AND ?`;
            countParams.push(startDate, endDate);
        }

        const [totalRows] = await db.query(countQuery, countParams);

        return NextResponse.json({
            data: tickets,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil((totalRows[0]?.total || 0) / limit),
                totalItems: totalRows[0]?.total || 0,
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
            technician_niks, partner_technicians, sto, branch,
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
        if (sto) {
            const [mappingRes] = await connection.query('SELECT branch FROM sto_branch_mappings WHERE sto = ?', [sto.toUpperCase()]);
            if (mappingRes.length > 0) {
                finalBranch = mappingRes[0].branch;
            }
        }

        const [result] = await connection.query(
            `INSERT INTO tickets 
            (category, subcategory, priority, id_tiket, id_tiket_tacc, tiket_time, deskripsi, status, created_by_user_id, updated_by_user_id, last_update_time, partner_technicians, sto, branch) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, NOW(), ?, ?, ?)`,
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
                finalBranch
            ]
        );

        const ticketId = result.insertId;

        if (technician_niks && Array.isArray(technician_niks) && technician_niks.length > 0) {
            const nik = technician_niks[0];
            if (nik) {
                await connection.query('INSERT INTO ticket_technicians (ticket_id, technician_nik) VALUES (?, ?)', [ticketId, nik]);
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

        return NextResponse.json({ message: 'Tiket berhasil dibuat', ticketId }, { status: 201 });

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