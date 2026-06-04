import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

async function generateReturnNumber(shopId: string): Promise<string> {
  const lastReturn = await prisma.return.findFirst({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
    select: { returnNumber: true },
  });
  let nextNum = 1;
  if (lastReturn?.returnNumber) {
    const match = lastReturn.returnNumber.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return 'RET' + String(nextNum).padStart(5, '0');
}

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const products = searchParams.get('products');
    const soldOnly = searchParams.get('soldOnly');

    if (soldOnly === 'true') {
      const soldProductIds = await prisma.saleItem.findMany({
        where: { sale: { shopId } },
        select: { productId: true },
        distinct: ['productId']
      });
      const ids = soldProductIds.map(s => s.productId);
      const productList = await prisma.product.findMany({
        where: { shopId, id: { in: ids } },
        select: {
          id: true, name: true, sku: true, sellingPrice: true,
          stockQuantity: true, barcode: true, supplierId: true,
          supplier: { select: { id: true, name: true } },
          electronicsFields: { select: { imei: true } }
        },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json({ products: productList });
    }

    if (products === 'true') {
      const productList = await prisma.product.findMany({
        where: { 
          shopId,
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

    async function enrichWithReplacementData(items: any[]) {
      for (const item of items) {
        if (item.replacementProductId) {
          const repProduct = await prisma.product.findUnique({
            where: { id: item.replacementProductId },
            include: { electronicsFields: true },
          });
          item.replacementProduct = repProduct ? { electronicsFields: repProduct.electronicsFields } : null;
        }
      }
    }

    if (id) {
      const returnRecord = await prisma.return.findUnique({
        where: { id, shopId },
        include: { items: { include: { product: { include: { electronicsFields: true } } } } },
      });
      if (returnRecord) {
        await enrichWithReplacementData(returnRecord.items);
      }
      return NextResponse.json({ return: returnRecord });
    }

    const returns = await prisma.return.findMany({
      where: { shopId },
      include: { items: { include: { product: { include: { electronicsFields: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    for (const r of returns) {
      await enrichWithReplacementData(r.items);
    }

    return NextResponse.json({ returns });
  } catch (error) {
    console.error('Get returns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

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
        refundAmount: item.awardedType === 'REFUND' ? (item.refundAmount || 0) : 0,
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

    const returnNumber = await generateReturnNumber(shopId);

    const returnRecord = await prisma.return.create({
      data: {
        returnNumber,
        reason,
        processedBy: 'demo-admin',
        totalRefund: totalRefund + totalPriceDiff,
        shopId,
        items: {
          create: returnItemsData,
        },
      },
      include: { items: { include: { product: true } } },
    });

    for (const item of items) {
      if (item.awardedType === 'REPLACEMENT' && item.replacementProductId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { isFaulty: true, stockQuantity: { increment: item.quantity } },
        });
        await prisma.product.update({
          where: { id: item.replacementProductId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      } else {
        if (item.status === 'FAULTY' || item.status === 'DISCARDED') {
          await prisma.product.update({
            where: { id: item.productId },
            data: { isFaulty: true, stockQuantity: { increment: item.quantity } },
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
    }

    return NextResponse.json({ return: returnRecord });
  } catch (error) {
    console.error('Create return error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { id, status } = body;

    const returnItem = await prisma.returnItem.update({
      where: { id, return: { shopId } },
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
    const shopId = request.headers.get('x-shop-id') || undefined;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || !shopId) {
      return NextResponse.json({ error: 'Return ID and Shop ID required' }, { status: 400 });
    }

    const returnItems = await prisma.returnItem.findMany({
      where: { return: { id, shopId } },
      select: { productId: true, quantity: true, awardedType: true, replacementProductId: true },
    });

    for (const item of returnItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: { decrement: item.quantity },
          isFaulty: false,
        },
      });
      if (item.replacementProductId) {
        await prisma.product.update({
          where: { id: item.replacementProductId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }

    await prisma.returnItem.deleteMany({
      where: { returnId: id, return: { shopId } }
    });

    await prisma.return.delete({
      where: { id, shopId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete return error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}