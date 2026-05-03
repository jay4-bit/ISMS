import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); }
    let settings = await prisma.shopSettings.findUnique({
      where: { shopId }
    });
    
    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: {
          shopId,
          businessName: 'My Shop',
          taxRate: 0,
          lowStockAlert: true,
          expiryAlert: true,
          expiryAlertDays: 7,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); }
    const body = await request.json();
    
    const settings = await prisma.shopSettings.upsert({
      where: { shopId },
      update: body,
      create: {
        shopId,
        businessName: body.businessName || 'My Shop',
        taxRate: body.taxRate || 0,
        lowStockAlert: body.lowStockAlert ?? true,
        expiryAlert: body.expiryAlert ?? true,
        expiryAlertDays: body.expiryAlertDays || 7,
        pharmacyLicense: body.pharmacyLicense,
        liquorLicense: body.liquorLicense,
        pharmacyName: body.pharmacyName,
        pharmacistName: body.pharmacistName,
        pharmacistLicense: body.pharmacistLicense,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}