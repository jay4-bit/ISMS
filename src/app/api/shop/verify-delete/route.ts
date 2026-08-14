import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyOneTimeCode } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const userId = request.headers.get('x-user-id');
    if (!shopId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the shop owner can delete shop data' }, { status: 403 });
    }

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    if (!verifyOneTimeCode(code, shop.deletionCode)) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    if (!shop.deletionCodeExpires || new Date() > shop.deletionCodeExpires) {
      return NextResponse.json({ error: 'Verification code has expired. Request a new one.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.activity.deleteMany({ where: { shopId } });
      await tx.returnItem.deleteMany({ where: { return: { shopId } } });
      await tx.return.deleteMany({ where: { shopId } });
      await tx.installmentPayment.deleteMany({ where: { sale: { shopId } } });
      await tx.saleItem.deleteMany({ where: { sale: { shopId } } });
      await tx.sale.deleteMany({ where: { shopId } });
      await tx.expense.deleteMany({ where: { shopId } });
      await tx.stockCountItem.deleteMany({ where: { stockCount: { shopId } } });
      await tx.stockCount.deleteMany({ where: { shopId } });
      await tx.priceTag.deleteMany({ where: { product: { shopId } } });
      await tx.serialNumber.deleteMany({ where: { product: { shopId } } });
      await tx.stockMovement.deleteMany({ where: { product: { shopId } } });
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { shopId } } });
      await tx.purchaseOrder.deleteMany({ where: { shopId } });
      await tx.reminder.deleteMany({ where: { shopId } });
      await tx.permission.deleteMany({ where: { shopId } });
      await tx.customRole.deleteMany({ where: { shopId } });
      await tx.productVariant.deleteMany({ where: { product: { shopId } } });
      await tx.pharmacyProduct.deleteMany({ where: { product: { shopId } } });
      await tx.liquorProduct.deleteMany({ where: { product: { shopId } } });
      await tx.electronicsProduct.deleteMany({ where: { product: { shopId } } });
      await tx.clothingProduct.deleteMany({ where: { product: { shopId } } });
      await tx.product.deleteMany({ where: { shopId } });
      await tx.category.deleteMany({ where: { shopId } });
      await tx.brand.deleteMany({ where: { shopId } });
      await tx.supplier.deleteMany({ where: { shopId } });
      await tx.customer.deleteMany({ where: { shopId } });
      await tx.user.deleteMany({ where: { shopId, role: { not: 'OWNER' } } });
      await tx.shopSettings.update({
        where: { shopId },
        data: {
          businessName: shop.name,
          businessPhone: null,
          businessEmail: null,
          businessAddress: null,
          taxRate: 0,
        },
      });
      await tx.shop.update({
        where: { id: shopId },
        data: { deletionCode: null, deletionCodeExpires: null, logo: null },
      });
    }, { timeout: 120000 });

    return NextResponse.json({ success: true, message: 'All shop data has been deleted successfully' });
  } catch (error) {
    console.error('Verify delete error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to delete shop data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
