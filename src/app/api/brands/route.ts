import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    
    const brands = await prisma.brand.findMany({
      where: shopId ? { shopId } : undefined,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ brands });
  } catch (error) {
    console.error('Get brands error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const body = await request.json();
    const { name } = body;

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    const existing = await prisma.brand.findFirst({
      where: { name, shopId }
    });
    if (existing) {
      return NextResponse.json({ error: 'Brand already exists' }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: { name, shopId },
    });

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('Create brand error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!shopId || !id) {
      return NextResponse.json({ error: 'Shop ID and Brand ID required' }, { status: 400 });
    }

    await prisma.brand.delete({ where: { id, shopId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete brand error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
