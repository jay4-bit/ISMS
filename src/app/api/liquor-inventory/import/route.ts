import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
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
        const { name, sku, barcode, description, category, supplier,
          purchaseCost, sellingPrice, wholesalePrice, stockQuantity,
          lowStockThreshold, reorderPoint, taxRate, location, expiryDate,
          brand, size, notes } = item;

        const productName = name;
        const stockQty = stockQuantity;
        const productSku = sku || `LIQ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        if (!productName || !productSku) {
          results.failed++;
          results.errors.push(`Missing name or SKU: ${productSku || 'unknown'}`);
          continue;
        }

        let categoryId: string | undefined;
        if (category) {
          const existingCategory = await prisma.category.findFirst({ where: { name: category, shopId } });
          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            const newCategory = await prisma.category.create({ data: { name: category, shopId } });
            categoryId = newCategory.id;
          }
        } else {
          let defaultCategory = await prisma.category.findFirst({ where: { name: 'General', shopId } });
          if (!defaultCategory) {
            defaultCategory = await prisma.category.create({ data: { name: 'General', shopId } });
          }
          categoryId = defaultCategory.id;
        }

        let supplierId: string | undefined;
        if (supplier) {
          const existingSupplier = await prisma.supplier.findFirst({ where: { name: supplier, shopId } });
          if (existingSupplier) {
            supplierId = existingSupplier.id;
          }
        }

        const existingSku = await prisma.product.findUnique({ where: { sku_shopId: { sku: productSku, shopId } } });

        const productData: any = {
          name: productName,
          barcode: barcode || null,
          description: description || null,
          purchaseCost: parseFloat(purchaseCost) || 0,
          sellingPrice: parseFloat(sellingPrice) || 0,
          wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : null,
          lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : 10,
          reorderPoint: reorderPoint ? parseInt(reorderPoint) : 20,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          hasExpiry: !!expiryDate,
          shopId, categoryId,
        };

        if (supplierId) productData.supplierId = supplierId;

        let product;
        if (existingSku) {
          productData.stockQuantity = stockQty !== undefined ? parseInt(stockQty) : existingSku.stockQuantity;
          product = await prisma.product.update({
            where: { id: existingSku.id },
            data: productData,
          });
        } else {
          productData.sku = productSku;
          productData.stockQuantity = parseInt(stockQty) || 0;
          product = await prisma.product.create({ data: productData });
        }

        if (brand || size || notes) {
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
        results.errors.push(`Error processing ${item.sku || 'unknown'}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Liquor bulk import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
