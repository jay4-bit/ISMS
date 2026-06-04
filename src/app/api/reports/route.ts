import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const categoryId = searchParams.get('categoryId');
    const productId = searchParams.get('productId');
    const search = searchParams.get('search')?.trim();
    const type = searchParams.get('type') || 'sales';

    const where: any = { shopId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (type === 'sales') {
      const sales = await prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                include: { category: true, electronicsFields: true },
              },
            },
          },
          cashier: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      let filteredSales = sales;
      if (categoryId) {
        filteredSales = sales.filter(s => s.items.some(i => i.product.categoryId === categoryId));
      }
      if (productId) {
        filteredSales = filteredSales.filter(s => s.items.some(i => i.productId === productId));
      }
      if (search) {
        const q = search.toLowerCase();
        filteredSales = filteredSales.filter(s =>
          s.items.some(i =>
            i.product.name.toLowerCase().includes(q) ||
            i.product.sku.toLowerCase().includes(q)
          )
        );
      }

      const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
      const totalDiscount = filteredSales.reduce((sum, s) => sum + s.discount, 0);
      const itemsSold = filteredSales.reduce((sum, s) => sum + s.items.reduce((i, item) => i + item.quantity, 0), 0);
      const totalProfit = filteredSales.reduce((sum, s) => {
        return sum + s.items.reduce((itemSum, item) => {
          const profit = item.unitPrice - item.product.purchaseCost;
          return itemSum + profit * item.quantity;
        }, 0);
      }, 0);

      const dailySales: Record<string, { revenue: number; profit: number; quantity: number }> = {};
      for (const sale of filteredSales) {
        const date = sale.createdAt.toISOString().split('T')[0];
        if (!dailySales[date]) {
          dailySales[date] = { revenue: 0, profit: 0, quantity: 0 };
        }
        dailySales[date].revenue += sale.total;
        dailySales[date].quantity += sale.items.reduce((sum, i) => sum + i.quantity, 0);
        dailySales[date].profit += sale.items.reduce((sum, i) => {
          return sum + (i.unitPrice - i.product.purchaseCost) * i.quantity;
        }, 0);
      }

      return NextResponse.json({
        report: {
          sales: filteredSales,
          totalRevenue,
          totalProfit,
          totalDiscount,
          itemsSold,
          dailySales,
        },
      });
    }

    if (type === 'returns') {
      const returns = await prisma.return.findMany({
        where,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
      });

      let filteredReturns = returns;
      if (search) {
        const q = search.toLowerCase();
        filteredReturns = returns.filter(r =>
          r.items.some(i =>
            i.product.name.toLowerCase().includes(q) ||
            i.product.sku.toLowerCase().includes(q)
          )
        );
      }

      const totalRefunds = filteredReturns.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.refundAmount, 0), 0);
      const faultyLoss = filteredReturns
        .filter(r => r.items.some(i => i.status === 'FAULTY' || i.status === 'DISCARDED'))
        .reduce((sum, r) => sum + r.items.filter(i => i.status === 'FAULTY' || i.status === 'DISCARDED').reduce((s, i) => s + i.refundAmount, 0), 0);

      return NextResponse.json({
        report: { returns: filteredReturns, totalRefunds, faultyLoss },
      });
    }

    if (type === 'inventory') {
      const products = await prisma.product.findMany({
        where: { shopId },
        include: { category: true },
      });

      let filteredProducts = products;
      if (categoryId) {
        filteredProducts = products.filter(p => p.categoryId === categoryId);
      }
      if (productId) {
        filteredProducts = filteredProducts.filter(p => p.id === productId);
      }
      if (search) {
        const q = search.toLowerCase();
        filteredProducts = filteredProducts.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
        );
      }

      const totalValue = filteredProducts.reduce((sum, p) => sum + p.sellingPrice * p.stockQuantity, 0);
      const totalCost = filteredProducts.reduce((sum, p) => sum + p.purchaseCost * p.stockQuantity, 0);

      return NextResponse.json({
        report: {
          products: filteredProducts,
          totalValue,
          totalCost,
          totalProfit: totalValue - totalCost,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}