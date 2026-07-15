import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendVerificationCode } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), emailVerified: false },
    });

    if (!user) {
      return NextResponse.json({ error: 'No unverified account found with this email' }, { status: 400 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationCode: code },
    });

    try {
      await sendVerificationCode(user.email, code, user.name);
    } catch {
      return NextResponse.json({ error: 'Failed to send verification email. Check SMTP settings.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Verification code resent to your email' });
  } catch (error) {
    console.error('Resend code error:', error);
    return NextResponse.json({ error: 'Failed to resend code' }, { status: 500 });
  }
}
