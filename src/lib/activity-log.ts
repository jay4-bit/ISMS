import prisma from '@/lib/db';

export async function logActivity(params: {
  shopId: string;
  userId?: string;
  userName?: string;
  action: string;
  details?: string;
}) {
  try {
    await prisma.activity.create({ data: params });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
