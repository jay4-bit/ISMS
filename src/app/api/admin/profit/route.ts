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

export async function GET(request: NextRequest) {
  const admin = verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    const now = new Date();
    let dateFilter: Date | undefined;
    switch (period) {
      case '7d': dateFilter = new Date(now.getTime() - 7 * 86400000); break;
      case '30d': dateFilter = new Date(now.getTime() - 30 * 86400000); break;
      case '90d': dateFilter = new Date(now.getTime() - 90 * 86400000); break;
      case '1y': dateFilter = new Date(now.getTime() - 365 * 86400000); break;
    }

    const incomeWhere: any = { status: 'CONFIRMED' };
    const expenseWhere: any = {};
    if (dateFilter) {
      incomeWhere.paidAt = { gte: dateFilter };
      expenseWhere.date = { gte: dateFilter };
    }

    const [incomeAgg, expenseAgg, incomeByMonth, expenseByCategory] = await Promise.all([
      prisma.subscriptionPayment.aggregate({
        where: incomeWhere,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.adminExpense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.$queryRawUnsafe<Array<{ month: string; total: number; count: bigint }>>(
        `SELECT to_char("paidAt", 'YYYY-MM') as month, SUM(amount) as total, COUNT(*) as count FROM "SubscriptionPayment" WHERE status = 'CONFIRMED'${dateFilter ? ` AND "paidAt" >= $1` : ''} GROUP BY month ORDER BY month DESC LIMIT 12`,
        ...(dateFilter ? [dateFilter] : [])
      ),
      prisma.adminExpense.groupBy({
        by: ['category'],
        where: expenseWhere,
        _sum: { amount: true },
        _count: true,
        orderBy: { category: 'asc' },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount || 0;
    const totalExpenses = expenseAgg._sum.amount || 0;

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      incomeCount: incomeAgg._count,
      expenseCount: expenseAgg._count,
      incomeByMonth: (incomeByMonth || []).map((r: any) => ({
        month: r.month,
        total: Number(r.total),
        count: Number(r.count),
      })),
      expenseByCategory: expenseByCategory.map(c => ({
        category: c.category,
        total: c._sum.amount || 0,
        count: c._count,
      })),
    });
  } catch (error) {
    console.error('Admin profit error:', error);
    return NextResponse.json({ error: 'Failed to get profit data' }, { status: 500 });
  }
}
