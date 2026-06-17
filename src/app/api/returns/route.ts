import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logActivity } from '@/lib/activity-log';

async function generateReturnNumber(shopId: string): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const lastReturn = await prisma.return.findFirst({
      where: { shopId },
      orderBy: { returnNumber: 'desc' },
      select: { returnNumber: true },
    });
    let nextNum = 1;
    if (lastReturn?.returnNumber) {
      const match = lastReturn.returnNumber.match(/RET(\d{5})$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const candidate = 'RET' + String(nextNum).padStart(5, '0');
    const existing = await prisma.return.findUnique({
      where: { returnNumber: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return 'RET' + Date.now();
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
          purchaseCost: true,
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
        include: { items: { include: { product: { include: { electronicsFields: true } }, returnInstallmentPayments: { orderBy: { createdAt: 'desc' } } } } },
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
    const { items, reason, userId, userName } = body;

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
        returnCost: item.returnCost ?? 0,
        replacementProductName: item.replacementProductName || null,
        replacementProductId: item.replacementProductId || null,
        replacementProductPrice: replacementProductPrice,
        originalProductValue: originalProductValue,
        priceDifference: priceDifference,
        differencePaidBy: differencePaidBy,
        replacementPaymentMethod: item.replacementPaymentMethod || null,
        replacementPaidAmount: item.replacementPaidAmount || 0,
        replacementDiscount: item.replacementDiscount || 0,
        replacementIsInstallment: item.replacementIsInstallment || false,
        replacementInstallmentTotal: item.replacementInstallmentTotal || null,
        replacementInstallmentPaid: item.replacementInstallmentPaid || null,
        replacementInstallmentCustomerName: item.replacementInstallmentCustomerName || null,
        replacementInstallmentCustomerPhone: item.replacementInstallmentCustomerPhone || null,
        replacementRefundGiven: item.replacementRefundGiven ?? (priceDifference < 0 ? Math.abs(priceDifference) : 0),
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

    // Validate replacement product stock before processing
    for (const item of items) {
      if (item.awardedType === 'REPLACEMENT' && item.replacementProductId) {
        const repProduct = await prisma.product.findUnique({ where: { id: item.replacementProductId } });
        if (repProduct && repProduct.stockQuantity < (item.quantity || 1)) {
          return NextResponse.json({ error: `Insufficient stock for replacement product ${repProduct.name}. Available: ${repProduct.stockQuantity}, needed: ${item.quantity || 1}` }, { status: 400 });
        }
      }
    }

    let returnRecord;
    let returnNumber = '';
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      returnNumber = await generateReturnNumber(shopId);
      try {
        returnRecord = await prisma.return.create({
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
        break;
      } catch (err: any) {
        if (err?.code === 'P2002' && attempt < maxRetries - 1) continue;
        console.error('Create return error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create return' }, { status: 500 });
      }
    }
    if (!returnRecord) {
      return NextResponse.json({ error: 'Failed to create return, please try again' }, { status: 500 });
    }

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
      } else if (item.awardedType === 'REFUND') {
        // Money back → product comes back to inventory as faulty
        await prisma.product.update({
          where: { id: item.productId },
          data: { isFaulty: true, stockQuantity: { increment: item.quantity } },
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

    await logActivity({
      shopId, userId: userId || 'system', userName: userName || 'System',
      action: 'SALE_RETURNED',
      details: `Return ${returnNumber} — ${returnRecord.items.length} items, refund ${returnRecord.totalRefund}`,
    });

    return NextResponse.json({ return: returnRecord });
  } catch (error) {
    console.error('Create return error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { id, status, amount, notes } = body;

    // Record installment payment on a return item
    if (amount !== undefined) {
      const returnItem = await prisma.returnItem.findFirst({
        where: { id, return: { shopId } },
      });
      if (!returnItem) {
        return NextResponse.json({ error: 'Return item not found' }, { status: 404 });
      }

      const total = returnItem.replacementInstallmentTotal || returnItem.priceDifference || 0;
      const currentPaid = returnItem.replacementInstallmentPaid || 0;
      const newPaid = currentPaid + amount;
      const newDue = Math.max(0, total - newPaid);

      const updated = await prisma.returnItem.update({
        where: { id },
        data: { replacementInstallmentPaid: newPaid },
      });

      await prisma.returnInstallmentPayment.create({
        data: {
          returnItemId: id,
          amount: total,
          amountPaid: amount,
          balance: newDue,
          paidAt: new Date(),
          notes: notes || null,
        },
      });

      return NextResponse.json({ returnItem: updated });
    }

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
      const prod = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { stockQuantity: true },
      });
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: Math.max(0, (prod?.stockQuantity || 0) - item.quantity),
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