import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const shopId = request.headers.get('x-shop-id') || '';

    if (id) {
      const product = await prisma.product.findFirst({
        where: { id, shopId },
        include: { category: true, supplier: true, liquorFields: true },
      });
      return NextResponse.json({ product });
    }

    const where: any = { shopId };
    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } },
        { description: { contains: q } },
        { brand: { contains: q } },
        { liquorFields: { is: { OR: [
          { brand: { contains: q } },
          { liquorType: { contains: q } },
          { origin: { contains: q } },
          { notes: { contains: q } },
          { vintage: { contains: q } },
          { ageStatement: { contains: q } },
        ] } } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true, supplier: true, liquorFields: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Liquor inventory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const productName = body.name || `Product-${Date.now()}`;
    const productSku = body.sku || `SKU-${Date.now()}`;
    const productCategoryId = body.categoryId || '';

    const productData: any = {
      name: productName,
      sku: productSku,
      barcode: body.barcode || null,
      description: body.description || '',
      categoryId: productCategoryId,
      supplierId: body.supplierId || null,
      purchaseCost: parseFloat(body.purchaseCost) || 0,
      sellingPrice: parseFloat(body.sellingPrice) || 0,
      wholesalePrice: body.wholesalePrice ? parseFloat(body.wholesalePrice) : null,
      stockQuantity: parseInt(body.stockQuantity) || 1,
      lowStockThreshold: parseInt(body.lowStockThreshold) || 10,
      reorderPoint: parseInt(body.reorderPoint) || 20,
      hasExpiry: body.hasExpiry || false,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      shopId,
    };

    // Ensure a valid category
    if (!productCategoryId) {
      const catName = body.categoryName || 'Liquor';
      let cat = await prisma.category.findFirst({ where: { name: catName, shopId } });
      if (!cat) cat = await prisma.category.create({ data: { name: catName, shopId } });
      productData.categoryId = cat.id;
    }

    const liquorData: any = {};
    if (body.brand) liquorData.brand = body.brand;
    if (body.size) { liquorData.size = parseFloat(body.size); liquorData.volume = parseFloat(body.size); }
    if (body.requiresLiquorLicense !== undefined) liquorData.requiresLiquorLicense = body.requiresLiquorLicense;
    if (body.notes) liquorData.notes = body.notes;

    if (Object.keys(liquorData).length > 0) {
      productData.liquorFields = { create: liquorData };
    }

    const product = await prisma.product.create({
      data: productData,
      include: { category: true, liquorFields: true },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Create liquor product error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to create product', details: errMsg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, barcode, description, categoryId, supplierId,
      purchaseCost, sellingPrice, wholesalePrice, stockQuantity,
      lowStockThreshold, reorderPoint, hasExpiry, expiryDate,
      isFaulty, brand, size, requiresLiquorLicense, notes, categoryName } = body;

    // Resolve categoryName to categoryId if needed
    let resolvedCategoryId = categoryId;
    if ((!categoryId || categoryId === '') && categoryName) {
      const product = await prisma.product.findUnique({ where: { id }, select: { shopId: true } });
      if (product) {
        let cat = await prisma.category.findFirst({ where: { name: categoryName, shopId: product.shopId } });
        if (!cat) cat = await prisma.category.create({ data: { name: categoryName, shopId: product.shopId } });
        resolvedCategoryId = cat.id;
      }
    }

    const updateData: any = {
      name, barcode: barcode || null, description,
      categoryId: resolvedCategoryId,
      supplierId: supplierId || null,
      purchaseCost: parseFloat(purchaseCost) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : null,
      stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : undefined,
      lowStockThreshold: parseInt(lowStockThreshold) || 10,
      reorderPoint: parseInt(reorderPoint) || 20,
      hasExpiry: hasExpiry || false,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isFaulty: isFaulty || false,
    };

    const liquorUpdateData: any = {};
    if (brand !== undefined) liquorUpdateData.brand = brand;
    if (size !== undefined) { liquorUpdateData.size = parseFloat(size); liquorUpdateData.volume = parseFloat(size); }
    if (requiresLiquorLicense !== undefined) liquorUpdateData.requiresLiquorLicense = requiresLiquorLicense;
    if (notes !== undefined) liquorUpdateData.notes = notes;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { liquorFields: true },
    });

    if (Object.keys(liquorUpdateData).length > 0) {
      if (existingProduct?.liquorFields) {
        updateData.liquorFields = { update: liquorUpdateData };
      } else {
        updateData.liquorFields = { create: liquorUpdateData };
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true, liquorFields: true },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Update liquor product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete liquor product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
