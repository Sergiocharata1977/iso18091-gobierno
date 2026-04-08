import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public API endpoints by design (health checks, webhooks, landing)
  const publicApiPrefixes = [
    '/api/health',
    '/api/whatsapp/webhook',
    '/api/billing/mobbex/webhook',
    '/api/send-email',
    '/api/public/',
    '/api/landing/',
    '/api/auth/session',
  ];

  const isApiRoute = pathname.startsWith('/api/');
  const isPublicApiRoute = publicApiPrefixes.some(prefix =>
    pathname.startsWith(prefix)
  );

  // Global API gate: require either Bearer token or active session cookie.
  if (isApiRoute && !isPublicApiRoute) {
    if (request.method === 'OPTIONS') {
      return NextResponse.next();
    }

    const authHeader = request.headers.get('authorization') || '';
    const hasBearerToken =
      authHeader.startsWith('Bearer ') && authHeader.length > 'Bearer '.length;
    const hasSessionCookie = !!request.cookies.get('session')?.value;
    const hasAuthTokenCookie = !!request.cookies.get('auth-token')?.value;

    if (!hasBearerToken && !hasSessionCookie && !hasAuthTokenCookie) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
          message:
            'Esta API requiere Authorization: Bearer <token> o sesion activa.',
        },
        { status: 401 }
      );
    }
  }

  const protectedRoutes = [
    '/super-admin',
    '/dashboard',
    '/rrhh',
    '/procesos',
    '/calidad',
    '/auditorias',
    '/reportes',
    '/admin',
    '/documentos',
    '/hallazgos',
    '/acciones',
    '/contexto',
    '/noticias',
    '/calendario',
    '/indicadores',
  ];

  const authRoutes = ['/login', '/register'];

  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  const sessionCookie = request.cookies.get('session')?.value;
  const authTokenCookie = request.cookies.get('auth-token')?.value;
  const isAuthenticated = !!sessionCookie || !!authTokenCookie;

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Keep auth routes accessible so client-side post-login role routing can decide
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
