import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const body = await request.json();
    const { stockCounts } = body;

    if (!Array.isArray(stockCounts) || stockCounts.length === 0) {
      return NextResponse.json({ error: 'No stock counts provided' }, { status: 400 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const sc of stockCounts) {
      try {
        const { countNumber, status, notes, startedAt, completedAt, items } = sc;

        if (!countNumber) {
          results.failed++;
          results.errors.push('Missing countNumber');
          continue;
        }

        const existing = await prisma.stockCount.findUnique({ where: { countNumber } }).catch(() => null);
        if (existing) {
          results.failed++;
          results.errors.push(`Stock count ${countNumber} already exists`);
          continue;
        }

        let itemData: any[] | undefined;
        if (items && Array.isArray(items)) {
          itemData = [];
          for (const item of items) {
            const product = item.productId
              ? await prisma.product.findUnique({ where: { id: item.productId } }).catch(() => null)
              : null;
            itemData.push({
              productId: item.productId,
              systemQty: item.systemQty || product?.stockQuantity || 0,
              countedQty: item.countedQty ?? null,
              variance: item.variance ?? null,
              notes: item.notes || null,
            });
          }
        }

        await prisma.stockCount.create({
          data: {
            countNumber,
            status: status || 'COMPLETED',
            notes: notes || null,
            startedAt: startedAt ? new Date(startedAt) : undefined,
            completedAt: completedAt ? new Date(completedAt) : (status === 'COMPLETED' ? new Date() : null),
            createdBy: 'import',
            shopId,
            items: itemData ? { create: itemData } : undefined,
          },
        });

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing stock count ${sc.countNumber || 'unknown'}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Stock count import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
