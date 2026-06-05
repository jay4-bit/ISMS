import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const userId = request.headers.get('x-user-id');
    if (!shopId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the shop owner can export all data' }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      where: { shopId },
      include: {
        variants: true,
        priceTags: true,
        pharmacyFields: true,
        liquorFields: true,
        electronicsFields: true,
        clothingFields: true,
      },
    });
    const sales = await prisma.sale.findMany({
      where: { shopId },
      include: { items: true, installmentPayments: true },
    });

    const [
      categories, suppliers, brands, customers,
      returns, returnItems, expenses,
      users, shop, settings, activities, returnInstallmentPayments,
    ] = await Promise.all([
      prisma.category.findMany({ where: { shopId } }),
      prisma.supplier.findMany({ where: { shopId } }),
      prisma.brand.findMany({ where: { shopId } }),
      prisma.customer.findMany({ where: { shopId } }),
      prisma.return.findMany({ where: { shopId }, include: { items: true } }),
      prisma.returnItem.findMany({ where: { return: { shopId } } }),
      prisma.expense.findMany({ where: { shopId } }),
      prisma.user.findMany({ where: { shopId }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
      prisma.shop.findUnique({ where: { id: shopId }, select: { name: true, shopType: true, currency: true, createdAt: true } }),
      prisma.shopSettings.findUnique({ where: { shopId } }),
      prisma.activity.findMany({ where: { shopId }, orderBy: { createdAt: 'desc' }, take: 1000 }),
      prisma.returnInstallmentPayment.findMany({ where: { returnItem: { return: { shopId } } } }),
    ]);

    const data = {
      exportedAt: new Date().toISOString(),
      shop: { ...shop, settings },
      users,
      categories,
      suppliers,
      brands,
      customers,
      products,
      sales,
      returns,
      returnItems,
      returnInstallmentPayments,
      expenses,
      recentActivities: activities,
    };

    const json = JSON.stringify(data, null, 2);
    const fileName = `${shop?.name || 'shop'}-data-export-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Export data error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to export data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
