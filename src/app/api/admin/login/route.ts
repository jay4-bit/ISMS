import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHashB64 = process.env.ADMIN_PASSWORD_HASH_B64;

    if (!JWT_SECRET || !adminEmail || !adminPasswordHashB64) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
    }

    if (email !== adminEmail) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const adminPasswordHash = Buffer.from(adminPasswordHashB64, 'base64').toString('utf-8');
    const valid = await bcrypt.compare(password, adminPasswordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { isAdmin: true, email: adminEmail },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
