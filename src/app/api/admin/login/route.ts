import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME, generateAdminToken } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHashB64 = process.env.ADMIN_PASSWORD_HASH_B64;

    if (!adminEmail || !adminPasswordHashB64) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
    }

    if (typeof email !== 'string' || typeof password !== 'string' || email.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const adminPasswordHash = Buffer.from(adminPasswordHashB64, 'base64').toString('utf-8');
    const valid = await bcrypt.compare(password, adminPasswordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateAdminToken(adminEmail);

    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ADMIN_COOKIE_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
