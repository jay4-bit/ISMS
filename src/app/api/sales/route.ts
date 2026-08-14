import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { randomUUID } from 'node:crypto';

function generateReceiptNumber(shopId: string): string {
  return `RCP-${shopId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { 
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); 
    }
    
    const cashierId = request.headers.get('x-user-id');
    const cashier = cashierId ? await prisma.user.findFirst({ where: { id: cashierId, shopId, isActive: true } }) : null;
    if (!cashier) {
      return NextResponse.json({ error: 'Cashier not found' }, { status: 400 });
    }
    
    const body = await request.json();
    
    const { items, discount = 0, paymentMethod, saleType = 'RETAIL', customerName, customerPhone, customerAddress, amountPaid = 0, customerId, saveCustomer = false } = body;

    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }
    if (!['CASH', 'CARD', 'MOBILE', 'CREDIT'].includes(paymentMethod) || !['RETAIL', 'WHOLESALE'].includes(saleType)) {
      return NextResponse.json({ error: 'Invalid payment method or sale type' }, { status: 400 });
    }

    const isCredit = paymentMethod === 'CREDIT';
    const useWholesale = saleType === 'WHOLESALE';
    
    let finalCustomerId = customerId;
    
    if (saveCustomer && customerName) {
      let customer = null;
      if (customerPhone) {
        customer = await prisma.customer.findFirst({ where: { phone: customerPhone, shopId } });
      }
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: customerName,
            phone: customerPhone || null,
            email: null,
            address: customerAddress || null,
            shopId,
          }
        });
      }
      finalCustomerId = customer.id;
    }
    
    const productIds = [...new Set(items.map((item: any) => item?.product?.id).filter(Boolean))] as string[];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, shopId },
      select: { id: true, name: true, sellingPrice: true, wholesalePrice: true, stockQuantity: true },
    });
    if (products.length !== productIds.length) return NextResponse.json({ error: 'One or more products are invalid' }, { status: 400 });
    const productsById = new Map(products.map(product => [product.id, product]));

    let subtotal = 0;
    const saleItemsData: Array<{ productId: string; quantity: number; unitPrice: number; discount: number; total: number }> = [];
    for (const item of items) {
      const product = productsById.get(item?.product?.id);
      const qty = Number(item.quantity);
      if (!product || !Number.isSafeInteger(qty) || qty < 1 || qty > 100_000) {
        return NextResponse.json({ error: 'Invalid sale quantity' }, { status: 400 });
      }
      const itemDiscount = Number(item.discount || 0);
      const price = useWholesale && product.wholesalePrice != null ? product.wholesalePrice : product.sellingPrice;
      const lineTotal = price * qty;
      if (!Number.isFinite(itemDiscount) || itemDiscount < 0 || itemDiscount > lineTotal) {
        return NextResponse.json({ error: 'Invalid item discount' }, { status: 400 });
      }
      subtotal += lineTotal;
      saleItemsData.push({ productId: product.id, quantity: qty, unitPrice: price, discount: itemDiscount, total: lineTotal - itemDiscount });
    }

    const orderDiscount = Number(discount || 0);
    if (!Number.isFinite(orderDiscount) || orderDiscount < 0 || orderDiscount > subtotal) {
      return NextResponse.json({ error: 'Invalid sale discount' }, { status: 400 });
    }
    const total = subtotal - orderDiscount;
    const numericAmountPaid = Number(amountPaid);
    if (!Number.isFinite(numericAmountPaid) || numericAmountPaid < 0) return NextResponse.json({ error: 'Invalid amount paid' }, { status: 400 });
    const paid = isCredit ? numericAmountPaid : total;
    const change = paymentMethod === 'CASH' ? Math.max(0, numericAmountPaid - total) : 0;

    const receiptNumber = generateReceiptNumber(shopId);
    const saleData: any = {
      receiptNumber,
      shopId,
      subtotal,
      discount: orderDiscount,
      total,
      paymentMethod,
      saleType,
      amountPaid: paid,
      changeGiven: change,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      customerAddress: customerAddress || null,
      isInstallment: isCredit,
      saleStatus: isCredit ? 'INSTALLMENT' : 'COMPLETE',
      isPaid: !isCredit,
      cashierId: cashier.id,
      items: {
        create: saleItemsData,
      },
    };

    if (finalCustomerId) {
      saleData.customerId = finalCustomerId;
    }

    if (isCredit) {
      saleData.installmentTotal = total;
      saleData.installmentPaid = numericAmountPaid;
      saleData.installmentDue = Math.max(0, total - numericAmountPaid);
      saleData.nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const sale = await prisma.$transaction(async tx => {
      for (const item of saleItemsData) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, shopId, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (updated.count !== 1) throw new Error('INSUFFICIENT_STOCK');
      }
      const createdSale = await tx.sale.create({
          data: saleData,
          include: {
            items: { include: { product: { include: { electronicsFields: true } } } },
            cashier: { select: { name: true, email: true } },
          },
      });
      if (finalCustomerId) {
        const updatedCustomer = await tx.customer.updateMany({
          where: { id: finalCustomerId, shopId },
          data: { totalPurchases: { increment: total } },
        });
        if (updatedCustomer.count !== 1) throw new Error('INVALID_CUSTOMER');
      }
      return createdSale;
    });

    logActivity({
      shopId, userId: cashier.id, userName: cashier.name,
      action: 'SALE_CREATED',
      details: `Sale ${receiptNumber} — ${total.toLocaleString()} (${items.length} items)`,
    });

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('Sale error:', error);
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') {
      return NextResponse.json({ error: 'Insufficient stock; inventory changed while processing the sale' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Sale failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const installment = searchParams.get('installment');

    if (id) {
      const sale = await prisma.sale.findUnique({
        where: { id, shopId },
        include: { 
          items: { include: { product: { include: { electronicsFields: true } } } }, 
          cashier: { select: { name: true } },
          installmentPayments: true,
        },
      });
      return NextResponse.json({ sale });
    }

    if (installment === 'true') {
      const sales = await prisma.sale.findMany({
        where: { 
          shopId,
          isInstallment: true,
        },
        include: { 
          items: { include: { product: { include: { electronicsFields: true } } } }, 
          cashier: { select: { name: true } },
          installmentPayments: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ sales });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const search = searchParams.get('search') || '';
    const timeFilter = searchParams.get('timeFilter') || 'ALL';
    const skip = (page - 1) * limit;

    const where: any = { shopId };

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (timeFilter !== 'ALL') {
      const now = new Date();
      let startDate: Date;
      switch (timeFilter) {
        case 'TODAY':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'WEEK':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'MONTH':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3MONTHS':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '6MONTHS':
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case 'YEAR':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      where.createdAt = { gte: startDate };
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { 
          items: { include: { product: { include: { electronicsFields: true } } } }, 
          cashier: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({
      sales,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); }
    const body = await request.json();
    const { id, amount, notes } = body;

    const sale = await prisma.sale.findUnique({ where: { id, shopId } });
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const newPaid = (sale.installmentPaid || 0) + amount;
    const newDue = (sale.installmentTotal || 0) - newPaid;

    const updatedSale = await prisma.sale.update({
      where: { id, shopId },
      data: {
        installmentPaid: newPaid,
        installmentDue: newDue,
        amountPaid: { increment: amount },
      },
      include: {
        items: { include: { product: { include: { electronicsFields: true } } } },
        cashier: { select: { name: true } },
      },
    });

    await prisma.installmentPayment.create({
      data: {
        saleId: id,
        amount: sale.total,
        amountPaid: amount,
        balance: newDue,
        paidAt: new Date(),
        notes: notes || null,
      },
    });

    if (newDue <= 0) {
      const finalSale = await prisma.sale.update({
        where: { id, shopId },
        data: {
          saleStatus: 'COMPLETE',
          isPaid: true,
        },
        include: {
          items: { include: { product: { include: { electronicsFields: true } } } },
          cashier: { select: { name: true } },
        },
      });
      return NextResponse.json({ sale: finalSale });
    }

    return NextResponse.json({ sale: updatedSale });
} catch (error) {
    console.error('Create sale error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to create sale',
      details: errorMessage
    }, { status: 500 });
  }
}
