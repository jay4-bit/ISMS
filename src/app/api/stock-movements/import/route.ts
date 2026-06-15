import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const body = await request.json();
    const { movements } = body;

    if (!Array.isArray(movements) || movements.length === 0) {
      return NextResponse.json({ error: 'No movements provided' }, { status: 400 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const mov of movements) {
      try {
        const { productId, type, quantity, reference, reason, createdAt } = mov;

        if (!productId || !type || quantity === undefined) {
          results.failed++;
          results.errors.push(`Missing required fields (productId, type, quantity) for movement`);
          continue;
        }

        const validTypes = ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'RETURN_RESELLABLE', 'RETURN_FAULTY', 'DAMAGE', 'THEFT', 'EXPIRED', 'AUDIT'];
        if (!validTypes.includes(type)) {
          results.failed++;
          results.errors.push(`Invalid stock movement type: ${type}`);
          continue;
        }

        const product = await prisma.product.findUnique({ where: { id: productId, shopId } });
        if (!product) {
          results.failed++;
          results.errors.push(`Product ${productId} not found in shop`);
          continue;
        }

        await prisma.stockMovement.create({
          data: {
            productId,
            type,
            quantity: parseInt(quantity) || 0,
            reference: reference || null,
            reason: reason || null,
            createdBy: 'import',
            createdAt: createdAt ? new Date(createdAt) : undefined,
          },
        });

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing movement: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Stock movements import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
