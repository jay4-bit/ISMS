import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, validateNewPassword, verifyOneTimeCode } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();
    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, code, and new password are required' }, { status: 400 });
    }

    const passwordError = validateNewPassword(newPassword);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), isActive: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    if (!user.resetPasswordCode || !user.resetPasswordCodeExpires) {
      return NextResponse.json({ error: 'No reset code requested. Please request a new one.' }, { status: 400 });
    }

    if (!verifyOneTimeCode(code, user.resetPasswordCode)) {
      return NextResponse.json({ error: 'Invalid reset code' }, { status: 400 });
    }

    if (new Date() > user.resetPasswordCodeExpires) {
      return NextResponse.json({ error: 'Reset code has expired. Please request a new one.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordCode: null,
        resetPasswordCodeExpires: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
