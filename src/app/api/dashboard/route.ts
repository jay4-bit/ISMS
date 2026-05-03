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
    const totalInventoryValue = products.reduce((sum, p) => sum + p.sellingPrice * p.stockQuantity, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = await prisma.sale.findMany({
      where: { shopId, createdAt: { gte: today } },
      include: { items: { include: { product: true } } },
    });

    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const todayProfit = todaySales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => {
        const profit = item.unitPrice - item.product.purchaseCost;
        return itemSum + profit * item.quantity;
      }, 0);
    }, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { shopId, createdAt: { gte: thirtyDaysAgo } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    const productIdsSold = recentSales.map(s => s.productId);
    const productsSold = products.filter(p => productIdsSold.includes(p.id));
    const fastMovingItems = productsSold.slice(0, 5);
    const slowMovingItems = products.filter(p => !productIdsSold.includes(p.id)).slice(0, 5);

    return NextResponse.json({
      stats: {
        totalProducts,
        lowStockCount,
        totalInventoryValue,
        todaySales: todayRevenue,
        todayProfit,
        fastMovingItems,
        slowMovingItems,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}