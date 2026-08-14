import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendPasswordResetCode } from '@/lib/email';
import { createOneTimeCode } from '@/lib/auth-server';

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

    const reset = createOneTimeCode();

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordCode: reset.digest, resetPasswordCodeExpires: reset.expiresAt },
    });

    try {
      await sendPasswordResetCode(user.email, reset.code, user.name);
    } catch {
      return NextResponse.json({ error: 'Failed to send reset email. Please contact support.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'If an account with this email exists, a reset code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
