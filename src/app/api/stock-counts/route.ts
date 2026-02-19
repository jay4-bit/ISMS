import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const stockCounts = await prisma.stockCount.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const countsWithMeta = stockCounts.map((sc) => ({
      ...sc,
      itemCount: sc.items.length,
      varianceCount: sc.items.filter((item) => item.variance && item.variance !== 0).length,
    }));

    return NextResponse.json({ stockCounts: countsWithMeta });
  } catch (error) {
    console.error('Error fetching stock counts:', error);
    return NextResponse.json({ error: 'Failed to fetch stock counts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { notes, productIds } = body;

    const countNumber = `SC-${Date.now()}`;

    const stockCount = await prisma.stockCount.create({
      data: {
        countNumber,
        notes: notes || null,
        createdBy: 'system',
        items: productIds && productIds.length > 0
          ? {
              create: await Promise.all(
                productIds.map(async (productId: string) => {
                  const product = await prisma.product.findUnique({
                    where: { id: productId },
                  });
                  return {
                    productId,
                    systemQty: product?.stockQuantity || 0,
                    countedQty: null,
                    variance: null,
                  };
                })
              ),
            }
          : undefined,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(stockCount);
  } catch (error) {
    console.error('Error creating stock count:', error);
    return NextResponse.json({ error: 'Failed to create stock count' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, items, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Stock count ID required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (status) {
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
      updateData.status = status;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (items && items.length > 0) {
      for (const item of items) {
        const variance = item.countedQty !== null ? item.countedQty - item.systemQty : null;
        await prisma.stockCountItem.update({
          where: { id: item.id },
          data: {
            countedQty: item.countedQty,
            variance,
            notes: item.notes || null,
          },
        });

        if (status === 'COMPLETED' && item.countedQty !== null) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: item.countedQty,
            },
          });
        }
      }
    }

    const stockCount = await prisma.stockCount.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(stockCount);
  } catch (error) {
    console.error('Error updating stock count:', error);
    return NextResponse.json({ error: 'Failed to update stock count' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Stock count ID required' }, { status: 400 });
    }

    await prisma.stockCountItem.deleteMany({ where: { stockCountId: id } });
    await prisma.stockCount.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting stock count:', error);
    return NextResponse.json({ error: 'Failed to delete stock count' }, { status: 500 });
  }
}
