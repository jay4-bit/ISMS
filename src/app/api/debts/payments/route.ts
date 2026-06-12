import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Missing x-shop-id header' }, { status: 400 });

    const body = await request.json();
    const { debtId, amount, notes } = body;

    if (!debtId || amount === undefined) {
      return NextResponse.json({ error: 'debtId and amount are required' }, { status: 400 });
    }

    const debt = await prisma.debt.findFirst({ where: { id: debtId, shopId } });
    if (!debt) return NextResponse.json({ error: 'Debt not found' }, { status: 404 });

    const paid = parseFloat(amount);
    if (paid <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });

    const [payment] = await prisma.$transaction([
      prisma.debtPayment.create({
        data: { debtId, amount: paid, notes },
      }),
    ]);

    const newPaidAmount = debt.paidAmount + paid;
    const newStatus = newPaidAmount >= debt.amount ? 'SETTLED' : 'ACTIVE';

    const updated = await prisma.debt.update({
      where: { id: debtId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
      include: { payments: { orderBy: { paidAt: 'desc' } } },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error('POST /debts/payments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
