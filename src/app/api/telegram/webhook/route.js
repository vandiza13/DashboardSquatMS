import { NextResponse } from 'next/server';
import { handleTelegramMessage } from '@/lib/telegram/handler';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Verifikasi payload dari Telegram
    if (!body.message && !body.callback_query) {
      return NextResponse.json({ ok: true });
    }

    // Proses pesan masuk (asynchronous tapi kita tunggu agar function tidak mati)
    await handleTelegramMessage(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ [Telegram Webhook Error]:", error);
    // Selalu return 200 ke Telegram agar tidak dikirim ulang terus-menerus oleh server Telegram
    return NextResponse.json({ ok: true, error: error.message });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook is active' });
}
