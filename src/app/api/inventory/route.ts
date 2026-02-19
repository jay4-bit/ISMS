import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

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
      taxRate, location
    } = body;

    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        barcode: barcode || null,
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
      taxRate, location, isFaulty
    } = body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        barcode: barcode || null,
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
