import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('Get suppliers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, address, contactPerson, notes } = body;

    const supplier = await prisma.supplier.create({
      data: { name, email, phone, address, contactPerson, notes },
    });

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, email, phone, address, contactPerson, notes, isActive } = body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, email, phone, address, contactPerson, notes, isActive },
    });

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || undefined;

    await prisma.supplier.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
