import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const { image } = await request.json();
    if (typeof image !== 'string') return NextResponse.json({ error: 'Image data required' }, { status: 400 });
    const match = image.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return NextResponse.json({ error: 'Only PNG, JPEG, and WebP images are supported' }, { status: 400 });
    const estimatedBytes = Math.floor(match[2].length * 0.75);
    if (estimatedBytes > 1024 * 1024) return NextResponse.json({ error: 'Logo must be smaller than 1 MB' }, { status: 413 });

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
