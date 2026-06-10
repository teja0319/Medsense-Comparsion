import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/password';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const users = db.collection('users');

    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'User exists' }, { status: 409 });
    }

    const hashed = hashPassword(password);
    const now = new Date();
    const res = await users.insertOne({
      email,
      password: hashed,
      role: 'user', // Default role
      isActive: true,
      created_at: now,
      updated_at: now,
    });

    return NextResponse.json({ ok: true, id: res.insertedId.toString() });
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
