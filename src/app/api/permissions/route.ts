import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { MODULES, getDefaultPermissions } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const role = request.nextUrl.searchParams.get('role');

    const where: any = { shopId };
    if (role) where.role = role;

    const permissions = await prisma.permission.findMany({ where });

    return NextResponse.json({ modules: MODULES, permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { role, permissions } = body;

    if (!role || !permissions) {
      return NextResponse.json({ error: 'Role and permissions required' }, { status: 400 });
    }

    await prisma.permission.deleteMany({ where: { shopId, role } });

    if (permissions.length > 0) {
      const data = permissions.map((perm: { module: string; canRead: boolean; canWrite: boolean; canDelete: boolean }) => ({
        role,
        module: perm.module,
        canRead: perm.canRead,
        canWrite: perm.canWrite,
        canDelete: perm.canDelete,
        shopId,
      }));
      await prisma.permission.createMany({ data });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save permissions error:', error?.message || error, error?.stack || '');
    return NextResponse.json({ error: error?.message || 'Failed to save permissions' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (role) {
      await prisma.permission.deleteMany({ where: { shopId, role } });
    } else {
      await prisma.permission.deleteMany({ where: { shopId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset permissions error:', error);
    return NextResponse.json({ error: 'Failed to reset permissions' }, { status: 500 });
  }
}
