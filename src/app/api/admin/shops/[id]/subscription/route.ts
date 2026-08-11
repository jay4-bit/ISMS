import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET ?? '';

function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    return decoded.isAdmin ? decoded : null;
  } catch {
    return null;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { subscriptionStatus, subscriptionEndsAt } = body;

    if (!subscriptionStatus || !['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'].includes(subscriptionStatus)) {
      return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 });
    }

    const currentShop = await prisma.shop.findUnique({
      where: { id },
      select: { subscriptionStatus: true, trialEndsAt: true },
    });

    if (!currentShop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const onTrial = currentShop.subscriptionStatus === 'TRIAL';
    const trialStillActive = currentShop.trialEndsAt && new Date(currentShop.trialEndsAt) > new Date();

    if (onTrial && trialStillActive && (subscriptionStatus === 'EXPIRED' || subscriptionStatus === 'CANCELLED')) {
      return NextResponse.json({
        error: 'Cannot expire/cancel while shop still has active trial. Wait for trial to end first.',
      }, { status: 400 });
    }

    const data: any = { subscriptionStatus };

    if (subscriptionEndsAt !== undefined) {
      data.subscriptionEndsAt = subscriptionEndsAt ? new Date(subscriptionEndsAt) : null;
    }

    if (subscriptionStatus === 'ACTIVE' && !data.subscriptionEndsAt) {
      data.subscriptionEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const shop = await prisma.shop.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    return NextResponse.json({ success: true, shop });
  } catch (error) {
    console.error('Update shop subscription error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
