import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminRequest } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const admin = verifyAdminRequest(request);
  return admin
    ? NextResponse.json({ authenticated: true, email: admin.email }, { headers: { 'Cache-Control': 'no-store' } })
    : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
