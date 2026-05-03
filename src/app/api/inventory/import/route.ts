import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    const shop = shopId ? await prisma.shop.findUnique({ where: { id: shopId } }) : null;
    const isPharmacy = shop?.shopType === 'PHARMACY';
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
        const { name, sku, barcode, description, category, supplier, purchaseCost, sellingPrice, wholesalePrice, stockQuantity, lowStockThreshold, reorderPoint, taxRate, location, hasExpiry, expiryDate, brandName, genericName, batchNumber, manufacturingDate, buyingPrice, quantity, brand, size, notes } = item;

        const productName = name;
        const buyingCost = buyingPrice || purchaseCost;
        const stockQty = quantity || stockQuantity;

        if (!productName || !sku) {
          results.failed++;
          results.errors.push(`Missing name or SKU: ${sku || 'unknown'}`);
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

const existingSku = await prisma.product.findUnique({ where: { sku_shopId: { sku, shopId } } });
        
        const productData: any = {
          name: productName,
          barcode: barcode || null,
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
          productData.sku = sku;
          productData.stockQuantity = parseInt(stockQty) || 0;
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

        if (isLiquor && (brand || size || notes)) {
          await prisma.liquorProduct.upsert({
            where: { productId: product.id },
            update: {
              brand: brand || null,
              size: size ? parseFloat(size) : null,
              volume: size ? parseFloat(size) : null,
              notes: notes || null,
            } as any,
            create: {
              productId: product.id,
              brand: brand || null,
              size: size ? parseFloat(size) : null,
              volume: size ? parseFloat(size) : null,
              notes: notes || null,
            }
          });
        }

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing ${item.sku}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}