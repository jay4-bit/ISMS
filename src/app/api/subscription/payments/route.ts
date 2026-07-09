import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'isms-pro-admin-secret-key-2026';

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
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const body = await request.json();
    const { amount, paymentMethod, reference, monthsPaid, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    if (!reference || !reference.trim()) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 });
    }

    const payment = await prisma.subscriptionPayment.create({
      data: {
        shopId,
        amount,
        paymentMethod: paymentMethod || null,
        reference: reference.trim(),
        monthsPaid: monthsPaid || 1,
        notes: notes || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const status = request.nextUrl.searchParams.get('status');

    if (!shopId) {
      const admin = verifyAdmin(request);
      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (status) where.status = status;

    const payments = await prisma.subscriptionPayment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      include: { shop: { select: { name: true, subscriptionStatus: true, subscriptionEndsAt: true } } },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
