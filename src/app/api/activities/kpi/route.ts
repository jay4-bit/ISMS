import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    const hasDateFilter = startDate || endDate;

    const users = await prisma.user.findMany({
      where: { shopId, isActive: true },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    const userIds = users.map(u => u.id);

    const saleWhere: any = { shopId, cashierId: { in: userIds } };
    if (hasDateFilter) saleWhere.createdAt = dateFilter;

    const activityWhere: any = { shopId, userId: { in: userIds } };
    if (hasDateFilter) activityWhere.createdAt = dateFilter;

    const [
      salesAgg,
      activityAgg,
      saleItems,
      returnItems,
      expenseActivities,
      loginActivities,
      otherActivities,
    ] = await Promise.all([
      prisma.sale.groupBy({
        by: ['cashierId'],
        where: saleWhere,
        _count: { id: true },
        _sum: { total: true, discount: true },
      }),
      prisma.activity.groupBy({
        by: ['userId', 'action'],
        where: activityWhere,
        _count: { id: true },
      }),
      prisma.saleItem.findMany({
        where: { sale: { shopId, cashierId: { in: userIds }, ...(hasDateFilter ? { createdAt: dateFilter } : {}) } },
        select: {
          id: true, quantity: true, unitPrice: true, total: true,
          sale: { select: { cashierId: true, createdAt: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
        orderBy: { sale: { createdAt: 'desc' } },
        take: 200,
      }),
      prisma.returnItem.findMany({
        where: { return: { shopId, ...(hasDateFilter ? { createdAt: dateFilter } : {}) } },
        select: {
          id: true, quantity: true, refundAmount: true, reason: true, status: true,
          return: { select: { createdAt: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
        orderBy: { return: { createdAt: 'desc' } },
        take: 200,
      }),
      prisma.activity.findMany({
        where: { ...activityWhere, action: 'EXPENSE_ADDED' },
        select: { userId: true, details: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.activity.findMany({
        where: { ...activityWhere, action: 'LOGIN' },
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.activity.findMany({
        where: { ...activityWhere, action: { notIn: ['LOGIN', 'SALE_CREATED', 'SALE_RETURNED', 'EXPENSE_ADDED'] } },
        select: { userId: true, action: true, details: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const salesMap = new Map(salesAgg.map(s => [
      s.cashierId,
      { count: s._count.id, revenue: s._sum.total || 0, discounts: s._sum.discount || 0 },
    ]));

    const actionsMap = new Map<string, Record<string, number>>();
    for (const a of activityAgg) {
      if (!a.userId) continue;
      if (!actionsMap.has(a.userId)) actionsMap.set(a.userId, {});
      actionsMap.get(a.userId)![a.action] = a._count.id;
    }

    const saleItemsByUser = new Map<string, typeof saleItems>();
    for (const si of saleItems) {
      const uid = si.sale.cashierId;
      if (!saleItemsByUser.has(uid)) saleItemsByUser.set(uid, []);
      saleItemsByUser.get(uid)!.push(si);
    }

    const _returnItemsByUser = new Map<string, typeof returnItems>();
    for (const ri of returnItems) {
      const _uid = ri.return.createdAt.toISOString(); // no userId on return
      // We'll assign returns to all users for now, or skip user-specific assignment
    }

    const expenseByUser = new Map<string, typeof expenseActivities>();
    for (const e of expenseActivities) {
      if (!e.userId) continue;
      if (!expenseByUser.has(e.userId)) expenseByUser.set(e.userId, []);
      expenseByUser.get(e.userId)!.push(e);
    }

    const loginByUser = new Map<string, typeof loginActivities>();
    for (const l of loginActivities) {
      if (!l.userId) continue;
      if (!loginByUser.has(l.userId)) loginByUser.set(l.userId, []);
      loginByUser.get(l.userId)!.push(l);
    }

    const otherByUser = new Map<string, typeof otherActivities>();
    for (const o of otherActivities) {
      if (!o.userId) continue;
      if (!otherByUser.has(o.userId)) otherByUser.set(o.userId, []);
      otherByUser.get(o.userId)!.push(o);
    }

    const kpi = users.map(u => {
      const sales = salesMap.get(u.id);
      const actions = actionsMap.get(u.id) || {};

      return {
        userId: u.id,
        userName: u.name,
        email: u.email,
        role: u.role,
        joinedAt: u.createdAt.toISOString(),
        totalSales: sales?.count || 0,
        totalRevenue: sales?.revenue || 0,
        totalDiscounts: sales?.discounts || 0,
        totalReturns: actions['SALE_RETURNED'] || 0,
        totalExpenses: actions['EXPENSE_ADDED'] || 0,
        logins: actions['LOGIN'] || 0,
        otherActions: Object.entries(actions)
          .filter(([k]) => !['SALE_RETURNED', 'EXPENSE_ADDED', 'LOGIN'].includes(k))
          .reduce((sum, [, v]) => sum + v, 0),
        actionBreakdown: Object.entries(actions)
          .map(([action, count]) => ({ action, count }))
          .sort((a, b) => b.count - a.count),
        details: {
          sales: (saleItemsByUser.get(u.id) || []).slice(0, 30).map(si => ({
            date: si.sale.createdAt,
            productName: si.product.name,
            productSku: si.product.sku,
            quantity: si.quantity,
            unitPrice: si.unitPrice,
            total: si.total,
          })),
          returns: returnItems.slice(0, 30).map(ri => ({
            date: ri.return.createdAt,
            productName: ri.product.name,
            productSku: ri.product.sku,
            quantity: ri.quantity,
            refundAmount: ri.refundAmount,
            reason: ri.reason,
            status: ri.status,
          })),
          expenses: (expenseByUser.get(u.id) || []).slice(0, 30).map(e => ({
            date: e.createdAt,
            details: e.details,
          })),
          logins: (loginByUser.get(u.id) || []).slice(0, 30).map(l => ({
            date: l.createdAt,
          })),
          other: (otherByUser.get(u.id) || []).slice(0, 30).map(o => ({
            date: o.createdAt,
            action: o.action,
            details: o.details,
          })),
        },
      };
    });

    kpi.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({ kpi });
  } catch (error) {
    console.error('KPI error:', error);
    return NextResponse.json({ error: 'Failed to load KPIs' }, { status: 500 });
  }
}
