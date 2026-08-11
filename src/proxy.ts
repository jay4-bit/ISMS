import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth-server';

const publicAuthPaths = new Set([
  '/api/auth/forgot-password',
  '/api/auth/resend-code',
  '/api/auth/reset-password',
  '/api/auth/session',
  '/api/auth/verify-email',
]);

function isPublicApiRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  if (pathname === '/api/admin/login' || pathname.startsWith('/api/admin/')) return true;
  if (publicAuthPaths.has(pathname)) return true;
  if (pathname === '/api/auth' && request.method === 'POST') return true;
  if (pathname === '/api/shops' && request.method === 'POST') return true;

  return false;
}

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();
  if (isPublicApiRequest(request)) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifyToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-shop-id', session.shopId);
  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-user-role', session.role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/api/:path*'],
};
