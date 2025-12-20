import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PERHATIKAN: Nama fungsi harus 'GET' (Huruf Besar Semua)
// Jangan gunakan 'export default', tapi 'export async function'
export async function GET() {
  try {
    // Coba query simple
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Koneksi Database Berhasil!', 
      testData: rows[0] 
    });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Gagal koneksi database', 
      error: error.message 
    }, { status: 500 });
  }
}