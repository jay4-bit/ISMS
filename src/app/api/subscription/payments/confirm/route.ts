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

export async function POST(request: NextRequest) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, action } = body;

    if (!paymentId || !action) {
      return NextResponse.json({ error: 'paymentId and action required' }, { status: 400 });
    }

    if (action !== 'CONFIRMED' && action !== 'REJECTED') {
      return NextResponse.json({ error: 'action must be CONFIRMED or REJECTED' }, { status: 400 });
    }

    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payment already processed' }, { status: 400 });
    }

    if (action === 'CONFIRMED') {
      const now = new Date();
      const shop = await prisma.shop.findUnique({
        where: { id: payment.shopId },
        select: { subscriptionEndsAt: true, trialEndsAt: true, subscriptionStatus: true },
      });

      const baseDate = shop?.trialEndsAt && shop.trialEndsAt > now ? shop.trialEndsAt : now;
      const currentEnd = shop?.subscriptionEndsAt && shop.subscriptionEndsAt > baseDate
        ? shop.subscriptionEndsAt : baseDate;
      const newEnd = new Date(currentEnd.getTime() + (payment.monthsPaid || 1) * 30 * 24 * 60 * 60 * 1000);

      const isOnTrial = shop?.subscriptionStatus === 'TRIAL' && shop?.trialEndsAt && shop.trialEndsAt > now;
      const updateData: any = { subscriptionEndsAt: newEnd };
      if (!isOnTrial) updateData.subscriptionStatus = 'ACTIVE';

      await prisma.$transaction([
        prisma.subscriptionPayment.update({
          where: { id: paymentId },
          data: { status: 'CONFIRMED' },
        }),
        prisma.shop.update({
          where: { id: payment.shopId },
          data: updateData,
        }),
      ]);

      return NextResponse.json({ success: true, payment: { ...payment, status: 'CONFIRMED' }, subscriptionEndsAt: newEnd });
    } else {
      await prisma.subscriptionPayment.update({
        where: { id: paymentId },
        data: { status: 'REJECTED' },
      });

      return NextResponse.json({ success: true, payment: { ...payment, status: 'REJECTED' } });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    return NextResponse.json({ error: 'Failed to process payment confirmation' }, { status: 500 });
  }
}
