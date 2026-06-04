import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const { image } = await request.json();
    if (!image) return NextResponse.json({ error: 'Image data required' }, { status: 400 });

    await prisma.shop.update({
      where: { id: shopId },
      data: { logo: image },
    });

    return NextResponse.json({ success: true, logo: image });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    await prisma.shop.update({
      where: { id: shopId },
      data: { logo: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete logo error:', error);
    return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 });
  }
}
