import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyPassword } from '@/lib/password';
import { sendOtpEmail } from '@/lib/email';

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

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save/Overwrite OTP in database
    const otps = db.collection('otps');
    await otps.deleteMany({ email, purpose: 'login' });
    await otps.insertOne({
      email,
      code: otp,
      purpose: 'login',
      expiresAt,
      createdAt: new Date(),
    });

    // Send OTP via email using Brevo
    await sendOtpEmail(email, otp, 'login');

    return NextResponse.json({ ok: true, requiresOtp: true, email });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Login failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
