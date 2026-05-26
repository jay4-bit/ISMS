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
      update: {
        businessName: body.businessName,
        businessPhone: body.businessPhone,
        businessEmail: body.businessEmail,
        businessAddress: body.businessAddress,
        currency: body.currency,
        currencySymbol: body.currencySymbol,
        taxRate: body.taxRate,
        lowStockAlert: body.lowStockAlert,
        expiryAlert: body.expiryAlert,
        expiryAlertDays: body.expiryAlertDays,
      },
      create: {
        shopId,
        businessName: body.businessName || 'My Shop',
        businessPhone: body.businessPhone,
        businessEmail: body.businessEmail,
        businessAddress: body.businessAddress,
        currency: body.currency || 'TZS',
        currencySymbol: body.currencySymbol || 'TSh',
        taxRate: body.taxRate || 0,
        lowStockAlert: body.lowStockAlert ?? true,
        expiryAlert: body.expiryAlert ?? true,
        expiryAlertDays: body.expiryAlertDays || 7,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Update settings error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}