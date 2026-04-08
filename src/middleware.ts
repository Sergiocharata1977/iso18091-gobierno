import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// iso18091-gobierno (Firebase: gobiernos-locales-iso) — exclusivamente edición gobierno local
const IS_GOVERNMENT_EDITION = true; // forzado por diseño en este fork

const GOVERNMENT_PANEL_ROUTE = '/gobierno/panel';
const DEFAULT_AUTHENTICATED_ROUTE = IS_GOVERNMENT_EDITION
  ? GOVERNMENT_PANEL_ROUTE
  : '/';
const ENTERPRISE_HOME_ROUTES = new Set(['/', '/dashboard', '/noticias']);

const PUBLIC_PAGE_PREFIXES = [
  '/login',
  '/register',
  '/pending',
  '/p',
];

const PUBLIC_API_PREFIXES = [
  '/api/health',
  '/api/whatsapp/webhook',
  '/api/billing/mobbex/webhook',
  '/api/send-email',
  '/api/public',
  '/api/landing',
  '/api/auth',
  '/api/onboarding',
];

const PROTECTED_PAGE_PREFIXES = [
  '/onboarding',
  '/super-admin',
  '/noticias',
  '/gobierno',
  '/procesos',
  '/auditorias',
  '/hallazgos',
  '/acciones',
  '/documentos',
  '/rrhh',
  '/crm',
  '/hse',
  '/configuracion',
  '/mi-panel',
  '/planificacion',
  '/indicadores',
  '/registros',
  '/calidad',
  '/admin',
  '/dashboard',
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function hasSessionAuth(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get('session')?.value ||
      request.cookies.get('auth-token')?.value
  );
}

function hasBearerAuth(request: NextRequest): boolean {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') && authorization.length > 7;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getTokenEdition(request: NextRequest): string | null {
  const sessionToken = request.cookies.get('session')?.value;
  const authToken = request.cookies.get('auth-token')?.value;
  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  const payload =
    (authToken ? decodeJwtPayload(authToken) : null) ??
    (sessionToken ? decodeJwtPayload(sessionToken) : null) ??
    (bearerToken ? decodeJwtPayload(bearerToken) : null);

  const edition = payload?.['edition'];
  return typeof edition === 'string' ? edition : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicPageRoute = PUBLIC_PAGE_PREFIXES.some(prefix =>
    matchesPrefix(pathname, prefix)
  );
  const isPublicApiRoute = PUBLIC_API_PREFIXES.some(prefix =>
    matchesPrefix(pathname, prefix)
  );

  if (isPublicPageRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  if (isApiRoute) {
    if (request.method === 'OPTIONS') {
      return NextResponse.next();
    }

    if (!hasSessionAuth(request) && !hasBearerAuth(request)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
          message:
            'Se requiere Authorization: Bearer <token> o sesión activa.',
        },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  if (
    hasSessionAuth(request) &&
    ENTERPRISE_HOME_ROUTES.has(pathname) &&
    (IS_GOVERNMENT_EDITION || getTokenEdition(request) === 'government')
  ) {
    const governmentUrl = request.nextUrl.clone();
    governmentUrl.pathname = DEFAULT_AUTHENTICATED_ROUTE;
    governmentUrl.search = '';
    return NextResponse.redirect(governmentUrl);
  }

  const isProtectedPageRoute = PROTECTED_PAGE_PREFIXES.some(prefix =>
    matchesPrefix(pathname, prefix)
  );

  if (isProtectedPageRoute && !hasSessionAuth(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
