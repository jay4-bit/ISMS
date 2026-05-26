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

    const shopId = request.headers.get('x-shop-id') || '';

    const shop = shopId ? await prisma.shop.findUnique({ where: { id: shopId } }) : null;
    const shopType = shop?.shopType;

    const includeFields: any = { category: true, supplier: true, variants: true };
    if (shopType === 'ELECTRONICS') {
      includeFields.electronicsFields = true;
    } else if (shopType === 'LIQUOR') {
      includeFields.liquorFields = true;
    } else if (shopType === 'PHARMACY') {
      includeFields.pharmacyFields = true;
    } else if (shopType === 'CLOTHING') {
      includeFields.clothingFields = true;
    }

    if (id) {
      const product = await prisma.product.findFirst({
        where: { id, shopId },
        include: includeFields,
      });
      return NextResponse.json({ product });
    }

    const where: any = shopId ? { shopId } : {};
    
    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } },
      ];
      if (shopType === 'ELECTRONICS') {
        where.OR.push({
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
        });
      }
    }

    const products = await prisma.product.findMany({
      where,
      include: includeFields,
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
      // ✅ THE FIX 1: Check nested object (new frontend) OR loose fields (old frontend)
      const isPhone = !!(body.electronicsFields?.imei || body.electronicsIMEI || body.electronicsImei || body.imei);
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
      wholesalePrice: body.wholesalePrice ? parseFloat(body.wholesalePrice) : null,
      stockQuantity: parseInt(body.stockQuantity) || 1,
      lowStockThreshold: parseInt(body.lowStockThreshold) || 10,
      reorderPoint: parseInt(body.reorderPoint) || 20,
      hasExpiry: body.hasExpiry || false,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      taxRate: parseFloat(body.taxRate) || 0,
      location: body.location || null,
      brand: body.brand || null,
      shopId,
    };

    // Build electronics data from any electronics* fields in body
    const electronicsData: any = {};
    let hasElectronics = false;
    
    // ✅ THE FIX 2: Check if the new nested object exists first
    if (body.electronicsFields && typeof body.electronicsFields === 'object') {
      if (body.electronicsFields.brand) { electronicsData.brand = body.electronicsFields.brand; hasElectronics = true; }
      if (body.electronicsFields.model) { electronicsData.model = body.electronicsFields.model; hasElectronics = true; }
      if (body.electronicsFields.condition) { electronicsData.condition = body.electronicsFields.condition; hasElectronics = true; }
      if (body.electronicsFields.color) { electronicsData.color = body.electronicsFields.color; hasElectronics = true; }
      if (body.electronicsFields.storage) { electronicsData.storage = body.electronicsFields.storage; hasElectronics = true; }
      if (body.electronicsFields.imei) { electronicsData.imei = body.electronicsFields.imei; hasElectronics = true; }
      if (body.electronicsFields.accessoryGroup) electronicsData.accessoryGroup = body.electronicsFields.accessoryGroup;
    } else {
      // Fallback to old loose fields (keeps pharmacy/liquor/general safe if they accidentally send these)
      if (body.electronicsBrand) { electronicsData.brand = body.electronicsBrand; hasElectronics = true; }
      if (body.electronicsModel) { electronicsData.model = body.electronicsModel; hasElectronics = true; }
      if (body.electronicsCondition) { electronicsData.condition = body.electronicsCondition; hasElectronics = true; }
      if (body.electronicsColor) { electronicsData.color = body.electronicsColor; hasElectronics = true; }
      if (body.electronicsStorage) { electronicsData.storage = body.electronicsStorage; hasElectronics = true; }
      if (body.electronicsIMEI) { electronicsData.imei = body.electronicsIMEI; hasElectronics = true; }
      if (body.electronicsImei) { electronicsData.imei = body.electronicsImei; hasElectronics = true; }
      if (body.imei) { electronicsData.imei = body.imei; hasElectronics = true; }
      if (body.accessoryGroup) electronicsData.accessoryGroup = body.accessoryGroup;
    }
    
    if (hasElectronics) {
      console.log('Creating electronics fields:', electronicsData);
      productData.electronicsFields = { create: electronicsData };
    } else {
      console.log('No electronics fields found in body');
    }

    // Ensure LIQUOR shops always have a category
    if (shop.shopType === 'LIQUOR' && (!productCategoryId)) {
      const catName = body.categoryName || 'Liquor';
      let cat = await prisma.category.findFirst({ where: { name: catName, shopId } });
      if (!cat) cat = await prisma.category.create({ data: { name: catName, shopId } });
      productCategoryId = cat.id;
    }

    // Add pharmacy fields for PHARMACY shops
    if (shop.shopType === 'PHARMACY') {
      const pharmacyData: any = {};
      if (body.brandName) pharmacyData.brandName = body.brandName;
      if (body.genericName) pharmacyData.genericName = body.genericName;
      if (body.batchNumber) pharmacyData.batchNumber = body.batchNumber;
      if (body.manufacturingDate) pharmacyData.manufacturingDate = new Date(body.manufacturingDate);
      if (body.dosage) pharmacyData.dosage = body.dosage;
      if (body.composition) pharmacyData.composition = body.composition;
      if (body.manufacturer) pharmacyData.manufacturer = body.manufacturer;
      if (body.prescriptionRequired !== undefined) pharmacyData.prescriptionRequired = body.prescriptionRequired;
      if (body.requiresColdStorage !== undefined) pharmacyData.requiresColdStorage = body.requiresColdStorage;
      if (body.drugSchedule) pharmacyData.drugSchedule = body.drugSchedule;
      if (body.sideEffects) pharmacyData.sideEffects = body.sideEffects;
      if (body.contraindications) pharmacyData.contraindications = body.contraindications;
      if (body.interactionWarnings) pharmacyData.interactionWarnings = body.interactionWarnings;
      if (body.storageInstructions) pharmacyData.storageInstructions = body.storageInstructions;

      if (Object.keys(pharmacyData).length > 0) {
        productData.pharmacyFields = { create: pharmacyData };
      }
    }

    // Add liquor fields for LIQUOR shops
    if (shop.shopType === 'LIQUOR') {
      const liquorData: any = {};
      if (body.brand) liquorData.brand = body.brand;
      if (body.size) { liquorData.size = parseFloat(body.size); liquorData.volume = parseFloat(body.size); }
      if (body.requiresLiquorLicense) liquorData.requiresLiquorLicense = body.requiresLiquorLicense === 'true' || body.requiresLiquorLicense === true;
      if (body.notes) liquorData.notes = body.notes;

      if (Object.keys(liquorData).length > 0) {
        productData.liquorFields = { create: liquorData };
      }
    }

    console.log('Creating product with data keys:', Object.keys(productData));

    const product = await prisma.product.create({
      data: productData,
      include: { category: true, liquorFields: true, pharmacyFields: true },
    });

    // Create clothing fields and variants for CLOTHING shops
    if (shop.shopType === 'CLOTHING') {
      const clothingData: any = {};
      if (body.clothingFields) {
        if (body.clothingFields.size) clothingData.size = body.clothingFields.size;
        if (body.clothingFields.color) clothingData.color = body.clothingFields.color;
        if (body.clothingFields.material) clothingData.material = body.clothingFields.material;
        if (body.clothingFields.brand) clothingData.brand = body.clothingFields.brand;
        if (body.clothingFields.season) clothingData.season = body.clothingFields.season;
        if (body.clothingFields.gender) clothingData.gender = body.clothingFields.gender;
        if (body.clothingFields.pattern) clothingData.pattern = body.clothingFields.pattern;
      }

      if (Object.keys(clothingData).length > 0) {
        await prisma.clothingProduct.create({
          data: { ...clothingData, productId: product.id },
        });
      }
    }

    // Create variants for any shop type
    if (body.variants && Array.isArray(body.variants)) {
      for (const v of body.variants) {
        const variantLabel = v.variantType ? `${v.variantType}: ${v.variantValue}` : v.variantValue;
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            variantValue: variantLabel,
            sku: `${product.sku}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            stockQuantity: 0,
            sellingPrice: 0,
          },
        });
      }
    }

    console.log('Product created:', product.id);
    console.log('Liquor fields saved:', product.liquorFields);

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Create product error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errMsg);
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
      taxRate, location, isFaulty, variant, variantType, brand
    } = body;

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
      brand: brand || null,
    };

    // Handle electronics fields update
    const electronicsData: any = {};
    let hasElectronicsUpdate = false;

    // ✅ THE FIX 3: Same check for nested object in the PUT (Edit) handler
    if (body.electronicsFields && typeof body.electronicsFields === 'object') {
      if (body.electronicsFields.brand) { electronicsData.brand = body.electronicsFields.brand; hasElectronicsUpdate = true; }
      if (body.electronicsFields.model) { electronicsData.model = body.electronicsFields.model; hasElectronicsUpdate = true; }
      if (body.electronicsFields.condition) { electronicsData.condition = body.electronicsFields.condition; hasElectronicsUpdate = true; }
      if (body.electronicsFields.color) { electronicsData.color = body.electronicsFields.color; hasElectronicsUpdate = true; }
      if (body.electronicsFields.storage) { electronicsData.storage = body.electronicsFields.storage; hasElectronicsUpdate = true; }
      if (body.electronicsFields.imei) { electronicsData.imei = body.electronicsFields.imei; hasElectronicsUpdate = true; }
    } else {
      const imeiValue = body.electronicsIMEI || body.electronicsImei || body.imei;
      if (body.electronicsBrand) { electronicsData.brand = body.electronicsBrand; hasElectronicsUpdate = true; }
      if (body.electronicsModel) { electronicsData.model = body.electronicsModel; hasElectronicsUpdate = true; }
      if (body.electronicsCondition) { electronicsData.condition = body.electronicsCondition; hasElectronicsUpdate = true; }
      if (body.electronicsColor) { electronicsData.color = body.electronicsColor; hasElectronicsUpdate = true; }
      if (body.electronicsStorage) { electronicsData.storage = body.electronicsStorage; hasElectronicsUpdate = true; }
      if (imeiValue) { electronicsData.imei = imeiValue; hasElectronicsUpdate = true; }
      if (body.accessoryGroup) { electronicsData.accessoryGroup = body.accessoryGroup; hasElectronicsUpdate = true; }
    }

    // Check if product has electronicsFields
    const existingProduct = await prisma.product.findUnique({ 
      where: { id },
      include: { electronicsFields: true, liquorFields: true, clothingFields: true, pharmacyFields: true, variants: true }
    });

    if (hasElectronicsUpdate) {
      if (existingProduct?.electronicsFields) {
        updateData.electronicsFields = { update: electronicsData };
      } else {
        updateData.electronicsFields = { create: electronicsData };
      }
    }

    // Handle liquor fields update
    if (body.liquorFields && typeof body.liquorFields === 'object') {
      const liquorData: any = {};
      let hasLiquorUpdate = false;
      if (body.liquorFields.brand !== undefined) { liquorData.brand = body.liquorFields.brand; hasLiquorUpdate = true; }
      if (body.liquorFields.size !== undefined) { liquorData.size = parseFloat(body.liquorFields.size); liquorData.volume = parseFloat(body.liquorFields.size); hasLiquorUpdate = true; }
      if (body.liquorFields.requiresLiquorLicense !== undefined) { liquorData.requiresLiquorLicense = body.liquorFields.requiresLiquorLicense; hasLiquorUpdate = true; }
      if (body.liquorFields.notes !== undefined) { liquorData.notes = body.liquorFields.notes; hasLiquorUpdate = true; }

      if (hasLiquorUpdate) {
        if (existingProduct?.liquorFields) {
          updateData.liquorFields = { update: liquorData };
        } else {
          updateData.liquorFields = { create: liquorData };
        }
      }
    } else {
      // Fallback to flat fields (frontend sends flat for liquor)
      const liquorData: any = {};
      let hasLiquorUpdate = false;
      if (body.brand) { liquorData.brand = body.brand; hasLiquorUpdate = true; }
      if (body.size) { liquorData.size = parseFloat(body.size); liquorData.volume = parseFloat(body.size); hasLiquorUpdate = true; }
      if (body.requiresLiquorLicense !== undefined) { liquorData.requiresLiquorLicense = body.requiresLiquorLicense; hasLiquorUpdate = true; }
      if (body.notes) { liquorData.notes = body.notes; hasLiquorUpdate = true; }

      if (hasLiquorUpdate) {
        if (existingProduct?.liquorFields) {
          updateData.liquorFields = { update: liquorData };
        } else {
          updateData.liquorFields = { create: liquorData };
        }
      }
    }

    // Handle pharmacy fields update (flat fields from frontend)
    if (body.brandName || body.genericName || body.batchNumber || body.manufacturingDate) {
      const pharmacyData: any = {};
      let hasPharmacyUpdate = false;
      if (body.brandName) { pharmacyData.brandName = body.brandName; hasPharmacyUpdate = true; }
      if (body.genericName) { pharmacyData.genericName = body.genericName; hasPharmacyUpdate = true; }
      if (body.batchNumber) { pharmacyData.batchNumber = body.batchNumber; hasPharmacyUpdate = true; }
      if (body.manufacturingDate) { pharmacyData.manufacturingDate = new Date(body.manufacturingDate); hasPharmacyUpdate = true; }
      if (body.dosage) { pharmacyData.dosage = body.dosage; hasPharmacyUpdate = true; }
      if (body.composition) { pharmacyData.composition = body.composition; hasPharmacyUpdate = true; }
      if (body.manufacturer) { pharmacyData.manufacturer = body.manufacturer; hasPharmacyUpdate = true; }
      if (body.prescriptionRequired !== undefined) { pharmacyData.prescriptionRequired = body.prescriptionRequired; hasPharmacyUpdate = true; }
      if (body.requiresColdStorage !== undefined) { pharmacyData.requiresColdStorage = body.requiresColdStorage; hasPharmacyUpdate = true; }
      if (body.drugSchedule) { pharmacyData.drugSchedule = body.drugSchedule; hasPharmacyUpdate = true; }

      if (hasPharmacyUpdate) {
        if (existingProduct?.pharmacyFields) {
          updateData.pharmacyFields = { update: pharmacyData };
        } else {
          updateData.pharmacyFields = { create: pharmacyData };
        }
      }
    }

    // Handle clothing fields update
    if (body.clothingFields && typeof body.clothingFields === 'object') {
      const clothingData: any = {};
      let hasClothingUpdate = false;
      if (body.clothingFields.size !== undefined) { clothingData.size = body.clothingFields.size; hasClothingUpdate = true; }
      if (body.clothingFields.color !== undefined) { clothingData.color = body.clothingFields.color; hasClothingUpdate = true; }
      if (body.clothingFields.material !== undefined) { clothingData.material = body.clothingFields.material; hasClothingUpdate = true; }
      if (body.clothingFields.brand !== undefined) { clothingData.brand = body.clothingFields.brand; hasClothingUpdate = true; }
      if (body.clothingFields.season !== undefined) { clothingData.season = body.clothingFields.season; hasClothingUpdate = true; }
      if (body.clothingFields.gender !== undefined) { clothingData.gender = body.clothingFields.gender; hasClothingUpdate = true; }
      if (body.clothingFields.pattern !== undefined) { clothingData.pattern = body.clothingFields.pattern; hasClothingUpdate = true; }

      if (hasClothingUpdate) {
        if (existingProduct?.clothingFields) {
          updateData.clothingFields = { update: clothingData };
        } else {
          updateData.clothingFields = { create: clothingData };
        }
      }
    }

    // Handle clothing variants update
    if (body.variants && Array.isArray(body.variants)) {
      // Delete existing variants and recreate
      if (existingProduct?.variants && existingProduct.variants.length > 0) {
        await prisma.productVariant.deleteMany({ where: { productId: id } });
      }
      for (const v of body.variants) {
        const variantLabel = v.variantType ? `${v.variantType}: ${v.variantValue}` : v.variantValue;
        await prisma.productVariant.create({
          data: {
            productId: id,
            variantValue: variantLabel,
            sku: `${sku || 'SKU'}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            stockQuantity: 0,
            sellingPrice: 0,
          },
        });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true, electronicsFields: true, liquorFields: true, clothingFields: true, pharmacyFields: true, variants: true },
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