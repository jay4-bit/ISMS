import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        createdAt: true,
      },
    });

    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });

    const now = new Date();
    let status = shop.subscriptionStatus;
    if (status === 'TRIAL' && shop.trialEndsAt && shop.trialEndsAt < now) {
      if (shop.subscriptionEndsAt && shop.subscriptionEndsAt > now) {
        await prisma.shop.update({ where: { id: shopId }, data: { subscriptionStatus: 'ACTIVE' } });
        status = 'ACTIVE';
      } else {
        await prisma.shop.update({ where: { id: shopId }, data: { subscriptionStatus: 'EXPIRED' } });
        status = 'EXPIRED';
      }
    }

    return NextResponse.json({
      status,
      trialEndsAt: shop.trialEndsAt,
      subscriptionEndsAt: shop.subscriptionEndsAt,
      createdAt: shop.createdAt,
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json({ error: 'Failed to check subscription' }, { status: 500 });
  }
}
