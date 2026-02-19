import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@isms.com' },
    update: {},
    create: {
      email: 'admin@isms.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('Created admin user:', admin.email);

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@isms.com' },
    update: {},
    create: {
      email: 'cashier@isms.com',
      name: 'John Cashier',
      password: hashedPassword,
      role: 'CASHIER',
    },
  });
  console.log('Created cashier user:', cashier.email);

  const categories = [
    { name: 'Vinyundo & Wifi', description: 'Maitikio ya simu na vifaa vya internet' },
    { name: 'Mavazi', description: 'Nguo za kila aina' },
    { name: 'Vinywaji & Chakula', description: 'Vinywaji na vyakula' },
    { name: 'Nyumba & Umeme', description: 'Vifaa vya nyumbani na umeme' },
    { name: 'Michezo', description: 'Vifaa vya michezo na burudani' },
  ];

  for (const cat of categories) {
    const existing = await prisma.category.findFirst({ where: { name: cat.name } });
    if (!existing) {
      await prisma.category.create({ data: cat });
    }
  }
  console.log('Created categories');

  const electronics = await prisma.category.findFirst({ where: { name: 'Vinyundo & Wifi' } });
  const clothing = await prisma.category.findFirst({ where: { name: 'Mavazi' } });
  const food = await prisma.category.findFirst({ where: { name: 'Vinywaji & Chakula' } });
  const home = await prisma.category.findFirst({ where: { name: 'Nyumba & Umeme' } });
  const sports = await prisma.category.findFirst({ where: { name: 'Michezo' } });

  // Electronics - 5+ products
  if (electronics) {
    const products = [
      { name: 'Samsung Galaxy A14', sku: 'PHN-001', barcode: '1234567890123', desc: 'Smartphone 6.6"', cost: 350000, price: 450000, stock: 15 },
      { name: 'iPhone 13 Pro', sku: 'PHN-002', barcode: '1234567890124', desc: 'Smartphone 6.1"', cost: 850000, price: 1200000, stock: 8 },
      { name: 'Tecno Spark 10', sku: 'PHN-003', barcode: '1234567890125', desc: 'Smartphone 6.6"', cost: 180000, price: 280000, stock: 20 },
      { name: 'Router TP-Link', sku: 'NET-001', barcode: '2234567890123', desc: 'WiFi Router 300Mbps', cost: 45000, price: 85000, stock: 25 },
      { name: 'Mi WiFi Range Extender', sku: 'NET-002', barcode: '2234567890124', desc: 'WiFi Extender', cost: 55000, price: 95000, stock: 18 },
      { name: 'Earbuds Bluetooth', sku: 'AUD-001', barcode: '3234567890123', desc: 'Wireless Earbuds', cost: 35000, price: 65000, stock: 30 },
      { name: 'Power Bank 10000mAh', sku: 'ACC-001', barcode: '4234567890123', desc: 'Portable charger', cost: 45000, price: 75000, stock: 40 },
    ];
    for (const p of products) {
      const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
      if (!existing) {
        await prisma.product.create({
          data: {
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            description: p.desc,
            categoryId: electronics.id,
            purchaseCost: p.cost,
            sellingPrice: p.price,
            stockQuantity: p.stock,
            lowStockThreshold: 5,
          },
        });
      }
    }
  }

  // Clothing - 5+ products
  if (clothing) {
    const products = [
      { name: 'Shati la Wanaume', sku: 'MCL-001', barcode: '5234567890123', desc: 'Shati ya pamba ya kawaida', cost: 12000, price: 25000, stock: 50 },
      { name: 'Koti ya Wanaume', sku: 'MCL-002', barcode: '5234567890124', desc: 'Koti ya kimiani', cost: 35000, price: 65000, stock: 20 },
      { name: 'Skirt ya Wanawake', sku: 'WCL-001', barcode: '6234567890123', desc: 'Skirt ya kusuka', cost: 8000, price: 18000, stock: 35 },
      { name: 'Daamani ya Watoto', sku: 'KCL-001', barcode: '7234567890123', desc: 'Daamani ya mtoto', cost: 5000, price: 12000, stock: 45 },
      { name: 'Jeans ya Wanaume', sku: 'MCL-003', barcode: '5234567890125', desc: 'Jeans ya mkali', cost: 18000, price: 35000, stock: 25 },
      { name: 'Sweteri', sku: 'MCL-004', barcode: '5234567890126', desc: 'Sweteri ya baridi', cost: 15000, price: 28000, stock: 30 },
    ];
    for (const p of products) {
      const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
      if (!existing) {
        await prisma.product.create({
          data: {
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            description: p.desc,
            categoryId: clothing.id,
            purchaseCost: p.cost,
            sellingPrice: p.price,
            stockQuantity: p.stock,
            lowStockThreshold: 10,
          },
        });
      }
    }
  }

  // Food & Beverages - 5+ products
  if (food) {
    const products = [
      { name: 'Maziwa ya Ng\'ombe', sku: 'DRK-001', barcode: '8234567890123', desc: 'Maziwa fres 1L', cost: 1800, price: 3500, stock: 100 },
      { name: 'Soda Fanta 500ml', sku: 'DRK-002', barcode: '8234567890124', desc: 'Soda Fanta ya chungwa', cost: 1200, price: 2500, stock: 150 },
      { name: 'Soda Coca Cola 500ml', sku: 'DRK-003', barcode: '8234567890125', desc: 'Coca Cola', cost: 1200, price: 2500, stock: 150 },
      { name: 'Biskuti Marie', sku: 'FOD-001', barcode: '9234567890123', desc: 'Biskuti ya asubuhi', cost: 1500, price: 3000, stock: 80 },
      { name: 'Chai Packet', sku: 'FOD-002', barcode: '9234567890124', desc: 'Chai ya kahawa 100g', cost: 2000, price: 4500, stock: 60 },
      { name: 'Sukari 1kg', sku: 'FOD-003', barcode: '9234567890125', desc: 'Sukari ya white', cost: 3500, price: 6500, stock: 40 },
      { name: 'Mchele 1kg', sku: 'FOD-004', barcode: '9234567890126', desc: 'Mchele wa kibiashara', cost: 2800, price: 5000, stock: 70 },
    ];
    for (const p of products) {
      const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
      if (!existing) {
        await prisma.product.create({
          data: {
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            description: p.desc,
            categoryId: food.id,
            purchaseCost: p.cost,
            sellingPrice: p.price,
            stockQuantity: p.stock,
            lowStockThreshold: 15,
          },
        });
      }
    }
  }

  // Home & Electronics - 5+ products
  if (home) {
    const products = [
      { name: 'Taa ya LED', sku: 'HME-001', barcode: 'A234567890123', desc: 'Taarifa ya umeme 20W', cost: 15000, price: 28000, stock: 30 },
      { name: 'Swichi ya Kawaida', sku: 'HME-002', barcode: 'A234567890124', desc: 'Swichi ya umeme', cost: 2500, price: 5000, stock: 100 },
      { name: 'MChangege', sku: 'HME-003', barcode: 'A234567890125', desc: 'MChangege wa keboor', cost: 3000, price: 6000, stock: 80 },
      { name: 'Kikapu cha Takataka', sku: 'HME-004', barcode: 'A234567890126', desc: 'Kikapu cha plastiki', cost: 2000, price: 4000, stock: 50 },
      { name: 'Kibanio cha Umeme', sku: 'HME-005', barcode: 'A234567890127', desc: 'Plagi ya umeme', cost: 3500, price: 7000, stock: 60 },
      { name: 'Tovuti ya Nguo', sku: 'HME-006', barcode: 'A234567890128', desc: 'Tovuti ya mkono', cost: 5000, price: 10000, stock: 40 },
    ];
    for (const p of products) {
      const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
      if (!existing) {
        await prisma.product.create({
          data: {
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            description: p.desc,
            categoryId: home.id,
            purchaseCost: p.cost,
            sellingPrice: p.price,
            stockQuantity: p.stock,
            lowStockThreshold: 10,
          },
        });
      }
    }
  }

  // Sports - 5+ products
  if (sports) {
    const products = [
      { name: 'Mpira wa Miguu', sku: 'SPT-001', barcode: 'B234567890123', desc: 'Mpira wa futboli', cost: 15000, price: 30000, stock: 25 },
      { name: 'Raketi ya Tenis', sku: 'SPT-002', barcode: 'B234567890124', desc: 'Raketi ya Tenis', cost: 25000, price: 45000, stock: 15 },
      { name: 'Mipira ya Viungo', sku: 'SPT-003', barcode: 'B234567890125', desc: 'Mipira ya wazawa', cost: 8000, price: 15000, stock: 30 },
      { name: 'Wigi ya Mwanga', sku: 'SPT-004', barcode: 'B234567890126', desc: 'Wigi ya mwanga ya michezo', cost: 12000, price: 22000, stock: 20 },
      { name: 'Glasi ya Kuogelea', sku: 'SPT-005', barcode: 'B234567890127', desc: 'Glasi ya maji', cost: 8000, price: 15000, stock: 25 },
      { name: 'Kikapu cha Basketball', sku: 'SPT-006', barcode: 'B234567890128', desc: 'Kikapu cha maguru', cost: 20000, price: 38000, stock: 18 },
    ];
    for (const p of products) {
      const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
      if (!existing) {
        await prisma.product.create({
          data: {
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            description: p.desc,
            categoryId: sports.id,
            purchaseCost: p.cost,
            sellingPrice: p.price,
            stockQuantity: p.stock,
            lowStockThreshold: 5,
          },
        });
      }
    }
  }

  // Create a default supplier
  const supplier = await prisma.supplier.upsert({
    where: { id: 'default-supplier' },
    update: {},
    create: {
      id: 'default-supplier',
      name: 'M的一般 wholesalers',
      email: 'info@mwajili.co.tz',
      phone: '+255712345678',
      address: 'Mwanza, Tanzania',
      contactPerson: 'Mr. Juma',
    },
  });
  console.log('Created default supplier');

  console.log('Created sample products');
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
