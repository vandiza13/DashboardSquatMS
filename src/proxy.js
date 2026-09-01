import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function proxy(request) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // 1. Jika user mengakses Root ('/'), langsung lempar ke Dashboard
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 2. Proteksi Halaman Dashboard (Belum login)
    if (pathname.startsWith('/dashboard') && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 3. Jika user SUDAH login tapi iseng buka halaman '/login'
    if (pathname === '/login' && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 4. Proteksi Rute Berdasarkan Role (Role-based Access Control)
    if (token && pathname.startsWith('/dashboard')) {
        const user = await verifyJWT(token);
        if (user) {
            // Role Teknisi: Hanya boleh akses 4 menu utama + profile:
            // 1. /dashboard (Dashboard)
            // 2. /dashboard/sla-performance (Monitoring SLA & MTTR)
            // 3. /dashboard/productivity (Produktifitas)
            // 4. Database SITE (/dashboard/tsel-sites*, /dashboard/fsi-sites*, /dashboard/mtel-sites*, /dashboard/umt-sites*)
            // (+ /dashboard/profile)
            if (user.role === 'Teknisi') {
                const allowedPrefixes = [
                    '/dashboard/sla-performance',
                    '/dashboard/productivity',
                    '/dashboard/tsel-sites',
                    '/dashboard/fsi-sites',
                    '/dashboard/mtel-sites',
                    '/dashboard/umt-sites',
                    '/dashboard/profile',
                ];

                const isExactDashboard = pathname === '/dashboard';
                const isAllowed = isExactDashboard || allowedPrefixes.some(prefix => 
                    pathname === prefix || pathname.startsWith(prefix + '/')
                );

                if (!isAllowed) {
                    return NextResponse.redirect(new URL('/dashboard', request.url));
                }
            }

            // Role selain SuperAdmin: Tidak boleh akses Manajemen User & Mapping STO
            if (user.role !== 'SuperAdmin') {
                if (pathname.startsWith('/dashboard/users') || pathname.startsWith('/dashboard/sto-mappings')) {
                    return NextResponse.redirect(new URL('/dashboard', request.url));
                }
            }
        }
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