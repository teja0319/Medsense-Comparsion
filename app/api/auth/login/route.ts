import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyPassword } from '@/lib/password';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Missing' }, { status: 400 });

    const { db } = await connectToDatabase();
    const users = db.collection('users');
    const user = await users.findOne({ email });
    if (!user) return NextResponse.json({ error: 'Invalid' }, { status: 401 });

    // Check if user is active
    if (user.isActive === false) {
      return NextResponse.json({ error: 'User is inactive' }, { status: 403 });
    }

    const ok = verifyPassword(password, user.password as string);
    if (!ok) return NextResponse.json({ error: 'Invalid' }, { status: 401 });

    const token = await signToken(email, user._id.toString(), user.role);
    await setAuthCookie(token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
