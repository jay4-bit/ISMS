import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { ShopType } from '@prisma/client';
import { sendVerificationCode } from '@/lib/email';

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
        where: { email: ownerEmail.toLowerCase() }
      });

      if (existingOwner) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(ownerPassword);
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '3');

      const shop = await prisma.shop.create({
        data: {
          name,
          shopType: shopType as ShopType,
          phone: phone || null,
          email: email || null,
          address: address || null,
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          users: {
            create: {
              email: ownerEmail.toLowerCase(),
              password: hashedPassword,
              name: ownerName,
              role: 'OWNER',
              emailVerified: false,
              emailVerificationCode: verificationCode,
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

      try {
        await sendVerificationCode(ownerEmail, verificationCode, ownerName);
      } catch {
        // Email sending failed, but account was created - still notify user
      }

      return NextResponse.json({
        success: true,
        emailVerified: false,
        message: 'Account created! Please check your email for the verification code.',
        ownerEmail: ownerEmail.toLowerCase(),
      });
    }

    if (action === 'register') {
      const { shopId, ownerName, ownerEmail, ownerPassword } = body;

      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
      }

      const existingUser = await prisma.user.findFirst({
        where: { email: ownerEmail.toLowerCase(), shopId }
      });

      if (existingUser) {
        return NextResponse.json({ error: 'Email already registered in this shop' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(ownerPassword);
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const user = await prisma.user.create({
        data: {
          email: ownerEmail.toLowerCase(),
          password: hashedPassword,
          name: ownerName,
          role: 'OWNER',
          shopId,
          emailVerified: false,
          emailVerificationCode: verificationCode,
        }
      });

      try {
        await sendVerificationCode(ownerEmail, verificationCode, ownerName);
      } catch {
        // Email sending is optional for this flow
      }

      return NextResponse.json({
        success: true,
        emailVerified: false,
        message: 'Account created! Please check your email for the verification code.',
        ownerEmail: ownerEmail.toLowerCase(),
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