import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logActivity } from '@/lib/activity-log';

export async function GET(request: Request) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { shopId };
    
    if (category) {
      where.category = category;
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate);
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const totalExpenses = await prisma.expense.aggregate({
      _sum: { amount: true },
      where,
    });

    return NextResponse.json({
      expenses,
      total: totalExpenses._sum.amount || 0,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { category, amount, description, reference, date, userId, userName, returnItemId } = body;

    if (!category || !amount || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const refValue = (category === 'MAINTENANCE' && returnItemId)
      ? `RETURN_ITEM:${returnItemId}`
      : (reference || null);

    const expense = await prisma.expense.create({
      data: {
        category,
        amount: parseFloat(amount),
        description,
        reference: refValue,
        date: date ? new Date(date) : new Date(),
        createdBy: 'system',
        shopId,
      },
    });

    if (category === 'MAINTENANCE' && returnItemId) {
      const existingReturnItem = await prisma.returnItem.findFirst({ where: { id: returnItemId, return: { shopId } } });
      if (!existingReturnItem) return NextResponse.json({ error: 'Return item not found' }, { status: 404 });
      const retItem = await prisma.returnItem.update({
        where: { id: existingReturnItem.id },
        data: { repairCost: parseFloat(amount) },
      });
      // Mark the product as fixed (no longer faulty) — stock was already restored on return
      await prisma.product.update({
        where: { id: retItem.productId, shopId },
        data: { isFaulty: false },
      });
    }

    logActivity({
      shopId, userId: userId || 'system', userName: userName || 'System',
      action: 'EXPENSE_ADDED',
      details: `Expense ${description} — ${parseFloat(amount).toLocaleString()} (${category})`,
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { id, category, amount, description, reference, date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const expense = await prisma.expense.update({
      where: { id, shopId },
      data: {
        ...(category && { category }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(description && { description }),
        ...(reference !== undefined && { reference }),
        ...(date && { date: new Date(date) }),
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const shopId = request.headers.get('x-shop-id') || undefined;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || !shopId) {
      return NextResponse.json({ error: 'Expense ID and Shop ID required' }, { status: 400 });
    }

    // Find the expense first to check if it's a maintenance record
    const expense = await prisma.expense.findUnique({ where: { id, shopId } });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id, shopId } });

    // If maintenance expense, revert product to faulty if no other maintenance for this return item
    if (expense.category === 'MAINTENANCE' && expense.reference?.startsWith('RETURN_ITEM:')) {
      const returnItemId = expense.reference.replace('RETURN_ITEM:', '');
      const remainingCount = await prisma.expense.count({
        where: { shopId, category: 'MAINTENANCE', reference: expense.reference },
      });
      const retItem = await prisma.returnItem.findFirst({ where: { id: returnItemId, return: { shopId } }, select: { productId: true } });
      if (retItem) {
        if (remainingCount > 0) {
          const sum = await prisma.expense.aggregate({
            where: { shopId, category: 'MAINTENANCE', reference: expense.reference },
            _sum: { amount: true },
          });
          await prisma.returnItem.update({
            where: { id: returnItemId },
            data: { repairCost: sum._sum.amount || 0 },
          });
        } else {
          await prisma.returnItem.update({
            where: { id: returnItemId },
            data: { repairCost: 0 },
          });
          await prisma.product.update({
            where: { id: retItem.productId, shopId },
            data: { isFaulty: true },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
