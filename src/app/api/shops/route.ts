import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { ShopType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, shopId, shopData, ownerData } = body;

    if (action === 'create') {
      const { name, shopType, phone, email, address, ownerName, ownerEmail, ownerPassword } = body;

      if (!name || !shopType || !ownerName || !ownerEmail || !ownerPassword) {
        return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
      }

      const validShopTypes = ['PHARMACY', 'GENERAL', 'LIQUOR', 'ELECTRONICS', 'CLOTHING'];
      if (!validShopTypes.includes(shopType)) {
        return NextResponse.json({ error: 'Invalid shop type' }, { status: 400 });
      }

      const existingShop = await prisma.shop.findFirst({
        where: { name, shopType: shopType as ShopType }
      });

      if (existingShop) {
        return NextResponse.json({ error: 'A shop with this name already exists' }, { status: 400 });
      }

      const existingOwner = await prisma.user.findFirst({
        where: { email: ownerEmail }
      });

      if (existingOwner) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(ownerPassword);

      const shop = await prisma.shop.create({
        data: {
          name,
          shopType: shopType as ShopType,
          phone: phone || null,
          email: email || null,
          address: address || null,
          users: {
            create: {
              email: ownerEmail,
              password: hashedPassword,
              name: ownerName,
              role: 'OWNER'
            }
          },
          settings: {
            create: {
              businessName: name,
              taxRate: shopType === 'PHARMACY' ? 0 : 0,
              lowStockAlert: true,
              expiryAlert: shopType === 'PHARMACY',
              expiryAlertDays: 7
            }
          }
        },
        include: {
          users: true,
          settings: true
        }
      });

      const token = Buffer.from(`${shop.id}:${shop.users[0].id}`).toString('base64');

      return NextResponse.json({
        success: true,
        shop: {
          id: shop.id,
          name: shop.name,
          shopType: shop.shopType
        },
        user: {
          id: shop.users[0].id,
          email: shop.users[0].email,
          name: shop.users[0].name,
          role: shop.users[0].role
        },
        token
      });
    }

    if (action === 'register') {
      const { shopId, ownerName, ownerEmail, ownerPassword } = body;

      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
      }

      const existingUser = await prisma.user.findFirst({
        where: { email: ownerEmail, shopId }
      });

      if (existingUser) {
        return NextResponse.json({ error: 'Email already registered in this shop' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(ownerPassword);

      const user = await prisma.user.create({
        data: {
          email: ownerEmail,
          password: hashedPassword,
          name: ownerName,
          role: 'OWNER',
          shopId
        }
      });

      const token = Buffer.from(`${shopId}:${user.id}`).toString('base64');

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        shop: {
          id: shop.id,
          name: shop.name,
          shopType: shop.shopType
        },
        token
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Shop creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopType = searchParams.get('type');

    if (shopType) {
      const shops = await prisma.shop.findMany({
        where: { shopType: shopType as ShopType, isActive: true },
        include: {
          _count: {
            select: { users: true, products: true }
          }
        }
      });
      return NextResponse.json({ shops });
    }

    const shops = await prisma.shop.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true, products: true }
        }
      }
    });

    return NextResponse.json({ shops });
  } catch (error) {
    console.error('Get shops error:', error);
    return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 });
  }
}