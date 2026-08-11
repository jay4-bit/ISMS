import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/route';

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
