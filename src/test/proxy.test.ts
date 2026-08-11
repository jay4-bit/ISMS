import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { generateToken } from '@/lib/auth-server';
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
});
