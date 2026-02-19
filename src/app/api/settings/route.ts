import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 'default',
          businessName: 'ISMS Pro Shop',
          currency: 'TZS',
          currencySymbol: 'TSh',
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
    const body = await request.json();
    
    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: body,
      create: {
        id: 'default',
        businessName: body.businessName || 'ISMS Pro Shop',
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
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
