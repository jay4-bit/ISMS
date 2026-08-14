import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, logo: true, name: true },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found. Please log in again.' }, { status: 404 });
    }

    let settings = await prisma.shopSettings.findUnique({
      where: { shopId }
    });
    
    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: {
          shopId,
          businessName: shop.name,
          taxRate: 0,
          lowStockAlert: true,
          expiryAlert: true,
          expiryAlertDays: 7,
        },
      });
    }

    // Parse dashboardConfig JSON string
    const parsed = {
      ...settings,
      dashboardConfig: settings.dashboardConfig ? JSON.parse(settings.dashboardConfig) : null,
      paymentConfig: settings.paymentConfig ? JSON.parse(settings.paymentConfig) : null,
    };

    return NextResponse.json({ settings: parsed, logo: shop.logo || null });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get settings error:', msg);
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
        dashboardConfig: body.dashboardConfig !== undefined ? JSON.stringify(body.dashboardConfig) : undefined,
        paymentConfig: body.paymentConfig !== undefined ? JSON.stringify(body.paymentConfig) : undefined,
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
        dashboardConfig: body.dashboardConfig !== undefined ? JSON.stringify(body.dashboardConfig) : undefined,
        paymentConfig: body.paymentConfig !== undefined ? JSON.stringify(body.paymentConfig) : undefined,
      },
    });

    const parsed = {
      ...settings,
      dashboardConfig: settings.dashboardConfig ? JSON.parse(settings.dashboardConfig) : null,
      paymentConfig: settings.paymentConfig ? JSON.parse(settings.paymentConfig) : null,
    };
    return NextResponse.json({ settings: parsed });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
