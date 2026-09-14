import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/route';
import { GET as adminSessionGET } from '@/app/api/admin/session/route';
import { ADMIN_COOKIE_NAME, generateAdminToken, verifyAdminRequest } from '@/lib/auth-server';

describe('POST /api/auth', () => {
  it('rejects requests without credentials before accessing the database', async () => {
    const request = new NextRequest('http://localhost/api/auth', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Email and password are required',
    });
  });
});

describe('Admin Authentication & Session', () => {
  it('verifies a valid admin session cookie', async () => {
    const adminToken = generateAdminToken('admin@inshop.co.tz');
    const request = new NextRequest('http://localhost/api/admin/session', {
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${adminToken}`,
      },
    });

    const admin = verifyAdminRequest(request);
    expect(admin).not.toBeNull();
    expect(admin?.email).toBe('admin@inshop.co.tz');

    const response = await adminSessionGET(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      email: 'admin@inshop.co.tz',
    });
  });

  it('rejects an invalid or missing admin session cookie', async () => {
    const request = new NextRequest('http://localhost/api/admin/session');
    const response = await adminSessionGET(request);
    expect(response.status).toBe(401);
  });
});
