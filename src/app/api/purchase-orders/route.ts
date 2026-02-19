import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      supplierName: o.supplier.name,
      status: o.status,
      totalAmount: o.totalAmount,
      paidAmount: o.paidAmount,
      expectedDelivery: o.expectedDelivery,
      createdAt: o.createdAt,
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplierId, items, notes, expectedDelivery } = body;

    const orderNumber = 'PO' + Date.now().toString(36).toUpperCase();
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.quantity * item.unitCost, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        totalAmount,
        notes,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        createdBy: 'admin',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantityOrdered: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
          })),
        },
      },
      include: { supplier: true },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Create purchase order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, paidAmount } = body;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (status === 'RECEIVED') {
      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantityReceived } }
        });

        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'STOCK_IN',
            quantity: item.quantityReceived,
            reference: order.orderNumber,
            reason: 'Purchase Order Received'
          }
        });
      }
    }

    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        ...(paidAmount !== undefined && { paidAmount }),
        ...(status === 'RECEIVED' && { receivedAt: new Date() })
      },
      include: { supplier: true }
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Update purchase order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: id }
    });

    await prisma.purchaseOrder.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
