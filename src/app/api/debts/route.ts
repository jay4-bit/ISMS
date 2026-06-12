import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = request.headers.get('x-shop-id');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: any = { shopId };
    if (type && (type === 'DEBTOR' || type === 'CREDITOR')) where.type = type;
    if (status && (status === 'ACTIVE' || status === 'SETTLED' || status === 'CANCELLED')) where.status = status;

    const debts = await prisma.debt.findMany({
      where,
      include: {
        payments: { orderBy: { paidAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(debts);
  } catch (error) {
    console.error('GET /debts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Missing x-shop-id header' }, { status: 400 });

    const body = await request.json();
    const { personName, personPhone, type, amount, description, dueDate, notes } = body;

    if (!personName || !type || amount === undefined) {
      return NextResponse.json({ error: 'personName, type, and amount are required' }, { status: 400 });
    }
    if (type !== 'DEBTOR' && type !== 'CREDITOR') {
      return NextResponse.json({ error: 'type must be DEBTOR or CREDITOR' }, { status: 400 });
    }

    const debt = await prisma.debt.create({
      data: {
        personName,
        personPhone,
        type,
        amount: parseFloat(amount),
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        shopId,
      },
      include: { payments: true },
    });

    return NextResponse.json(debt, { status: 201 });
  } catch (error) {
    console.error('POST /debts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Missing x-shop-id header' }, { status: 400 });

    const body = await request.json();
    const { id, personName, personPhone, type, amount, description, dueDate, notes, status } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await prisma.debt.findFirst({ where: { id, shopId } });
    if (!existing) return NextResponse.json({ error: 'Debt not found' }, { status: 404 });

    const data: any = {};
    if (personName !== undefined) data.personName = personName;
    if (personPhone !== undefined) data.personPhone = personPhone;
    if (type !== undefined) {
      if (type !== 'DEBTOR' && type !== 'CREDITOR') {
        return NextResponse.json({ error: 'type must be DEBTOR or CREDITOR' }, { status: 400 });
      }
      data.type = type;
    }
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (description !== undefined) data.description = description;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) data.notes = notes;
    if (status !== undefined) {
      if (status !== 'ACTIVE' && status !== 'SETTLED' && status !== 'CANCELLED') {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      data.status = status;
    }

    const debt = await prisma.debt.update({
      where: { id },
      data,
      include: { payments: { orderBy: { paidAt: 'desc' } } },
    });

    return NextResponse.json(debt);
  } catch (error) {
    console.error('PUT /debts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Missing x-shop-id header' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id query param is required' }, { status: 400 });

    const existing = await prisma.debt.findFirst({ where: { id, shopId } });
    if (!existing) return NextResponse.json({ error: 'Debt not found' }, { status: 404 });

    await prisma.debt.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /debts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
