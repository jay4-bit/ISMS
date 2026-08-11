import { describe, expect, it } from 'vitest';
import { generateToken, verifyToken } from '@/lib/auth-server';

describe('authentication tokens', () => {
  it('round-trips the authenticated user, shop, and role claims', () => {
    const token = generateToken('user-123', 'shop-456', 'OWNER');

    expect(verifyToken(token)).toMatchObject({
      userId: 'user-123',
      shopId: 'shop-456',
      role: 'OWNER',
    });
  });

  it('rejects an invalid token', () => {
    expect(verifyToken('not-a-valid-token')).toBeNull();
  });
});
