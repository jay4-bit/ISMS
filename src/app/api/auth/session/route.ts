import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth-server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ authenticated: false }, { headers: { 'Cache-Control': 'no-store' } });

  const user = await prisma.user.findFirst({
    where: { id: session.userId, shopId: session.shopId, isActive: true },
    include: { shop: true },
  });
  if (!user || !user.shop.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    authenticated: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    shop: {
      id: user.shop.id, name: user.shop.name, shopType: user.shop.shopType,
      currency: user.shop.currency, currencySymbol: user.shop.currencySymbol,
    },
    subscription: {
      status: user.shop.subscriptionStatus,
      trialEndsAt: user.shop.trialEndsAt,
      subscriptionEndsAt: user.shop.subscriptionEndsAt,
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
