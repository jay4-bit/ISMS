import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const reminders = await prisma.reminder.findMany({
      where: { shopId },
      orderBy: [{ isActive: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ reminders });
  } catch (error) {
    console.error('Get reminders error:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const { title, description, dueDate } = await request.json();
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const reminder = await prisma.reminder.create({
      data: {
        title: title.trim(),
        description: description || '',
        dueDate: dueDate ? new Date(dueDate) : null,
        shopId,
      },
    });

    return NextResponse.json({ reminder });
  } catch (error) {
    console.error('Create reminder error:', error);
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const { id, title, description, dueDate, isActive } = await request.json();
    if (!id) return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 });

    const existing = await prisma.reminder.findFirst({ where: { id, shopId } });
    if (!existing) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (isActive !== undefined) data.isActive = isActive;

    const reminder = await prisma.reminder.update({ where: { id }, data });

    return NextResponse.json({ reminder });
  } catch (error) {
    console.error('Update reminder error:', error);
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 });

    await prisma.reminder.delete({ where: { id, shopId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete reminder error:', error);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
}
