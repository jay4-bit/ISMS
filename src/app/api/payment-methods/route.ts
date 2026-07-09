import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const methods = await prisma.adminPaymentMethod.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, type: true, label: true, name: true, number: true },
  });
  return NextResponse.json({ methods });
}
