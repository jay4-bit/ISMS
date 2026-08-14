import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const shopId = request.headers.get('x-shop-id');

    if (!id || !shopId) {
      return NextResponse.json({ error: 'Sale ID required' }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id, shopId },
      include: {
        items: { include: { product: true } },
        cashier: { select: { name: true } },
        customer: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
