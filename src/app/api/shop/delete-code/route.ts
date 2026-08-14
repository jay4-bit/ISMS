import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendDeletionCode } from '@/lib/email';
import { createOneTimeCode } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const userId = request.headers.get('x-user-id');
    if (!shopId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the shop owner can request data deletion' }, { status: 403 });
    }

    const settings = await prisma.shopSettings.findUnique({ where: { shopId } });
    const businessEmail = settings?.businessEmail;
    if (!businessEmail) {
      return NextResponse.json({ error: 'No business email configured in settings' }, { status: 400 });
    }

    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } });
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const deletion = createOneTimeCode();

    await prisma.shop.update({
      where: { id: shopId },
      data: { deletionCode: deletion.digest, deletionCodeExpires: deletion.expiresAt },
    });

    await sendDeletionCode(businessEmail, deletion.code, shop.name);

    return NextResponse.json({ success: true, message: 'Verification code sent to business email' });
  } catch (error) {
    console.error('Delete code error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to send verification code';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
