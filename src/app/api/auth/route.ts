import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { hashPassword, generateToken, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name } = body;

    if (action === 'register') {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role: 'CASHIER' },
      });

      const token = generateToken(user.id, user.role);
      const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
      response.cookies.set('auth-token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
      return response;
    }

    const loginEmail = action === 'login' ? email : email;
    const user = await prisma.user.findUnique({ where: { email: loginEmail } });
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = generateToken(user.id, user.role);
    const response = NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        username: user.username,
        role: user.role 
      },
      token 
    });
    response.cookies.set('auth-token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
    return response;

    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.cookies.delete('auth-token');
      return response;
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const { verifyToken } = await import('@/lib/auth');
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ user });
}
