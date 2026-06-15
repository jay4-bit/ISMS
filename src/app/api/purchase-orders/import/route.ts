import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const body = await request.json();
    const { orders } = body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const order of orders) {
      try {
        const { orderNumber, supplierName, status, totalAmount, paidAmount, notes, expectedDelivery, receivedAt, createdAt, items } = order;

        if (!orderNumber || !supplierName) {
          results.failed++;
          results.errors.push(`Missing orderNumber or supplierName for order`);
          continue;
        }

        const existing = await prisma.purchaseOrder.findUnique({ where: { orderNumber } }).catch(() => null);
        if (existing) {
          results.failed++;
          results.errors.push(`Order ${orderNumber} already exists`);
          continue;
        }

        let supplier = await prisma.supplier.findFirst({ where: { name: supplierName, shopId } });
        if (!supplier) {
          supplier = await prisma.supplier.create({ data: { name: supplierName, shopId } });
        }

        const created = await prisma.purchaseOrder.create({
          data: {
            orderNumber,
            supplierId: supplier.id,
            status: status || 'PENDING',
            totalAmount: totalAmount || 0,
            paidAmount: paidAmount || 0,
            notes: notes || null,
            expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
            receivedAt: receivedAt ? new Date(receivedAt) : null,
            createdBy: 'import',
            shopId,
            createdAt: createdAt ? new Date(createdAt) : undefined,
            items: items && Array.isArray(items) ? {
              create: items.map((item: any) => ({
                productId: item.productId || null,
                quantityOrdered: item.quantityOrdered || 1,
                quantityReceived: item.quantityReceived || 0,
                unitCost: item.unitCost || 0,
                totalCost: item.totalCost || ((item.quantityOrdered || 1) * (item.unitCost || 0)),
                productName: item.productName || null,
                productSku: item.productSku || null,
                productBarcode: item.productBarcode || null,
                sellingPrice: item.sellingPrice || null,
                wholesalePrice: item.wholesalePrice || null,
                electronicsBrand: item.electronicsBrand || null,
                electronicsModel: item.electronicsModel || null,
                electronicsImei: item.electronicsImei || null,
                electronicsColor: item.electronicsColor || null,
                electronicsStorage: item.electronicsStorage || null,
                electronicsCondition: item.electronicsCondition || null,
                pharmacyBrandName: item.pharmacyBrandName || null,
                pharmacyGenericName: item.pharmacyGenericName || null,
                pharmacyBatchNumber: item.pharmacyBatchNumber || null,
                pharmacyManufacturingDate: item.pharmacyManufacturingDate ? new Date(item.pharmacyManufacturingDate) : null,
                pharmacyExpiryDate: item.pharmacyExpiryDate ? new Date(item.pharmacyExpiryDate) : null,
                pharmacyCategoryName: item.pharmacyCategoryName || null,
                clothingBrand: item.clothingBrand || null,
                clothingVariants: item.clothingVariants || null,
                clothingCategoryName: item.clothingCategoryName || null,
              })),
            } : undefined,
          },
        });

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing order ${order.orderNumber || 'unknown'}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Purchase order import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
