import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    
    const categories = await prisma.category.findMany({
      where: shopId ? { shopId } : undefined,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    console.log('Creating category, shopId:', shopId);
    const body = await request.json();
    const { name, description } = body;
    console.log('Category name:', name);

    if (!shopId) {
      console.log('No shopId provided');
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const existingCategory = await prisma.category.findFirst({
      where: { name, shopId }
    });
    console.log('Existing category:', existingCategory);
    if (existingCategory) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    console.log('Creating category with data:', { name, shopId });
    const category = await prisma.category.create({
      data: { 
        name, 
        description, 
        shopId 
      },
    });
    console.log('Category created:', category);

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('Error message:', errorMessage);
    return NextResponse.json({ error: 'Failed: ' + errorMessage, details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const body = await request.json();
    const { id, name, description } = body;

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id, shopId },
      data: { name, description },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!shopId || !id) {
      return NextResponse.json({ error: 'Shop ID and Category ID required' }, { status: 400 });
    }

    await prisma.category.delete({ where: { id, shopId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}