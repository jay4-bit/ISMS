import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

function generateBarcode(sku: string): string {
  const prefix = '2';
  const timestamp = Date.now().toString().slice(-6);
  const skuHash = sku.replace(/\D/g, '').slice(-4).padStart(4, '0');
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const base = prefix + timestamp + skuHash + random;
  
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return base + checkDigit;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');

    if (id) {
      const product = await prisma.product.findUnique({
        where: { id },
        include: { category: true, supplier: true },
      });
      return NextResponse.json({ product });
    }

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { sku: { contains: search } },
            { barcode: { contains: search } },
          ],
        }
      : {};

    const products = await prisma.product.findMany({
      where,
      include: { category: true, supplier: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name, sku, barcode, description, categoryId, supplierId,
      purchaseCost, sellingPrice, wholesalePrice, stockQuantity,
      lowStockThreshold, reorderPoint, hasExpiry, expiryDate,
      taxRate, location, variant, variantType
    } = body;

    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
    }

    const generatedBarcode = barcode || generateBarcode(sku);

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        barcode: generatedBarcode,
        description,
        categoryId,
        supplierId: supplierId || null,
        purchaseCost: parseFloat(purchaseCost) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : null,
        stockQuantity: parseInt(stockQuantity) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 10,
        reorderPoint: parseInt(reorderPoint) || 20,
        hasExpiry: hasExpiry || false,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        taxRate: parseFloat(taxRate) || 0,
        location: location || null,
        variant: variant || null,
        variantType: variantType || null,
      },
      include: { category: true },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id, name, sku, barcode, description, categoryId, supplierId,
      purchaseCost, sellingPrice, wholesalePrice, stockQuantity,
      lowStockThreshold, reorderPoint, hasExpiry, expiryDate,
      taxRate, location, isFaulty, variant, variantType
    } = body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        barcode: barcode || generateBarcode(sku),
        description,
        categoryId,
        supplierId: supplierId || null,
        purchaseCost: parseFloat(purchaseCost) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : null,
        stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : undefined,
        lowStockThreshold: parseInt(lowStockThreshold) || 10,
        reorderPoint: parseInt(reorderPoint) || 20,
        hasExpiry: hasExpiry || false,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        taxRate: parseFloat(taxRate) || 0,
        location: location || null,
        isFaulty: isFaulty || false,
        variant: variant || null,
        variantType: variantType || null,
      },
      include: { category: true },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'generateBarcodes') {
      const productsWithoutBarcode = await prisma.product.findMany({
        where: { barcode: null }
      });

      let updated = 0;
      for (const product of productsWithoutBarcode) {
        const newBarcode = generateBarcode(product.sku);
        await prisma.product.update({
          where: { id: product.id },
          data: { barcode: newBarcode }
        });
        updated++;
      }

      return NextResponse.json({ success: true, updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Patch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
