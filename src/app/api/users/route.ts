import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hashPassword, validateNewPassword, verifyPassword } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); }
    const users = await prisma.user.findMany({
      where: { shopId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); }
    const body = await request.json();
    const { name, email, password, role, actingUserId, actingUserName } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const passwordError = validateNewPassword(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email_shopId: { email: normalizedEmail, shopId } } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
        shopId,
        emailVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    logActivity({
      shopId, userId: actingUserId || 'system', userName: actingUserName || 'System',
      action: 'USER_CREATED',
      details: `Created user ${name} (${email}) with role ${role}`,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); }
    const body = await request.json();
    const { id, name, role, isActive, newPassword, currentPassword } = body;
    const sessionUserId = request.headers.get('x-user-id');

    if (newPassword) {
      if (!id) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const passwordError = validateNewPassword(newPassword);
      if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
      if (id === sessionUserId) {
        const currentUser = await prisma.user.findFirst({ where: { id, shopId }, select: { password: true } });
        if (!currentUser || typeof currentPassword !== 'string' || !(await verifyPassword(currentPassword, currentUser.password))) {
          return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
        }
      }
      const hashedPassword = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id, shopId },
        data: { password: hashedPassword },
      });

      return NextResponse.json({ success: true });
    }

    if (id) {
      const target = await prisma.user.findFirst({ where: { id, shopId }, select: { role: true } });
      if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      if (target.role === 'OWNER' && ((role && role !== 'OWNER') || isActive === false)) {
        return NextResponse.json({ error: 'The shop owner cannot be demoted or disabled' }, { status: 400 });
      }
      const user = await prisma.user.update({
        where: { id, shopId },
        data: {
          ...(name && { name }),
          ...(role && { role }),
          ...(isActive !== undefined && { isActive }),
        },
      });
      return NextResponse.json({ user });
    }

    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    if (!shopId) { return NextResponse.json({ error: 'Shop ID required' }, { status: 400 }); }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const target = await prisma.user.findFirst({ where: { id, shopId }, select: { role: true } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.role === 'OWNER') return NextResponse.json({ error: 'The shop owner cannot be deleted' }, { status: 400 });

    await prisma.user.delete({ where: { id, shopId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
