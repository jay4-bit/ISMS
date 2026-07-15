import { PrismaClient, ShopType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SHOP_TYPES = [
  {
    type: ShopType.PHARMACY,
    name: 'HealthPlus Pharmacy',
    categories: ['Prescription Drugs', 'OTC Medicines', 'Vitamins & Supplements', 'First Aid Supplies', 'Medical Devices', 'Baby Care', 'Skincare'],
    roles: ['PHARMACIST', 'CASHIER', 'ASSISTANT']
  },
  {
    type: ShopType.GENERAL,
    name: 'Daily Needs Store',
    categories: ['Food & Beverages', 'Household Items', 'Personal Care', 'Stationery', 'Cleaning Supplies'],
    roles: ['MANAGER', 'CASHIER', 'ASSISTANT']
  },
  {
    type: ShopType.LIQUOR,
    name: 'Spirits & Wines',
    categories: ['Whisky', 'Beer', 'Wine', 'Vodka', 'Gin', 'Rum', 'Brandy', 'Cocktail Mixers', 'Accessories'],
    roles: ['MANAGER', 'CASHIER', 'WINGER']
  },
  {
    type: ShopType.ELECTRONICS,
    name: 'TechZone Electronics',
    categories: ['Phones & Tablets', 'Accessories', 'Networking', 'Audio', 'Power Solutions'],
    roles: ['MANAGER', 'CASHIER', 'WINGER']
  },
  {
    type: ShopType.CLOTHING,
    name: 'Fashion Hub',
    categories: ['Men\'s Wear', 'Women\'s Wear', 'Kids Wear', 'Accessories', 'Footwear'],
    roles: ['MANAGER', 'CASHIER', 'ASSISTANT']
  }
];

async function main() {
  console.log('Starting seed...');

  for (const shopData of SHOP_TYPES) {
    const shop = await prisma.shop.upsert({
      where: { name_shopType: { name: shopData.name, shopType: shopData.type } },
      update: {},
      create: {
        name: shopData.name,
        shopType: shopData.type,
        phone: '+255700000000',
        email: `info@${shopData.name.toLowerCase().replace(/\s+/g, '')}.co.tz`,
        address: 'Tanzania',
        currency: 'TZS',
        currencySymbol: 'TSh'
      }
    });
    console.log(`Created shop: ${shop.name}`);

    await prisma.shopSettings.upsert({
      where: { shopId: shop.id },
      update: {},
      create: {
        shopId: shop.id,
        businessName: shopData.name,
        taxRate: shopData.type === ShopType.PHARMACY ? 0 : 0,
        lowStockAlert: true,
        expiryAlert: shopData.type === ShopType.PHARMACY,
        expiryAlertDays: 7
      }
    });

    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const owner = await prisma.user.upsert({
      where: { email_shopId: { email: `owner@${shop.id.slice(0,8)}.com`, shopId: shop.id } },
      update: {},
      create: {
        email: `owner@${shop.id.slice(0,8)}.com`,
        password: hashedPassword,
        name: `${shopData.type} Owner`,
        role: 'OWNER',
        shopId: shop.id
      }
    });
    console.log(`Created owner for ${shop.name}: ${owner.email}`);

    const cashier = await prisma.user.upsert({
      where: { email_shopId: { email: `cashier@${shop.id.slice(0,8)}.com`, shopId: shop.id } },
      update: {},
      create: {
        email: `cashier@${shop.id.slice(0,8)}.com`,
        password: hashedPassword,
        name: 'John Cashier',
        role: 'CASHIER',
        shopId: shop.id
      }
    });
    console.log(`Created cashier for ${shop.name}: ${cashier.email}`);

    for (const catName of shopData.categories) {
      await prisma.category.upsert({
        where: { name_shopId: { name: catName, shopId: shop.id } },
        update: {},
        create: {
          name: catName,
          shopId: shop.id
        }
      });
    }
    console.log(`Created categories for ${shop.name}`);

    if (shopData.type === ShopType.LIQUOR) {
      const liquorSuppliers = [
        { name: 'Tanzania Breweries Ltd', email: 'orders@tbl.co.tz', phone: '+255700444444', address: 'Dar es Salaam' },
        { name: 'Premium Wines & Spirits', email: 'sales@premiumwines.co.tz', phone: '+255700555555', address: 'Arusha' },
        { name: 'East African Distillers', email: 'supply@ead.co.tz', phone: '+255700666666', address: 'Mwanza' },
      ];

      for (const supplier of liquorSuppliers) {
        const existing = await prisma.supplier.findFirst({ where: { name: supplier.name, shopId: shop.id } });
        if (!existing) {
          await prisma.supplier.create({
            data: { ...supplier, shopId: shop.id }
          });
        }
      }
      console.log(`Created sample liquor suppliers`);

      const whiskey = await prisma.category.findFirst({ where: { name: 'Whisky', shopId: shop.id } });
      const beer = await prisma.category.findFirst({ where: { name: 'Beer', shopId: shop.id } });
      const wine = await prisma.category.findFirst({ where: { name: 'Wine', shopId: shop.id } });
      const vodka = await prisma.category.findFirst({ where: { name: 'Vodka', shopId: shop.id } });

      const liquorProducts = [
        { name: 'Jameson Irish Whiskey', sku: 'LIQ001', brand: 'Jameson', size: 750, categoryId: whiskey?.id, purchaseCost: 45000, sellingPrice: 65000, stockQuantity: 24, lowStockThreshold: 5 },
        { name: 'Johnnie Walker Red Label', sku: 'LIQ002', brand: 'Johnnie Walker', size: 1000, categoryId: whiskey?.id, purchaseCost: 85000, sellingPrice: 120000, stockQuantity: 18, lowStockThreshold: 5 },
        { name: 'Chivas Regal 12 Year', sku: 'LIQ003', brand: 'Chivas', size: 750, categoryId: whiskey?.id, purchaseCost: 95000, sellingPrice: 135000, stockQuantity: 12, lowStockThreshold: 3 },
        { name: 'Heineken Lager', sku: 'LIQ004', brand: 'Heineken', size: 330, categoryId: beer?.id, purchaseCost: 3500, sellingPrice: 5000, stockQuantity: 120, lowStockThreshold: 20 },
        { name: 'Castle Lite', sku: 'LIQ005', brand: 'Castle Lite', size: 330, categoryId: beer?.id, purchaseCost: 3000, sellingPrice: 4500, stockQuantity: 96, lowStockThreshold: 15 },
        { name: 'Savanna Dry', sku: 'LIQ006', brand: 'Savanna', size: 330, categoryId: beer?.id, purchaseCost: 3200, sellingPrice: 4800, stockQuantity: 72, lowStockThreshold: 10 },
        { name: 'Red Wine Classic', sku: 'LIQ007', brand: 'Four Cousins', size: 750, categoryId: wine?.id, purchaseCost: 25000, sellingPrice: 38000, stockQuantity: 30, lowStockThreshold: 5 },
        { name: 'White Wine Chenin Blanc', sku: 'LIQ008', brand: 'Nederburg', size: 750, categoryId: wine?.id, purchaseCost: 28000, sellingPrice: 42000, stockQuantity: 24, lowStockThreshold: 5 },
        { name: 'Grey Goose Vodka', sku: 'LIQ009', brand: 'Grey Goose', size: 750, categoryId: vodka?.id, purchaseCost: 55000, sellingPrice: 78000, stockQuantity: 20, lowStockThreshold: 5 },
        { name: 'Smirnoff Red Label', sku: 'LIQ010', brand: 'Smirnoff', size: 750, categoryId: vodka?.id, purchaseCost: 35000, sellingPrice: 52000, stockQuantity: 35, lowStockThreshold: 8 },
      ];

      for (const product of liquorProducts) {
        if (!product.categoryId) continue;
        const existing = await prisma.product.findFirst({ where: { sku: product.sku, shopId: shop.id } });
        if (!existing) {
          await prisma.product.create({
            data: {
              name: product.name,
              sku: product.sku,
              barcode: '2' + Date.now().toString().slice(-10) + product.sku.replace('LIQ', ''),
              categoryId: product.categoryId,
              purchaseCost: product.purchaseCost,
              sellingPrice: product.sellingPrice,
              stockQuantity: product.stockQuantity,
              lowStockThreshold: product.lowStockThreshold,
              reorderPoint: product.lowStockThreshold * 2,
              hasExpiry: true,
              expiryDate: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000),
              shopId: shop.id,
              liquorFields: {
                create: {
                  brand: product.brand,
                  size: product.size,
                  volume: product.size,
                }
              }
            }
          });
        }
      }
      console.log(`Created sample liquor products`);
    }

    if (shopData.type === ShopType.ELECTRONICS) {
      const electronicsSuppliers = [
        { name: 'Tech Distributors Ltd', email: 'orders@techdist.co.tz', phone: '+255700111111', address: 'Dar es Salaam' },
        { name: 'Mobile World Tanzania', email: 'supply@mobileworld.co.tz', phone: '+255700222222', address: 'Arusha' },
        { name: 'Gadgets Direct Africa', email: 'sales@gadgetsdirect.africa', phone: '+255700333333', address: 'Mwanza' },
      ];

      for (const supplier of electronicsSuppliers) {
        const existing = await prisma.supplier.findFirst({ where: { name: supplier.name, shopId: shop.id } });
        if (!existing) {
          await prisma.supplier.create({
            data: { ...supplier, shopId: shop.id }
          });
        }
      }
      console.log(`Created sample electronics suppliers`);
    }
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });