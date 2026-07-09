import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendVerificationCode } from '@/lib/email';

const JWT_SECRET = process.env.JWT_SECRET || 'isms-pro-admin-secret-key-2026';

function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    return decoded.isAdmin ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const search = request.nextUrl.searchParams.get('search') || '';

    const shops = await prisma.shop.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        shopType: true,
        email: true,
        phone: true,
        address: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        trialEndsAt: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json({ shops });
  } catch (error) {
    console.error('Admin shops error:', error);
    return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, shopType, email, phone, address, ownerName, ownerEmail, ownerPassword, skipOwner } = body;

    if (!name || !shopType) {
      return NextResponse.json({ error: 'Shop name and type are required' }, { status: 400 });
    }

    const validShopTypes = ['PHARMACY', 'GENERAL', 'LIQUOR', 'ELECTRONICS', 'CLOTHING'];
    if (!validShopTypes.includes(shopType)) {
      return NextResponse.json({ error: 'Invalid shop type' }, { status: 400 });
    }

    const existingShop = await prisma.shop.findFirst({
      where: { name, shopType: shopType as any }
    });

    if (existingShop) {
      return NextResponse.json({ error: 'A shop with this name already exists' }, { status: 400 });
    }

    if (!skipOwner && (!ownerName || !ownerEmail || !ownerPassword)) {
      return NextResponse.json({ error: 'Owner name, email, and password are required' }, { status: 400 });
    }

    if (!skipOwner) {
      const existingOwner = await prisma.user.findFirst({
        where: { email: ownerEmail.toLowerCase() }
      });
      if (existingOwner) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }
    }

    const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '3');
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = skipOwner ? null : await hashPassword(ownerPassword);

    const shop = await prisma.shop.create({
      data: {
        name,
        shopType: shopType as any,
        email: email || null,
        phone: phone || null,
        address: address || null,
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
        users: skipOwner ? undefined : {
          create: {
            email: ownerEmail.toLowerCase(),
            password: hashedPassword!,
            name: ownerName,
            role: 'OWNER',
            emailVerified: false,
            emailVerificationCode: verificationCode,
          }
        },
        settings: {
          create: {
            businessName: name,
            taxRate: 0,
            lowStockAlert: true,
            expiryAlert: shopType === 'PHARMACY',
            expiryAlertDays: 7,
          }
        }
      },
      include: {
        _count: { select: { users: true } },
        users: skipOwner ? false : { select: { id: true, name: true, email: true, role: true, emailVerified: true } },
      },
    });

    if (!skipOwner) {
      try {
        await sendVerificationCode(ownerEmail, verificationCode, ownerName);
      } catch {
        // Email sending failed, but account was created
      }
    }

    return NextResponse.json({
      success: true,
      emailVerified: skipOwner ? true : false,
      message: skipOwner ? 'Shop created successfully.' : 'Account created! Please check your email for the verification code.',
      ownerEmail: skipOwner ? null : ownerEmail.toLowerCase(),
    });
  } catch (error) {
    console.error('Admin create shop error:', error);
    return NextResponse.json({ error: 'Failed to create shop' }, { status: 500 });
  }
}
