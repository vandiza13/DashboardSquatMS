import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = await verifyJWT(token);

    if (!user || user.role !== 'SuperAdmin') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya SuperAdmin.' }, { status: 403 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN belum disetting di Environment Variables.' }, { status: 400 });
    }

    // Mendapatkan hostname dari header request
    const headers = new Headers(request.headers);
    const host = headers.get('x-forwarded-host') || headers.get('host');
    const protocol = headers.get('x-forwarded-proto') || 'https';
    
    // Fallback jika development local (ngrok/localhost)
    // Jika Vercel, biasanya x-forwarded-host akurat
    const domain = `${protocol}://${host}`;
    const webhookUrl = `${domain}/api/telegram/webhook`;

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

    const response = await fetch(telegramApiUrl);
    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({ message: `Webhook berhasil didaftarkan ke: ${webhookUrl}` });
    } else {
      return NextResponse.json({ error: `Gagal dari Telegram: ${data.description}` }, { status: 500 });
    }

  } catch (error) {
    console.error("Set Webhook Error:", error);
    return NextResponse.json({ error: 'Terjadi kesalahan server saat mengatur webhook.' }, { status: 500 });
  }
}
