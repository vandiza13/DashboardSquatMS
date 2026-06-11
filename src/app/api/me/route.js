import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const token = request.cookies.get('token')?.value;
    
    // Cek Token
    const user = await verifyJWT(token);
    
    if (!user) {
        return NextResponse.json({ role: 'Guest' }, { status: 401 });
    }
    
    try {
        const [rows] = await db.query(
            'SELECT username, role, division, full_name, display_name FROM users WHERE id = ?',
            [user.userId]
        );
        
        if (rows.length === 0) {
            return NextResponse.json({ role: 'Guest' }, { status: 401 });
        }
        
        const dbUser = rows[0];
        return NextResponse.json({ 
            username: dbUser.username, 
            role: dbUser.role,
            division: dbUser.division,
            full_name: dbUser.full_name,
            display_name: dbUser.display_name
        });
    } catch (error) {
        console.error("GET /api/me error:", error);
        return NextResponse.json({ 
            username: user.username, 
            role: user.role,
            division: user.division,
            full_name: null,
            display_name: null
        });
    }
}