import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET ?? '';

function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    return decoded.isAdmin ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const admin = verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const methods = await prisma.adminPaymentMethod.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json({ methods });
}

export async function POST(request: NextRequest) {
  const admin = verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { type, label, name, number, isActive, sortOrder } = body;

  if (!type || !label) {
    return NextResponse.json({ error: 'Type and label are required' }, { status: 400 });
  }

  const method = await prisma.adminPaymentMethod.create({
    data: { type, label, name: name || null, number: number || null, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 },
  });

  return NextResponse.json({ success: true, method });
}

export async function PUT(request: NextRequest) {
  const admin = verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, type, label, name, number, isActive, sortOrder } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const data: any = {};
  if (type !== undefined) data.type = type;
  if (label !== undefined) data.label = label;
  if (name !== undefined) data.name = name;
  if (number !== undefined) data.number = number;
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const method = await prisma.adminPaymentMethod.update({ where: { id }, data });
  return NextResponse.json({ success: true, method });
}

export async function DELETE(request: NextRequest) {
  const admin = verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await prisma.adminPaymentMethod.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
