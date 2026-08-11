import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  return value;
}

const JWT_SECRET = requiredEnvironmentVariable('JWT_SECRET');

export const AUTH_COOKIE_NAME = 'isms_session';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string, shopId: string, role: string): string {
  return jwt.sign({ userId, shopId, role }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; shopId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as unknown as { userId: string; shopId: string; role: string };
  } catch {
    return null;
  }
}
