import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, generateAdminToken, generateToken } from '@/lib/auth-server';
import { proxy } from '@/proxy';

describe('API proxy', () => {
  it('rejects a protected API request without a session', async () => {
    const response = proxy(new NextRequest('http://localhost/api/inventory', {
      headers: { 'x-shop-id': 'attacker-shop' },
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('replaces client-provided tenant headers with signed session claims', () => {
    const token = generateToken('user-123', 'shop-456', 'OWNER');
    const response = proxy(new NextRequest('http://localhost/api/inventory', {
      headers: {
        cookie: `isms_session=${token}`,
        'x-shop-id': 'attacker-shop',
      },
    }));

    expect(response.headers.get('x-middleware-request-x-shop-id')).toBe('shop-456');
    expect(response.headers.get('x-middleware-request-x-user-id')).toBe('user-123');
  });

  it('keeps login publicly reachable', () => {
    const response = proxy(new NextRequest('http://localhost/api/auth', { method: 'POST' }));

    expect(response.status).toBe(200);
  });

  it('does not expose the shop directory without a session', () => {
    const response = proxy(new NextRequest('http://localhost/api/shops'));

    expect(response.status).toBe(401);
  });

  it('enforces API permissions from the signed session', async () => {
    const token = generateToken('cashier-1', 'shop-1', 'CASHIER', [
      { module: 'pos', canRead: true, canWrite: true, canDelete: false },
    ]);
    const response = proxy(new NextRequest('http://localhost/api/inventory?id=product-1', {
      method: 'DELETE',
      headers: { cookie: `isms_session=${token}` },
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('blocks cross-site state-changing requests', async () => {
    const response = proxy(new NextRequest('http://localhost/api/auth', {
      method: 'POST',
      headers: { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
    }));

    expect(response.status).toBe(403);
  });

  it('requires a distinct admin session for admin APIs', async () => {
    const userToken = generateToken('owner-1', 'shop-1', 'OWNER');
    const denied = proxy(new NextRequest('http://localhost/api/admin/stats', {
      headers: { cookie: `isms_session=${userToken}` },
    }));
    expect(denied.status).toBe(401);

    const adminToken = generateAdminToken('admin@example.com');
    const allowed = proxy(new NextRequest('http://localhost/api/admin/stats', {
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${adminToken}` },
    }));
    expect(allowed.status).toBe(200);
  });
});
