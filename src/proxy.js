import { NextResponse } from 'next/server';

export function proxy(request) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // 1. Jika user mengakses Root ('/'), langsung lempar ke Dashboard
    // (Nanti poin nomor 2 akan mengecek apakah dia boleh masuk dashboard atau tidak)
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 2. Proteksi Halaman Dashboard
    // Jika user mau masuk ke '/dashboard' (dan sub-halamannya) TAPI tidak punya token
    if (pathname.startsWith('/dashboard') && !token) {
        // Redirect paksa ke Login
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 3. Jika user SUDAH login tapi iseng buka halaman '/login'
    if (pathname === '/login' && token) {
        // Kembalikan ke Dashboard (karena sudah login)
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Lanjutkan request jika aman
    return NextResponse.next();
}

// Tentukan halaman mana saja yang dijaga oleh Middleware ini
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};