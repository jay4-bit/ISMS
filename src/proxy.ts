import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, ADMIN_COOKIE_NAME, verifyAdminToken, verifyToken } from '@/lib/auth-server';

const publicAuthPaths = new Set([
  '/api/auth/forgot-password',
  '/api/auth/resend-code',
  '/api/auth/reset-password',
  '/api/auth/session',
  '/api/auth/verify-email',
  '/api/health',
]);

const MODULE_BY_API_PREFIX: Array<[string, string]> = [
  ['/api/stock-movements', 'inventory'], ['/api/stock-counts', 'inventory'],
  ['/api/liquor-inventory', 'inventory'], ['/api/inventory', 'inventory'],
  ['/api/categories', 'inventory'], ['/api/brands', 'inventory'],
  ['/api/purchase-orders', 'purchase-orders'], ['/api/suppliers', 'suppliers'],
  ['/api/profit-loss', 'profit-loss'], ['/api/accountings', 'accountings'],
  ['/api/activities', 'activities'], ['/api/permissions', 'users'],
  ['/api/roles', 'users'], ['/api/users', 'users'], ['/api/returns', 'returns'],
  ['/api/invoice', 'pos'], ['/api/sales', 'sales'], ['/api/clients', 'clients'],
  ['/api/expenses', 'expenses'], ['/api/debts', 'debts'], ['/api/reports', 'reports'],
  ['/api/dashboard', 'dashboard'], ['/api/settings', 'settings'], ['/api/reminders', 'settings'],
  ['/api/upload', 'settings'], ['/api/shop/', 'settings'], ['/api/subscription', 'settings'],
  ['/api/auth', 'users'], ['/api/shops', 'users'],
];

const OWNER_ONLY_PREFIXES = ['/api/shop/export-data', '/api/shop/import-data', '/api/shop/delete-code', '/api/shop/verify-delete'];
const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function applyRateLimit(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  const policy = path === '/api/auth' || path === '/api/admin/login'
    ? { limit: 10, windowMs: 15 * 60_000 }
    : path.startsWith('/api/auth/') || (path === '/api/shops' && request.method === 'POST')
      ? { limit: 6, windowMs: 15 * 60_000 }
      : null;
  if (!policy) return null;

  const now = Date.now();
  const key = `${clientIp(request)}:${path}`;
  const current = rateLimitStore.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + policy.windowMs } : current;
  entry.count += 1;
  rateLimitStore.set(key, entry);
  if (rateLimitStore.size > 10_000) {
    for (const [candidate, value] of rateLimitStore) if (value.resetAt <= now) rateLimitStore.delete(candidate);
  }
  if (entry.count <= policy.limit) return null;
  return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {
    status: 429,
    headers: { 'Retry-After': Math.ceil((entry.resetAt - now) / 1000).toString() },
  });
}

function violatesRequestPolicy(request: NextRequest): NextResponse | null {
  const contentLength = Number(request.headers.get('content-length') || '0');
  const maxBytes = request.nextUrl.pathname.includes('/import') ? 20 * 1024 * 1024 : 2 * 1024 * 1024;
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
  }

  if (!mutationMethods.has(request.method)) return null;
  const origin = request.headers.get('origin');
  const configuredOrigin = process.env.APP_ORIGIN;
  if (origin && configuredOrigin && origin !== configuredOrigin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Cross-site requests are not allowed' }, { status: 403 });
  }
  return null;
}

function isPublicApiRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  if (pathname === '/api/admin/login' || pathname === '/api/admin/session') return true;
  if (publicAuthPaths.has(pathname)) return true;
  if (pathname === '/api/auth' && request.method === 'POST') return true;
  if (pathname === '/api/shops' && request.method === 'POST') return true;

  return false;
}

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();
  const rateLimitResponse = applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  const policyResponse = violatesRequestPolicy(request);
  if (policyResponse) return policyResponse;
  if (isPublicApiRequest(request)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/admin/')) {
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!adminToken || !verifyAdminToken(adminToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('authorization', `Bearer ${adminToken}`);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifyToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (OWNER_ONLY_PREFIXES.some(prefix => request.nextUrl.pathname.startsWith(prefix)) && session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const mapping = MODULE_BY_API_PREFIX.find(([prefix]) => request.nextUrl.pathname.startsWith(prefix));
  if (mapping && session.role !== 'OWNER') {
    const targetModule = request.nextUrl.pathname === '/api/sales' && request.method === 'POST' ? 'pos' : mapping[1];
    const action = request.method === 'GET' ? 'canRead' : request.method === 'DELETE' ? 'canDelete' : 'canWrite';
    const permission = session.permissions.find(item => item.module === targetModule);
    const isPosSupportingRead = request.method === 'GET' &&
      ['/api/inventory', '/api/liquor-inventory', '/api/categories', '/api/brands', '/api/clients', '/api/suppliers']
        .some(prefix => request.nextUrl.pathname.startsWith(prefix)) &&
      session.permissions.some(item => item.module === 'pos' && item.canRead);
    if (!permission?.[action] && !isPosSupportingRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
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
