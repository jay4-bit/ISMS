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
      const shopId = request.headers.get('x-shop-id') || '';
      const product = await prisma.product.findFirst({
        where: { id, shopId },
        include: { category: true, supplier: true, electronicsFields: true, liquorFields: true, pharmacyFields: true },
      });
      return NextResponse.json({ product });
    }

    const shopId = request.headers.get('x-shop-id');
    const where: any = shopId ? { shopId } : {};
    
    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } },
        {
          electronicsFields: {
            is: {
              OR: [
                { imei: { contains: q } },
                { brand: { contains: q } },
                { model: { contains: q } },
                { serialNumber: { contains: q } },
                { color: { contains: q } },
                { storage: { contains: q } },
                { condition: { contains: q } },
              ],
            },
          },
        },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true, supplier: true, electronicsFields: true, liquorFields: true, pharmacyFields: true },
      orderBy: { updatedAt: 'desc' },
    });

    console.log('=== GET PRODUCTS ===');
    console.log('Shop ID:', shopId);
    console.log('Total products:', products.length);
    if (products.length > 0) {
      const ef = (products[0] as any).electronicsFields;
      console.log('First product has electronicsFields:', ef ? JSON.stringify(ef) : 'NO');
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 400 });

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Build name from any available field
    let productName = body.name || body.productName || '';
    if (!productName && body.electronicsBrand) productName = body.electronicsBrand;
    if (!productName && body.electronicsModel) productName = body.electronicsModel;
    if (!productName && body.brand) productName = body.brand;
    if (!productName && body.model) productName = body.model;
    if (!productName) productName = `Product-${Date.now()}`;

    let productSku = body.sku || `SKU-${Date.now()}`;

    // Get or create category for ELECTRONICS shops
    let productCategoryId = body.categoryId || '';
    
    if (shop.shopType === 'ELECTRONICS') {
      // Determine if this is a phone (has IMEI) or accessory
      const isPhone = !!(body.electronicsIMEI || body.electronicsImei || body.imei);
      const targetCategoryName = isPhone ? 'Phones & Tablets' : 'Accessories';
      
      let existingCat = await prisma.category.findFirst({ 
        where: { shopId, name: targetCategoryName } 
      });
      
      if (!existingCat) {
        existingCat = await prisma.category.create({
          data: { name: targetCategoryName, shopId }
        });
        console.log('Created category:', targetCategoryName);
      } else {
        console.log('Found existing category:', targetCategoryName);
      }
      
      productCategoryId = existingCat.id;
    }

    console.log('=== POST INVENTORY ===');
    console.log('Shop type:', shop.shopType);
    console.log('Body received:', JSON.stringify(body));
    console.log('electronicsBrand:', body.electronicsBrand);
    console.log('electronicsModel:', body.electronicsModel);
    console.log('electronicsImei:', body.electronicsImei);

    // Build product data - simple version without shop-specific fields first
    const productData: any = {
      name: productName,
      sku: productSku,
      barcode: body.barcode || generateBarcode(productSku),
      description: body.description || '',
      categoryId: productCategoryId || null,
      supplierId: body.supplierId || null,
      purchaseCost: parseFloat(body.purchaseCost) || 0,
      sellingPrice: parseFloat(body.sellingPrice) || 0,
      stockQuantity: parseInt(body.stockQuantity) || 1,
      lowStockThreshold: parseInt(body.lowStockThreshold) || 10,
      reorderPoint: parseInt(body.reorderPoint) || 20,
      hasExpiry: body.hasExpiry || false,
      taxRate: parseFloat(body.taxRate) || 0,
      location: body.location || null,
      shopId,
    };

    // Build electronics data from any electronics* fields in body
    const electronicsData: any = {};
    
    // Handle both spellings
    const imeiValue = body.electronicsIMEI || body.electronicsImei || body.imei;
    const hasElectronicsFields = body.electronicsBrand || body.electronicsModel || body.electronicsCondition || 
        body.electronicsColor || body.electronicsStorage || imeiValue;
    
    if (hasElectronicsFields) {
      console.log('Building electronics data from body fields');
      console.log('  Body electronicsIMEI:', body.electronicsIMEI);
      console.log('  Body electronicsImei:', body.electronicsImei);
      
      if (body.electronicsBrand) { electronicsData.brand = body.electronicsBrand; console.log('  brand:', body.electronicsBrand); }
      if (body.electronicsModel) { electronicsData.model = body.electronicsModel; console.log('  model:', body.electronicsModel); }
      if (body.electronicsCondition) { electronicsData.condition = body.electronicsCondition; console.log('  condition:', body.electronicsCondition); }
      if (body.electronicsColor) { electronicsData.color = body.electronicsColor; console.log('  color:', body.electronicsColor); }
      if (body.electronicsStorage) { electronicsData.storage = body.electronicsStorage; console.log('  storage:', body.electronicsStorage); }
      if (imeiValue) { electronicsData.imei = imeiValue; console.log('  imei:', imeiValue); }
      if (body.accessoryGroup) electronicsData.accessoryGroup = body.accessoryGroup;
      
      productData.electronicsFields = { create: electronicsData };
      console.log('Electronics data to save:', electronicsData);
    } else {
      console.log('No electronics fields found in body');
    }

    // Add liquor fields for LIQUOR shops
    if (shop.shopType === 'LIQUOR') {
      const liquorData: any = {};
      if (body.brand) liquorData.brand = body.brand;
      if (body.size) { liquorData.size = parseFloat(body.size); liquorData.volume = parseFloat(body.size); }
      if (body.notes) liquorData.notes = body.notes;
      
      if (Object.keys(liquorData).length > 0) {
        productData.liquorFields = { create: liquorData };
      }
    }

    console.log('Creating product with data keys:', Object.keys(productData));

    const product = await prisma.product.create({
      data: productData,
      include: { category: true, liquorFields: true, pharmacyFields: true, electronicsFields: true },
    });

    console.log('Product created:', product.id);
    console.log('Electronics fields saved:', product.electronicsFields);

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Create product error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errMsg);
    // Log prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Prisma error code:', (error as any).code);
      console.error('Prisma error meta:', (error as any).meta);
    }
    return NextResponse.json({ error: 'Failed to create product', details: errMsg }, { status: 500 });
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

    // Build update data
    const updateData: any = {
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
    };

    // Handle electronics fields update
    const electronicsData: any = {};
    const imeiValue = body.electronicsIMEI || body.electronicsImei || body.imei;
    
    if (body.electronicsBrand) electronicsData.brand = body.electronicsBrand;
    if (body.electronicsModel) electronicsData.model = body.electronicsModel;
    if (body.electronicsCondition) electronicsData.condition = body.electronicsCondition;
    if (body.electronicsColor) electronicsData.color = body.electronicsColor;
    if (body.electronicsStorage) electronicsData.storage = body.electronicsStorage;
    if (imeiValue) electronicsData.imei = imeiValue;
    if (body.accessoryGroup) electronicsData.accessoryGroup = body.accessoryGroup;

    // Check if product has electronicsFields
    const existingProduct = await prisma.product.findUnique({ 
      where: { id },
      include: { electronicsFields: true }
    });

    if (existingProduct?.electronicsFields) {
      // Update existing electronics fields
      updateData.electronicsFields = { update: electronicsData };
    } else if (Object.keys(electronicsData).length > 0) {
      // Create new electronics fields
      updateData.electronicsFields = { create: electronicsData };
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true, electronicsFields: true },
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
