import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

const MODULES = [
  { id: 'dashboard', name: 'Dashboard', description: 'View dashboard overview' },
  { id: 'inventory', name: 'Inventory', description: 'Manage products and stock' },
  { id: 'pos', name: 'POS/Sales', description: 'Process sales transactions' },
  { id: 'installments', name: 'Installments', description: 'Manage installment/credit sales' },
  { id: 'returns', name: 'Returns', description: 'Process returns and refunds' },
  { id: 'suppliers', name: 'Suppliers', description: 'Manage suppliers' },
  { id: 'purchase-orders', name: 'Purchase Orders', description: 'Create and manage purchase orders' },
  { id: 'stock-count', name: 'Stock Count', description: 'Perform stock counts' },
  { id: 'expenses', name: 'Expenses', description: 'Track business expenses' },
  { id: 'profit-loss', name: 'Profit & Loss', description: 'View financial reports' },
  { id: 'reports', name: 'Reports', description: 'Generate and view reports' },
  { id: 'users', name: 'User Management', description: 'Manage users and roles' },
  { id: 'settings', name: 'Settings', description: 'System settings' },
];

const DEFAULT_PERMISSIONS: Record<string, Record<string, { canRead: boolean; canWrite: boolean; canDelete: boolean }>> = {
  ADMIN: {
    dashboard: { canRead: true, canWrite: true, canDelete: true },
    inventory: { canRead: true, canWrite: true, canDelete: true },
    pos: { canRead: true, canWrite: true, canDelete: true },
    returns: { canRead: true, canWrite: true, canDelete: true },
    suppliers: { canRead: true, canWrite: true, canDelete: true },
    'purchase-orders': { canRead: true, canWrite: true, canDelete: true },
    'stock-count': { canRead: true, canWrite: true, canDelete: true },
    expenses: { canRead: true, canWrite: true, canDelete: true },
    'profit-loss': { canRead: true, canWrite: true, canDelete: true },
    reports: { canRead: true, canWrite: true, canDelete: true },
    users: { canRead: true, canWrite: true, canDelete: true },
    settings: { canRead: true, canWrite: true, canDelete: true },
  },
  MANAGER: {
    dashboard: { canRead: true, canWrite: true, canDelete: false },
    inventory: { canRead: true, canWrite: true, canDelete: false },
    pos: { canRead: true, canWrite: true, canDelete: false },
    returns: { canRead: true, canWrite: true, canDelete: false },
    suppliers: { canRead: true, canWrite: true, canDelete: false },
    'purchase-orders': { canRead: true, canWrite: true, canDelete: false },
    'stock-count': { canRead: true, canWrite: true, canDelete: false },
    expenses: { canRead: true, canWrite: true, canDelete: false },
    'profit-loss': { canRead: true, canWrite: false, canDelete: false },
    reports: { canRead: true, canWrite: false, canDelete: false },
    users: { canRead: true, canWrite: false, canDelete: false },
    settings: { canRead: true, canWrite: false, canDelete: false },
  },
  CASHIER: {
    dashboard: { canRead: true, canWrite: false, canDelete: false },
    inventory: { canRead: true, canWrite: false, canDelete: false },
    pos: { canRead: true, canWrite: true, canDelete: false },
    installments: { canRead: true, canWrite: true, canDelete: false },
    returns: { canRead: true, canWrite: true, canDelete: false },
    suppliers: { canRead: false, canWrite: false, canDelete: false },
    'purchase-orders': { canRead: false, canWrite: false, canDelete: false },
    'stock-count': { canRead: false, canWrite: false, canDelete: false },
    expenses: { canRead: false, canWrite: false, canDelete: false },
    'profit-loss': { canRead: false, canWrite: false, canDelete: false },
    reports: { canRead: false, canWrite: false, canDelete: false },
    users: { canRead: false, canWrite: false, canDelete: false },
    settings: { canRead: false, canWrite: false, canDelete: false },
  },
  ACCOUNTANT: {
    dashboard: { canRead: true, canWrite: false, canDelete: false },
    inventory: { canRead: false, canWrite: false, canDelete: false },
    pos: { canRead: false, canWrite: false, canDelete: false },
    returns: { canRead: false, canWrite: false, canDelete: false },
    suppliers: { canRead: false, canWrite: false, canDelete: false },
    'purchase-orders': { canRead: false, canWrite: false, canDelete: false },
    'stock-count': { canRead: false, canWrite: false, canDelete: false },
    expenses: { canRead: true, canWrite: true, canDelete: false },
    'profit-loss': { canRead: true, canWrite: false, canDelete: false },
    reports: { canRead: true, canWrite: true, canDelete: false },
    users: { canRead: false, canWrite: false, canDelete: false },
    settings: { canRead: false, canWrite: false, canDelete: false },
  },
  WINGER: {
    dashboard: { canRead: true, canWrite: false, canDelete: false },
    inventory: { canRead: true, canWrite: false, canDelete: false },
    pos: { canRead: true, canWrite: true, canDelete: false },
    returns: { canRead: false, canWrite: false, canDelete: false },
    suppliers: { canRead: false, canWrite: false, canDelete: false },
    'purchase-orders': { canRead: false, canWrite: false, canDelete: false },
    'stock-count': { canRead: true, canWrite: false, canDelete: false },
    expenses: { canRead: false, canWrite: false, canDelete: false },
    'profit-loss': { canRead: false, canWrite: false, canDelete: false },
    reports: { canRead: false, canWrite: false, canDelete: false },
    users: { canRead: false, canWrite: false, canDelete: false },
    settings: { canRead: false, canWrite: false, canDelete: false },
  },
  SHOP_ASSISTANT: {
    dashboard: { canRead: true, canWrite: false, canDelete: false },
    inventory: { canRead: true, canWrite: true, canDelete: false },
    pos: { canRead: true, canWrite: true, canDelete: false },
    returns: { canRead: false, canWrite: false, canDelete: false },
    suppliers: { canRead: false, canWrite: false, canDelete: false },
    'purchase-orders': { canRead: false, canWrite: false, canDelete: false },
    'stock-count': { canRead: true, canWrite: true, canDelete: false },
    expenses: { canRead: false, canWrite: false, canDelete: false },
    'profit-loss': { canRead: false, canWrite: false, canDelete: false },
    reports: { canRead: false, canWrite: false, canDelete: false },
    users: { canRead: false, canWrite: false, canDelete: false },
    settings: { canRead: false, canWrite: false, canDelete: false },
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (role) {
      const permissions = await prisma.rolePermission.findMany({
        where: { role },
      });
      return NextResponse.json({ permissions });
    }

    const allPermissions = await prisma.rolePermission.findMany();
    return NextResponse.json({ 
      modules: MODULES,
      permissions: allPermissions 
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, permissions } = body;

    if (!role || !permissions) {
      return NextResponse.json({ error: 'Role and permissions required' }, { status: 400 });
    }

    await prisma.rolePermission.deleteMany({
      where: { role },
    });

    const permissionRecords = permissions.map((p: any) => ({
      role,
      module: p.module,
      canRead: p.canRead,
      canWrite: p.canWrite,
      canDelete: p.canDelete,
    }));

    await prisma.rolePermission.createMany({
      data: permissionRecords,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save permissions error:', error);
    return NextResponse.json({ error: 'Failed to save permissions' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await prisma.rolePermission.deleteMany({});

    const allPermissions: any[] = [];
    
    for (const [role, modules] of Object.entries(DEFAULT_PERMISSIONS)) {
      for (const [module, perms] of Object.entries(modules)) {
        allPermissions.push({
          role,
          module,
          ...perms,
        });
      }
    }

    await prisma.rolePermission.createMany({
      data: allPermissions,
    });

    return NextResponse.json({ success: true, message: 'Default permissions restored' });
  } catch (error) {
    console.error('Reset permissions error:', error);
    return NextResponse.json({ error: 'Failed to reset permissions' }, { status: 500 });
  }
}
