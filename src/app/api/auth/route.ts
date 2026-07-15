import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, shopId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    const where = { email: emailLower, ...(shopId ? { shopId } : {}) };

    const users = await prisma.user.findMany({
      where,
      include: { shop: true },
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = users.find(u => u.role === 'OWNER') || users[0];

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json({ error: 'Please verify your email first. Check your inbox for the verification code.' }, { status: 401 });
    }

    if (!user.shop.trialEndsAt) {
      const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '3');
      await prisma.shop.update({
        where: { id: user.shop.id },
        data: {
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          subscriptionStatus: 'TRIAL',
        },
      });
      user.shop.trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(user.id, user.shopId, user.role);

    logActivity({
      shopId: user.shopId,
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      details: `${user.name} logged in`,
    });

    const now = new Date();
    const shopData: any = {
      id: user.shop.id,
      name: user.shop.name,
      shopType: user.shop.shopType,
      currency: user.shop.currency,
      currencySymbol: user.shop.currencySymbol,
    };

    if (user.shop.subscriptionStatus === 'TRIAL' && user.shop.trialEndsAt && user.shop.trialEndsAt < now) {
      await prisma.shop.update({
        where: { id: user.shop.id },
        data: { subscriptionStatus: 'EXPIRED' },
      });
    }

    const effectiveStatus = user.shop.subscriptionStatus === 'TRIAL' && user.shop.trialEndsAt && user.shop.trialEndsAt < now
      ? 'EXPIRED' : user.shop.subscriptionStatus;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      shop: shopData,
      subscription: {
        status: effectiveStatus,
        trialEndsAt: user.shop.trialEndsAt,
        subscriptionEndsAt: user.shop.subscriptionEndsAt,
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