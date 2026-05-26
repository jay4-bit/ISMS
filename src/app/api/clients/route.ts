import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    if (id) {
      const customer = await prisma.customer.findUnique({
        where: { id, shopId },
        include: {
          sales: { orderBy: { createdAt: 'desc' }, take: 10 },
          installmentSales: { orderBy: { createdAt: 'desc' } }
        },
      });
      return NextResponse.json({ customer });
    }

    const where = search ? {
      shopId,
      OR: [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ],
    } : { shopId };

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: { select: { sales: true, installmentSales: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, phone, address, prescriptionNumber, dateOfBirth, creditLimit } = body;

    if (phone) {
      const existing = await prisma.customer.findFirst({
        where: { phone, shopId }
      });
      if (existing) {
        return NextResponse.json({ error: 'Customer with this phone already exists' }, { status: 400 });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        prescriptionNumber: prescriptionNumber || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        creditLimit: creditLimit || 0,
        shopId,
      },
    });

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { id, name, email, phone, address, prescriptionNumber, dateOfBirth, creditLimit, isActive } = body;

    const customer = await prisma.customer.update({
      where: { id, shopId },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        prescriptionNumber: prescriptionNumber || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        creditLimit: creditLimit || 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || !shopId) {
      return NextResponse.json({ error: 'Customer ID and Shop ID required' }, { status: 400 });
    }

    await prisma.customer.delete({ where: { id, shopId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}