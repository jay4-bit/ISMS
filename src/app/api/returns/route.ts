import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateReturnNumber } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const products = searchParams.get('products');

    if (products === 'true') {
      const productList = await prisma.product.findMany({
        where: { 
          stockQuantity: { gt: 0 },
          isFaulty: false
        },
        select: { 
          id: true, 
          name: true, 
          sku: true, 
          sellingPrice: true, 
          stockQuantity: true,
          barcode: true
        },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json({ products: productList });
    }

    if (id) {
      const returnRecord = await prisma.return.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });
      return NextResponse.json({ return: returnRecord });
    }

    const returns = await prisma.return.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ returns });
  } catch (error) {
    console.error('Get returns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, reason } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items to return' }, { status: 400 });
    }

    const returnItemsData = await Promise.all(items.map(async (item: any) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      let originalProductValue = item.originalProductValue || 0;
      let replacementProductPrice = item.replacementProductPrice || 0;
      let priceDifference = 0;
      let differencePaidBy = 'CLIENT';

      if (item.awardedType === 'REPLACEMENT' && item.replacementProductId) {
        const replacementProduct = await prisma.product.findUnique({
          where: { id: item.replacementProductId }
        });
        
        if (replacementProduct) {
          replacementProductPrice = replacementProduct.sellingPrice;
        }
        
        if (!originalProductValue && product) {
          originalProductValue = product.sellingPrice;
        }

        priceDifference = replacementProductPrice - originalProductValue;
        
        if (priceDifference > 0) {
          differencePaidBy = 'CLIENT';
        } else if (priceDifference < 0) {
          differencePaidBy = 'BUSINESS';
          priceDifference = Math.abs(priceDifference);
        }
      }

      return {
        productId: item.productId,
        quantity: item.quantity,
        reason: item.reason || '',
        status: item.status,
        refundAmount: item.refundAmount || 0,
        supplierId: item.supplierId || null,
        supplierName: item.supplierName || null,
        awardedType: item.awardedType || 'REFUND',
        awardedAmount: item.awardedAmount || 0,
        repairCost: item.repairCost || 0,
        replacementProductName: item.replacementProductName || null,
        replacementProductId: item.replacementProductId || null,
        replacementProductPrice: replacementProductPrice,
        originalProductValue: originalProductValue,
        priceDifference: priceDifference,
        differencePaidBy: differencePaidBy,
        notes: item.notes || null,
      };
    }));

    const totalRefund = items.reduce((sum: number, item: any) => {
      if (item.awardedType === 'REFUND') {
        return sum + (item.refundAmount || 0);
      }
      return sum;
    }, 0);

    const totalPriceDiff = returnItemsData.reduce((sum, item) => {
      return sum + (item.priceDifference || 0);
    }, 0);

    const returnRecord = await prisma.return.create({
      data: {
        returnNumber: generateReturnNumber(),
        reason,
        processedBy: 'demo-admin',
        totalRefund: totalRefund + totalPriceDiff,
        items: {
          create: returnItemsData,
        },
      },
      include: { items: { include: { product: true } } },
    });

    for (const item of items) {
      if (item.status === 'FAULTY' || item.status === 'DISCARDED') {
        await prisma.product.update({
          where: { id: item.productId },
          data: { isFaulty: true },
        });
      } else if (item.status === 'RESELLABLE') {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }

      if (item.awardedType === 'REPLACEMENT' && item.replacementProductId) {
        await prisma.product.update({
          where: { id: item.replacementProductId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }
    }

    return NextResponse.json({ return: returnRecord });
  } catch (error) {
    console.error('Create return error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    const returnItem = await prisma.returnItem.update({
      where: { id },
      data: { status },
      include: { product: true },
    });

    return NextResponse.json({ returnItem });
  } catch (error) {
    console.error('Update return error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Return ID required' }, { status: 400 });
    }

    await prisma.returnItem.deleteMany({
      where: { returnId: id }
    });

    await prisma.return.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete return error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
