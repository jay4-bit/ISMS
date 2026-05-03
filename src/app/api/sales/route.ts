import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

function generateReceiptNumber(): string {
  return 'RCP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

async function getCashierId(shopId: string) {
  let cashier = await prisma.user.findFirst({
    where: { role: 'OWNER', shopId }
  });
  
  if (!cashier) {
    cashier = await prisma.user.findFirst({
      where: { role: 'CASHIER', shopId }
    });
  }
  
  if (!cashier) {
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const uniqueSuffix = Date.now().toString(36);
    cashier = await prisma.user.create({
      data: {
        email: `cashier-${uniqueSuffix}@local`,
        password: hashedPassword,
        name: 'Cashier',
        role: 'CASHIER',
        shopId,
      }
    });
  }
  
  if (!cashier?.id) {
    throw new Error('No cashier found for shop');
  }
  
  return cashier.id;
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { 
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); 
    }
    
    const cashierId = await getCashierId(shopId);
    if (!cashierId) {
      return NextResponse.json({ error: 'Cashier not found' }, { status: 400 });
    }
    
    const body = await request.json();
    
    const { items, discount = 0, paymentMethod, saleType = 'RETAIL', customerName, customerPhone, customerAddress, amountPaid = 0, customerId, saveCustomer = false } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
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
    
const saleData: any = {
      receiptNumber: generateReceiptNumber(),
      shopId,
      subtotal,
      discount: discount || 0,
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
      cashierId,
      items: {
        create: saleItemsData,
      },
    };

    if (finalCustomerId) {
      saleData.customerId = finalCustomerId;
    }

    if (isCredit) {
      saleData.installmentTotal = total;
      saleData.installmentPaid = amountPaid;
      saleData.installmentDue = Math.max(0, total - amountPaid);
      saleData.nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Validate all product IDs exist
    for (const item of items) {
      const productExists = await prisma.product.findUnique({ where: { id: item.product.id } });
      if (!productExists) {
        console.error('Product not found:', item.product.id);
        return NextResponse.json({ error: `Product not found: ${item.product.id}` }, { status: 400 });
      }
    }

    // Validate cashier exists
    const cashierExists = await prisma.user.findUnique({ where: { id: cashierId } });
    if (!cashierExists) {
      console.error('Cashier not found:', cashierId);
      return NextResponse.json({ error: 'Cashier not found' }, { status: 400 });
    }

    console.log('All validations passed, creating sale with data:', JSON.stringify(saleData, null, 2));

    const sale = await prisma.sale.create({
      data: saleData,
      include: {
        items: { include: { product: true } },
        cashier: { select: { name: true, email: true } },
      },
    });
    console.log('Sale created successfully:', sale.id);

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
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const installment = searchParams.get('installment');

    if (id) {
      const sale = await prisma.sale.findUnique({
        where: { id, shopId },
        include: { 
          items: { include: { product: true } }, 
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
          items: { include: { product: true } }, 
          cashier: { select: { name: true } },
          installmentPayments: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ sales });
    }

    const sales = await prisma.sale.findMany({
      where: { shopId },
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
    console.error('Create sale error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to create sale',
      details: errorMessage
    }, { status: 500 });
  }
}