import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
    const token = request.cookies.get('token')?.value;
    
    // Cek Token
    const user = await verifyJWT(token);
    
    if (!user) {
        return NextResponse.json({ role: 'Guest' }, { status: 401 });
    }
    
    // Kembalikan Role User
    return NextResponse.json({ 
        username: user.username, 
        role: user.role 
    });
}