import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendPasswordResetCode } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), isActive: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'If an account with this email exists, a reset code has been sent.' }, { status: 200 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordCode: code, resetPasswordCodeExpires: expiresAt },
    });

    try {
      await sendPasswordResetCode(user.email, code, user.name);
    } catch {
      return NextResponse.json({ error: 'Failed to send reset email. Please contact support.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'If an account with this email exists, a reset code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
