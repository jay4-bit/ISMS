import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  return value;
}

function jwtSecret(): string {
  const secret = requiredEnvironmentVariable('JWT_SECRET');
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  return secret;
}

export const AUTH_COOKIE_NAME = 'isms_session';
export const ADMIN_COOKIE_NAME = 'isms_admin_session';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24;
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 2;
const TOKEN_ISSUER = 'inshop';
const USER_AUDIENCE = 'inshop-app';
const ADMIN_AUDIENCE = 'inshop-admin';

export interface SessionPermission {
  module: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function validateNewPassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 12) return 'Password must be at least 12 characters';
  if (password.length > 128) return 'Password must be no more than 128 characters';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include uppercase, lowercase, and a number';
  }
  return null;
}

export function generateToken(userId: string, shopId: string, role: string, permissions: SessionPermission[] = []): string {
  return jwt.sign({ userId, shopId, role, permissions, type: 'user' }, jwtSecret(), {
    algorithm: 'HS256',
    audience: USER_AUDIENCE,
    expiresIn: AUTH_COOKIE_MAX_AGE,
    issuer: TOKEN_ISSUER,
  });
}

export function verifyToken(token: string): { userId: string; shopId: string; role: string; permissions: SessionPermission[] } | null {
  try {
    const payload = jwt.verify(token, jwtSecret(), {
      algorithms: ['HS256'],
      audience: USER_AUDIENCE,
      issuer: TOKEN_ISSUER,
    }) as jwt.JwtPayload;
    if (payload.type !== 'user' || typeof payload.userId !== 'string' ||
        typeof payload.shopId !== 'string' || typeof payload.role !== 'string') return null;
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions.filter((permission): permission is SessionPermission =>
          permission && typeof permission.module === 'string' &&
          typeof permission.canRead === 'boolean' && typeof permission.canWrite === 'boolean' &&
          typeof permission.canDelete === 'boolean')
      : [];
    return { userId: payload.userId, shopId: payload.shopId, role: payload.role, permissions };
  } catch {
    return null;
  }
}

export function generateAdminToken(email: string): string {
  return jwt.sign({ email, type: 'admin', isAdmin: true }, jwtSecret(), {
    algorithm: 'HS256',
    audience: ADMIN_AUDIENCE,
    expiresIn: ADMIN_COOKIE_MAX_AGE,
    issuer: TOKEN_ISSUER,
  });
}

export function verifyAdminToken(token: string): { email: string; isAdmin: true } | null {
  try {
    const payload = jwt.verify(token, jwtSecret(), {
      algorithms: ['HS256'],
      audience: ADMIN_AUDIENCE,
      issuer: TOKEN_ISSUER,
    }) as jwt.JwtPayload;
    if (payload.type !== 'admin' || payload.isAdmin !== true || typeof payload.email !== 'string') return null;
    return { email: payload.email, isAdmin: true };
  } catch {
    return null;
  }
}

function digestOneTimeCode(code: string): Buffer {
  return createHmac('sha256', jwtSecret()).update(code).digest();
}

export function createOneTimeCode(ttlMinutes = 10): { code: string; digest: string; expiresAt: Date } {
  const code = randomInt(100000, 1000000).toString();
  return {
    code,
    digest: digestOneTimeCode(code).toString('hex'),
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
  };
}

export function verifyOneTimeCode(code: string, storedDigest: string | null | undefined): boolean {
  if (!/^\d{6}$/.test(code) || !storedDigest || !/^[a-f0-9]{64}$/i.test(storedDigest)) return false;
  const actual = digestOneTimeCode(code);
  const expected = Buffer.from(storedDigest, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
