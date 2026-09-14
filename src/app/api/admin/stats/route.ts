import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAdminRequest } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const admin = verifyAdminRequest(request);
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
