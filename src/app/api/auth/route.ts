import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, shopType } = body;

    if (!email || !password || !shopType) {
      return NextResponse.json({ error: 'Email, password, and business type are required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        shop: { shopType }
      },
      include: { shop: true }
    });

    if (!user) {
      const anyUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        include: { shop: true }
      });
      if (anyUser) {
        return NextResponse.json({ error: 'Email found under a different business type' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Account not found. Please register or check your email.' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is disabled. Contact the shop owner.' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Wrong password. Check Caps Lock or reset your password.' }, { status: 401 });
    }

    const token = generateToken(user.id, user.shopId, user.role);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      shop: {
        id: user.shop.id,
        name: user.shop.name,
        shopType: user.shop.shopType,
        currency: user.shop.currency,
        currencySymbol: user.shop.currencySymbol
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (shopId) {
      const users = await prisma.user.findMany({
        where: { shopId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });
      return NextResponse.json({ users });
    }

    return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}