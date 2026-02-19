import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateReceiptNumber } from '@/lib/utils';
import bcrypt from 'bcryptjs';

async function getCashierId() {
  let cashier = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  
  if (!cashier) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    cashier = await prisma.user.create({
      data: {
        email: 'admin@isms.local',
        password: hashedPassword,
        name: 'Administrator',
        role: 'ADMIN',
      }
    });
  }
  
  return cashier.id;
}

export async function POST(request: NextRequest) {
  try {
    const cashierId = await getCashierId();
    const body = await request.json();
    
    const { items, discount = 0, paymentMethod, saleType = 'RETAIL', customerName, customerPhone, amountPaid = 0 } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    const isCredit = paymentMethod === 'CREDIT';
    const useWholesale = saleType === 'WHOLESALE';
    
    let subtotal = 0;
    const saleItemsData = [];
    
    for (const item of items) {
      const price = useWholesale && item.product.wholesalePrice ? item.product.wholesalePrice : item.product.sellingPrice;
      const qty = item.quantity || 1;
      const lineTotal = price * qty;
      subtotal += lineTotal;
      
      saleItemsData.push({
        productId: item.product.id,
        quantity: qty,
        unitPrice: price,
        discount: item.discount || 0,
        total: lineTotal - (item.discount || 0),
      });
    }
    
    const total = subtotal - (discount || 0);
    const paid = isCredit ? amountPaid : total;
    const change = paymentMethod === 'CASH' ? Math.max(0, amountPaid - total) : 0;
    
    const sale = await prisma.sale.create({
      data: {
        receiptNumber: generateReceiptNumber(),
        subtotal,
        discount: discount || 0,
        total,
        paymentMethod,
        saleType,
        amountPaid: paid,
        changeGiven: change,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        isInstallment: isCredit,
        installmentTotal: isCredit ? total : null,
        installmentPaid: isCredit ? amountPaid : null,
        installmentDue: isCredit ? Math.max(0, total - amountPaid) : null,
        nextPaymentDate: isCredit ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        cashierId,
        items: {
          create: saleItemsData,
        },
      },
      include: {
        items: { include: { product: true } },
        cashier: { select: { name: true, email: true } },
      },
    });

    // Update stock
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.product.id },
        data: { stockQuantity: { decrement: item.quantity || 1 } },
      });
    }

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('Sale error:', error);
    return NextResponse.json({ error: 'Sale failed: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const installment = searchParams.get('installment');

    if (id) {
      const sale = await prisma.sale.findUnique({
        where: { id },
        include: { 
          items: { include: { product: true } }, 
          cashier: { select: { name: true } },
          payments: true,
        },
      });
      return NextResponse.json({ sale });
    }

    if (installment === 'true') {
      const sales = await prisma.sale.findMany({
        where: { 
          isInstallment: true,
        },
        include: { 
          items: { include: { product: true } }, 
          cashier: { select: { name: true } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ sales });
    }

    const sales = await prisma.sale.findMany({
      include: { 
        items: { include: { product: true } }, 
        cashier: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ sales });
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, amount, notes } = body;

    const sale = await prisma.sale.findUnique({ where: { id } });
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const newPaid = sale.installmentPaid + amount;
    const newDue = (sale.installmentTotal || 0) - newPaid;

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        installmentPaid: newPaid,
        installmentDue: newDue,
        amountPaid: { increment: amount },
      },
      include: {
        items: { include: { product: true } },
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
      for (const item of updatedSale.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }
    }

    return NextResponse.json({ sale: updatedSale });
  } catch (error) {
    console.error('Update sale error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
