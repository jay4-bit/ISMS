import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, shopId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: shopId ? { email, shopId } : { email },
      include: { shop: true }
    });

    if (!user) {
      // If no shop selected and user not found, try finding across all shops
      if (!shopId) {
        const anyUser = await prisma.user.findFirst({
          where: { email },
          include: { shop: true }
        });
        if (anyUser) {
          return NextResponse.json({ error: 'Please select the correct shop' }, { status: 401 });
        }
      }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
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