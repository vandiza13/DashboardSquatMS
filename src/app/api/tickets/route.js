import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// --- GET: AMBIL DATA TIKET (FILTERING & PAGINATION) ---
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
        // Query Utama dengan Join
        let query = `
            SELECT 
                t.*, 
                MAX(u.username) as updater_name,
                -- Ambil 1 Teknisi Utama (Nama & HP)
                (SELECT name FROM technicians tech 
                 JOIN ticket_technicians tt ON tech.nik = tt.technician_nik 
                 WHERE tt.ticket_id = t.id LIMIT 1) as technician_name,
                (SELECT phone_number FROM technicians tech 
                 JOIN ticket_technicians tt ON tech.nik = tt.technician_nik 
                 WHERE tt.ticket_id = t.id LIMIT 1) as technician_phone
            FROM tickets t
            LEFT JOIN users u ON t.updated_by_user_id = u.id
            WHERE 1=1
        `;
        
        const queryParams = [];

        // 1. Filter Search
        if (search) {
            query += ` AND (t.id_tiket LIKE ? OR t.deskripsi LIKE ? OR t.category LIKE ?)`;
            const likeTerm = `%${search}%`;
            queryParams.push(likeTerm, likeTerm, likeTerm);
        }

        // 2. Filter Status
        if (statusFilter === 'RUNNING') {
            query += ` AND t.status IN ('OPEN', 'SC')`;
        } else if (statusFilter === 'CLOSED') {
            query += ` AND t.status = 'CLOSED'`;
        } else if (statusFilter && statusFilter !== 'ALL') {
            query += ` AND t.status = ?`;
            queryParams.push(statusFilter);
        }

        // 3. Filter Kategori
        if (categoryFilter && categoryFilter !== 'ALL') {
            query += ` AND t.category = ?`;
            queryParams.push(categoryFilter);
        }

        // 4. Filter Tanggal
        if (startDate && endDate) {
            query += ` AND DATE(t.tiket_time) BETWEEN ? AND ?`;
            queryParams.push(startDate, endDate);
        }

        // Grouping & Ordering
        query += ` GROUP BY t.id ORDER BY t.tiket_time DESC`;

        // Pagination (Jika limit wajar)
        if (limit < 10000) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(limit, offset);
        }

        const [tickets] = await db.query(query, queryParams);

        // Hitung Total Data (Untuk Pagination Frontend)
        let countQuery = `SELECT COUNT(*) as total FROM tickets t WHERE 1=1`;
        const countParams = [];

        if (search) { 
            countQuery += ` AND (t.id_tiket LIKE ? OR t.deskripsi LIKE ?)`; 
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (statusFilter === 'RUNNING') countQuery += ` AND t.status IN ('OPEN', 'SC')`;
        else if (statusFilter === 'CLOSED') countQuery += ` AND t.status = 'CLOSED'`;
        
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

// --- POST: BUAT TIKET BARU (TRANSACTIONAL) ---
export async function POST(request) {
    const connection = await db.getConnection(); 
    try {
        const token = request.cookies.get('token')?.value;
        const user = await verifyJWT(token);
        
        // --- PROTEKSI ROLE ---
        if (!user || (user.role !== 'Admin' && user.role !== 'User')) {
            return NextResponse.json({ error: 'Akses ditolak. Role View hanya bisa melihat.' }, { status: 403 });
        }

        const body = await request.json();
        const { category, subcategory, id_tiket, tiket_time, deskripsi, technician_niks } = body;

        // Validasi
        if (!category || !subcategory || !id_tiket || !tiket_time || !deskripsi) {
            return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
        }

        // === MULAI TRANSAKSI ===
        await connection.beginTransaction();

        // 1. Insert Tiket
        const [result] = await connection.query(
            `INSERT INTO tickets 
            (category, subcategory, id_tiket, tiket_time, deskripsi, status, created_by_user_id, updated_by_user_id, last_update_time) 
            VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, NOW())`,
            [category, subcategory, id_tiket, tiket_time, deskripsi, user.userId, user.userId]
        );

        const ticketId = result.insertId;

        // 2. Insert Teknisi
        if (technician_niks && Array.isArray(technician_niks) && technician_niks.length > 0) {
            // Kita ambil item pertama saja (Single Tech Logic)
            const nik = technician_niks[0]; 
            if (nik) {
                await connection.query(
                    `INSERT INTO ticket_technicians (ticket_id, technician_nik) VALUES (?, ?)`,
                    [ticketId, nik]
                );
            }
        }

        // 3. Catat History (Wajib pakai NOW() di sini)
        await connection.query(
            `INSERT INTO ticket_history 
            (ticket_id, change_details, changed_by, change_timestamp) 
            VALUES (?, ?, ?, NOW())`,
            [ticketId, `Tiket dibuat dengan status OPEN`, user.username]
        );

        // === SUKSES: COMMIT ===
        await connection.commit();

        return NextResponse.json({ message: 'Tiket berhasil dibuat', ticketId }, { status: 201 });

    } catch (error) {
        // === GAGAL: ROLLBACK ===
        await connection.rollback(); 
        
        console.error("Create Ticket Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'ID Tiket sudah ada' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Gagal membuat tiket: ' + error.message }, { status: 500 });
    } finally {
        connection.release(); // Lepaskan koneksi kembali ke pool
    }
}