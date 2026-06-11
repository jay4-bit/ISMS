import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { shopId },
      include: { category: true },
    });

    const totalProducts = products.filter(p => !p.isFaulty).length;
    const lowStockCount = products.filter(p => p.stockQuantity <= p.lowStockThreshold && !p.isFaulty).length;
    const lowStockItems = products
      .filter(p => p.stockQuantity <= p.lowStockThreshold && !p.isFaulty)
      .slice(0, 5);
    const totalInventoryValue = products.reduce((sum, p) => sum + p.purchaseCost * Math.max(0, p.stockQuantity), 0);
    const totalSellingValue = products.reduce((sum, p) => sum + p.sellingPrice * Math.max(0, p.stockQuantity), 0);

    const nonFaulty = products.filter(p => !p.isFaulty);
    const avgPurchaseCost = nonFaulty.length > 0 ? nonFaulty.reduce((sum, p) => sum + p.purchaseCost, 0) / nonFaulty.length : 0;
    const avgSellingPrice = nonFaulty.length > 0 ? nonFaulty.reduce((sum, p) => sum + p.sellingPrice, 0) / nonFaulty.length : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = await prisma.sale.findMany({
      where: { shopId, createdAt: { gte: today } },
      include: { items: { include: { product: true } } },
    });

    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const salesCount = todaySales.length;

    const todayProfit = todaySales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => {
        const netPrice = item.unitPrice - item.discount;
        const profit = netPrice - item.product.purchaseCost;
        return itemSum + profit * item.quantity;
      }, 0);
    }, 0);

    const todayExpenses = await prisma.expense.aggregate({
      where: { shopId, date: { gte: today } },
      _sum: { amount: true },
    });
    const todayExpensesTotal = todayExpenses._sum.amount || 0;

    const todayReturns = await prisma.returnItem.findMany({
      where: { return: { shopId, createdAt: { gte: today } } },
    });
    const todayReturnsTotal = todayReturns.reduce((sum, r) => sum + r.refundAmount + (r.repairCost || 0), 0);

    const netProfit = todayProfit - todayExpensesTotal - todayReturnsTotal;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { shopId, createdAt: { gte: thirtyDaysAgo } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const productIdsSold = recentSales.map(s => s.productId);
    const fastMovingItems = products.filter(p => productIdsSold.includes(p.id)).slice(0, 5);
    const slowMovingItems = products.filter(p => !productIdsSold.includes(p.id) && !p.isFaulty).slice(0, 5);

    // Expiry alerts
    const now = new Date();
    const settings = await prisma.shopSettings.findUnique({ where: { shopId } });
    const expiryAlertDays = settings?.expiryAlertDays || 7;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryAlertDays);

    const expiringProducts = products
      .filter(p => p.expiryDate && new Date(p.expiryDate) <= expiryDate && new Date(p.expiryDate) >= now && !p.isFaulty)
      .slice(0, 5);
    const expiringCount = products.filter(p => p.expiryDate && new Date(p.expiryDate) <= expiryDate && new Date(p.expiryDate) >= now && !p.isFaulty).length;

    const expiredProducts = products
      .filter(p => p.expiryDate && new Date(p.expiryDate) < now && !p.isFaulty)
      .slice(0, 5);
    const expiredCount = products.filter(p => p.expiryDate && new Date(p.expiryDate) < now && !p.isFaulty).length;

    const recentActivities = await prisma.activity.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        totalProducts,
        lowStockCount,
        lowStockItems,
        totalInventoryValue,
        totalSellingValue,
        avgPurchaseCost,
        avgSellingPrice,
        todaySales: todayRevenue,
        todayProfit,
        salesCount,
        todayExpenses: todayExpensesTotal,
        todayReturns: todayReturnsTotal,
        netProfit,
        fastMovingItems,
        slowMovingItems,
        expiringProducts,
        expiringCount,
        expiredProducts,
        expiredCount,
      },
      recentActivities,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
