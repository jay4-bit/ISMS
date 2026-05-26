import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    const shop = shopId ? await prisma.shop.findUnique({ where: { id: shopId } }) : null;
    const isPharmacy = shop?.shopType === 'PHARMACY';
    const isElectronics = shop?.shopType === 'ELECTRONICS';
    const isClothing = shop?.shopType === 'CLOTHING';
    const isLiquor = shop?.shopType === 'LIQUOR';
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { products } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const item of products) {
      try {
        const { name, sku, barcode, description, category, supplier, purchaseCost, sellingPrice, wholesalePrice, stockQuantity, lowStockThreshold, reorderPoint, taxRate, location, hasExpiry, expiryDate, brandName, genericName, batchNumber, manufacturingDate, buyingPrice, quantity, brand, size, notes, imei, model, cond, condition, color, storage, variants } = item;

        const productName = name;
        const buyingCost = buyingPrice || purchaseCost;
        const stockQty = quantity || stockQuantity;

        let productSku = sku;
        if (isElectronics && !productSku && imei) {
          productSku = imei;
        }
        if (isClothing && !productSku) {
          productSku = `CLO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        }
        if (isLiquor && !productSku) {
          productSku = `LIQ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        }
        if (!isElectronics && !isClothing && !isLiquor && !isPharmacy && !productSku) {
          productSku = `GEN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        }

        const finalBarcode = isElectronics && !barcode && imei ? imei : (barcode || null);

        if (!productName || !productSku) {
          results.failed++;
          results.errors.push(`Missing name or SKU/IMEI: ${productSku || 'unknown'}`);
          continue;
        }

        let categoryId: string | undefined = undefined;
        if (category) {
          const existingCategory = await prisma.category.findFirst({ 
            where: { name: category, shopId } 
          });
          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            const newCategory = await prisma.category.create({ data: { name: category, shopId } });
            categoryId = newCategory.id;
          }
        } else {
          let defaultCategory = await prisma.category.findFirst({ 
            where: { name: 'General', shopId } 
          });
          if (!defaultCategory) {
            defaultCategory = await prisma.category.create({ data: { name: 'General', shopId } });
          }
          categoryId = defaultCategory.id;
        }

        let supplierId: string | undefined = undefined;
        if (supplier) {
          const existingSupplier = await prisma.supplier.findFirst({ 
            where: { name: supplier, shopId } 
          });
          if (existingSupplier) {
            supplierId = existingSupplier.id;
          }
        }

const existingSku = await prisma.product.findUnique({ where: { sku_shopId: { sku: productSku, shopId } } });
        
        const productData: any = {
          name: productName,
          barcode: finalBarcode,
          description: description || null,
          purchaseCost: parseFloat(buyingCost) || 0,
          sellingPrice: parseFloat(sellingPrice) || 0,
          wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : null,
          lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : 10,
          reorderPoint: reorderPoint ? parseInt(reorderPoint) : 20,
          taxRate: taxRate ? parseFloat(taxRate) : 0,
          location: location || null,
          hasExpiry: hasExpiry === true || hasExpiry === 'true' || !!expiryDate,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          brand: brand || null,
          shopId,
          categoryId,
        };

        if (supplierId) {
          productData.supplierId = supplierId;
        }

        let product;
        if (existingSku) {
          productData.stockQuantity = stockQty !== undefined ? parseInt(stockQty) : existingSku.stockQuantity;
          product = await prisma.product.update({
            where: { id: existingSku.id },
            data: productData
          });
        } else {
          productData.sku = productSku;
          productData.stockQuantity = isElectronics ? (parseInt(stockQty) || 1) : (parseInt(stockQty) || 0);
          product = await prisma.product.create({
            data: productData
          });
        }

        if (isPharmacy && (brandName || genericName || batchNumber || manufacturingDate)) {
          await prisma.pharmacyProduct.upsert({
            where: { productId: product.id },
            update: {
              brandName: brandName || null,
              genericName: genericName || null,
              batchNumber: batchNumber || null,
              manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
            },
            create: {
              productId: product.id,
              brandName: brandName || null,
              genericName: genericName || null,
              batchNumber: batchNumber || null,
              manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
            }
          });
        }

        if (isElectronics && (imei || model || cond || condition || color || storage || brand)) {
          await prisma.electronicsProduct.upsert({
            where: { productId: product.id },
            update: {
              brand: brand || null,
              model: model || null,
              condition: cond || condition || null,
              color: color || null,
              storage: storage || null,
              imei: imei || null,
            },
            create: {
              productId: product.id,
              brand: brand || null,
              model: model || null,
              condition: cond || condition || null,
              color: color || null,
              storage: storage || null,
              imei: imei || null,
            }
          });
        }

        if (isClothing && brand) {
          await prisma.clothingProduct.upsert({
            where: { productId: product.id },
            update: { brand: brand || null },
            create: { productId: product.id, brand: brand || null },
          });
        }

        if (variants && (isClothing || (!isPharmacy && !isElectronics && !isLiquor && !isClothing))) {
          const existingVariants = await prisma.productVariant.findMany({ where: { productId: product.id } });
          if (existingVariants.length === 0) {
            const variantPairs = variants.split(';').map((v: string) => v.trim()).filter(Boolean);
            for (const pair of variantPairs) {
              const [type, value] = pair.split(':').map((s: string) => s.trim());
              if (value) {
                await prisma.productVariant.create({
                  data: {
                    productId: product.id,
                    variantValue: type ? `${type}: ${value}` : value,
                    sku: `${productSku}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    stockQuantity: parseInt(stockQty) || 0,
                    sellingPrice: parseFloat(sellingPrice) || 0,
                    purchaseCost: parseFloat(buyingCost) || 0,
                  },
                });
              }
            }
          }
        }

        if (isLiquor && size) {
          await prisma.liquorProduct.upsert({
            where: { productId: product.id },
            update: {
              brand: brand || null,
              size: size ? parseFloat(size) : null,
              volume: size ? parseFloat(size) : null,
              notes: notes || null,
            },
            create: {
              productId: product.id,
              brand: brand || null,
              size: size ? parseFloat(size) : null,
              volume: size ? parseFloat(size) : null,
              notes: notes || null,
            },
          });
        }

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing ${item.sku || item.imei || 'unknown'}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}