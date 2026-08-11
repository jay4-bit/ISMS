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

export async function GET(request: NextRequest) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [totalShops, totalUsers, pendingPayments, confirmedPayments, recentPayments] = await Promise.all([
      prisma.shop.count(),
      prisma.user.count(),
      prisma.subscriptionPayment.count({ where: { status: 'PENDING' } }),
      prisma.subscriptionPayment.count({ where: { status: 'CONFIRMED' } }),
      prisma.subscriptionPayment.findMany({
        where: { status: 'PENDING' },
        orderBy: { paidAt: 'desc' },
        take: 10,
        include: { shop: { select: { name: true } } },
      }),
    ]);

    const totalRevenue = await prisma.subscriptionPayment.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { amount: true },
    });

    return NextResponse.json({
      totalShops,
      totalUsers,
      pendingPayments,
      confirmedPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentPayments,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
