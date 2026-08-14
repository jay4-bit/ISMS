import { describe, expect, it } from 'vitest';
import { createOneTimeCode, generateToken, verifyOneTimeCode, verifyToken } from '@/lib/auth-server';

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

  it('stores one-time codes as a digest and compares them safely', () => {
    const oneTimeCode = createOneTimeCode();

    expect(oneTimeCode.code).toMatch(/^\d{6}$/);
    expect(oneTimeCode.digest).not.toContain(oneTimeCode.code);
    expect(verifyOneTimeCode(oneTimeCode.code, oneTimeCode.digest)).toBe(true);
    expect(verifyOneTimeCode('000000', oneTimeCode.digest)).toBe(false);
  });
});
