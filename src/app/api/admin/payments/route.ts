import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAdminRequest } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const admin = verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status');
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const payments = await prisma.subscriptionPayment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      include: {
        shop: {
          select: {
            name: true,
            subscriptionStatus: true,
            subscriptionEndsAt: true,
          },
        },
      },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Admin get payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
