import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

async function generateOrderNumber(shopId: string): Promise<string> {
  const lastOrder = await prisma.purchaseOrder.findFirst({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  });
  let nextNum = 1;
  if (lastOrder?.orderNumber) {
    const match = lastOrder.orderNumber.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return 'PO' + String(nextNum).padStart(5, '0');
}

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const orders = await prisma.purchaseOrder.findMany({
      where: { shopId },
      include: { supplier: true, items: { include: { product: { include: { electronicsFields: true, pharmacyFields: true } } } } },
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
      receivedAt: o.receivedAt,
      createdAt: o.createdAt,
        items: o.items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || item.productName || `${item.electronicsBrand || ''} ${item.electronicsModel || ''}`.trim() || [item.pharmacyBrandName, item.pharmacyGenericName].filter(Boolean).join(' ') || 'New Product',
          productImei: (item.product as any)?.electronicsFields?.imei || item.electronicsImei || null,
          productBrand: item.electronicsBrand || null,
          productModel: item.electronicsModel || null,
          productColor: item.electronicsColor || null,
          productStorage: item.electronicsStorage || null,
          productCondition: item.electronicsCondition || null,
          pharmacyBrandName: item.pharmacyBrandName || null,
          pharmacyGenericName: item.pharmacyGenericName || null,
          pharmacyBatchNumber: item.pharmacyBatchNumber || null,
          pharmacyManufacturingDate: item.pharmacyManufacturingDate || null,
          pharmacyExpiryDate: item.pharmacyExpiryDate || null,
          clothingBrand: item.clothingBrand || null,
          clothingVariants: item.clothingVariants || null,
          clothingCategoryName: item.clothingCategoryName || null,
        sellingPrice: item.sellingPrice || null,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: item.quantityReceived,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        isPendingProduct: !item.productId,
      })),
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error('Get purchase orders error:', error);
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
    const { supplierId, items, notes, expectedDelivery } = body;

    const orderNumber = await generateOrderNumber(shopId);
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.quantity * item.unitCost, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        totalAmount,
        notes,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        createdBy: 'admin',
        shopId,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            quantityOrdered: item.quantity || 1,
            unitCost: item.unitCost,
            totalCost: (item.quantity || 1) * item.unitCost,
            productName: item.productName || null,
            productSku: item.productSku || null,
            productBarcode: item.productBarcode || null,
            sellingPrice: item.sellingPrice || null,
            wholesalePrice: item.wholesalePrice || null,
            electronicsBrand: item.electronicsBrand || null,
            electronicsModel: item.electronicsModel || null,
            electronicsImei: item.electronicsImei || null,
            electronicsColor: item.electronicsColor || null,
            electronicsStorage: item.electronicsStorage || null,
            electronicsCondition: item.electronicsCondition || null,
            pharmacyBrandName: item.pharmacyBrandName || null,
            pharmacyGenericName: item.pharmacyGenericName || null,
            pharmacyBatchNumber: item.pharmacyBatchNumber || null,
            pharmacyManufacturingDate: item.pharmacyManufacturingDate ? new Date(item.pharmacyManufacturingDate) : null,
            pharmacyExpiryDate: item.pharmacyExpiryDate ? new Date(item.pharmacyExpiryDate) : null,
            pharmacyCategoryName: item.pharmacyCategoryName || null,
            clothingBrand: item.clothingBrand || null,
            clothingVariants: item.clothingVariants || null,
            clothingCategoryName: item.clothingCategoryName || null,
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
    const shopId = request.headers.get('x-shop-id') || undefined;
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { id, status, paidAmount, receivedItems } = body;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id, shopId },
      include: { items: { include: { product: true } } }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (status === 'RECEIVED') {
      for (const item of order.items) {
        const receivedQty = receivedItems?.find((ri: any) => ri.itemId === item.id)?.quantityReceived ?? item.quantityOrdered;
        let productId = item.productId;

        if (!productId) {
          const isPhone = !!item.electronicsImei;
          const isPharmacyItem = !!item.pharmacyBrandName || !!item.pharmacyGenericName;
          const isClothingItem = !!item.clothingBrand;
          const targetCategoryName = isPharmacyItem ? (item.pharmacyCategoryName || 'Medicines') : isClothingItem ? (item.clothingCategoryName || 'Clothing') : (isPhone ? 'Phones & Tablets' : 'Accessories');
          let cat = await prisma.category.findFirst({ where: { shopId, name: targetCategoryName } });
          if (!cat) cat = await prisma.category.create({ data: { name: targetCategoryName, shopId } });

          const sku = item.productSku || (isPhone ? 'ELC-' : isPharmacyItem ? 'PHA-' : isClothingItem ? 'CLO-' : 'ACC-') + Date.now().toString(36).toUpperCase();
          const name: string = item.productName || (isClothingItem ? (item.clothingBrand || 'Clothing Item') : [item.pharmacyBrandName, item.pharmacyGenericName].filter(Boolean).join(' ') || `${item.electronicsBrand || ''} ${item.electronicsModel || ''}`.trim() || 'New Product');

          const created = await prisma.product.create({
            data: {
              name,
              sku,
              barcode: item.productBarcode || null,
              categoryId: cat.id,
              brand: isClothingItem ? item.clothingBrand : null,
              supplierId: order.supplierId,
              purchaseCost: item.unitCost,
              sellingPrice: item.sellingPrice || item.unitCost * 1.2,
              wholesalePrice: item.wholesalePrice || null,
              stockQuantity: 0,
              expiryDate: item.pharmacyExpiryDate ? new Date(item.pharmacyExpiryDate) : null,
              shopId,
              ...(isPharmacyItem ? {
                pharmacyFields: {
                  create: {
                    brandName: item.pharmacyBrandName || null,
                    genericName: item.pharmacyGenericName || null,
                    batchNumber: item.pharmacyBatchNumber || null,
                    manufacturingDate: item.pharmacyManufacturingDate ? new Date(item.pharmacyManufacturingDate) : null,
                    expiryDate: item.pharmacyExpiryDate ? new Date(item.pharmacyExpiryDate) : null,
                  }
                }
              } : (isClothingItem ? {
                clothingFields: {
                  create: {
                    brand: item.clothingBrand || null,
                  }
                },
                variants: item.clothingVariants ? {
                  create: JSON.parse(item.clothingVariants).map((variantStr: string, idx: number) => ({
                    variantValue: variantStr,
                    sku: `${sku}-${idx}`,
                    sellingPrice: item.sellingPrice || item.unitCost * 1.2,
                    purchaseCost: item.unitCost,
                    stockQuantity: 0,
                  }))
                } : undefined
              } : {
                electronicsFields: {
                  create: {
                    brand: item.electronicsBrand || null,
                    model: item.electronicsModel || null,
                    imei: item.electronicsImei || null,
                    color: item.electronicsColor || null,
                    storage: item.electronicsStorage || null,
                    condition: item.electronicsCondition || null,
                  }
                }
              }))
            }
          });

          await prisma.purchaseOrderItem.update({
            where: { id: item.id },
            data: { productId: created.id }
          });
          productId = created.id;
        }

        await prisma.product.update({
          where: { id: productId },
          data: { stockQuantity: { increment: receivedQty } }
        });

        await prisma.stockMovement.create({
          data: {
            productId: productId,
            type: 'STOCK_IN',
            quantity: receivedQty,
            reference: order.orderNumber,
            reason: 'Purchase Order Received'
          }
        });

        await prisma.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: receivedQty }
        });
      }
    }

    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id, shopId },
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
    const shopId = request.headers.get('x-shop-id') || undefined;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || !shopId) {
      return NextResponse.json({ error: 'Order ID and Shop ID required' }, { status: 400 });
    }

    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: id, purchaseOrder: { shopId } }
    });

    await prisma.purchaseOrder.delete({
      where: { id, shopId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}