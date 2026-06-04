import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

const BUILT_IN_ROLES = [
  { name: 'OWNER', label: 'Owner', description: 'Full control of the shop', color: '#ef4444', builtIn: true },
  { name: 'MANAGER', label: 'Manager', description: 'Can manage inventory and reports', color: '#f59e0b', builtIn: true },
  { name: 'CASHIER', label: 'Cashier', description: 'Can process sales and returns', color: '#3b82f6', builtIn: true },
  { name: 'PHARMACIST', label: 'Pharmacist', description: 'For pharmacy shop type', color: '#8b5cf6', builtIn: true },
  { name: 'WINGER', label: 'Winger', description: 'Can assist sales and inventory', color: '#22c55e', builtIn: true },
  { name: 'ASSISTANT', label: 'Assistant', description: 'Can process sales and manage stock', color: '#ec4899', builtIn: true },
];

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const customRoles = await prisma.customRole.findMany({
      where: { shopId },
      orderBy: { createdAt: 'asc' },
    });

    const allRoles = [
      ...BUILT_IN_ROLES.map(r => ({ ...r, id: r.name, builtIn: true })),
      ...customRoles.map(r => ({ name: r.name, label: r.name, description: r.description, color: r.color, id: r.id, builtIn: false })),
    ];

    return NextResponse.json({ roles: allRoles });
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const { name, description, color } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const nameUpper = name.toUpperCase().trim();
    if (BUILT_IN_ROLES.find(r => r.name === nameUpper)) {
      return NextResponse.json({ error: 'A built-in role with that name already exists' }, { status: 400 });
    }

    const existing = await prisma.customRole.findUnique({ where: { name_shopId: { name: nameUpper, shopId } } });
    if (existing) {
      return NextResponse.json({ error: 'A custom role with that name already exists' }, { status: 400 });
    }

    const customRole = await prisma.customRole.create({
      data: {
        name: nameUpper,
        description: description || '',
        color: color || '#6b7280',
        shopId,
      },
    });

    return NextResponse.json({
      role: { ...customRole, label: customRole.name, builtIn: false },
    });
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const { id, name, description, color } = await request.json();
    if (!id) return NextResponse.json({ error: 'Role ID required' }, { status: 400 });

    const existing = await prisma.customRole.findFirst({ where: { id, shopId } });
    if (!existing) return NextResponse.json({ error: 'Custom role not found' }, { status: 404 });

    const data: any = {};
    if (name && name.trim()) data.name = name.toUpperCase().trim();
    if (description !== undefined) data.description = description;
    if (color) data.color = color;

    const updated = await prisma.customRole.update({ where: { id }, data });

    return NextResponse.json({ role: { ...updated, label: updated.name, builtIn: false } });
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (name) {
      await prisma.customRole.deleteMany({ where: { name, shopId } });
      await prisma.permission.deleteMany({ where: { role: name, shopId } });
      await prisma.user.updateMany({ where: { role: name, shopId }, data: { role: 'CASHIER' } });
      return NextResponse.json({ success: true });
    }

    if (id) {
      const role = await prisma.customRole.findFirst({ where: { id, shopId } });
      if (!role) return NextResponse.json({ error: 'Custom role not found' }, { status: 404 });
      await prisma.permission.deleteMany({ where: { role: role.name, shopId } });
      await prisma.user.updateMany({ where: { role: role.name, shopId }, data: { role: 'CASHIER' } });
      await prisma.customRole.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'ID or name required' }, { status: 400 });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
