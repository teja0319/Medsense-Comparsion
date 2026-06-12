import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const otps = db.collection('otps');

    // Find valid OTP
    const otpDoc = await otps.findOne({
      email,
      code: otp,
      purpose: 'login',
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // OTP is valid, retrieve user to get role and ID
    const users = db.collection('users');
    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: 'User is inactive' }, { status: 403 });
    }

    // Delete verified OTP to prevent reuse
    await otps.deleteMany({ email, purpose: 'login' });

    // Complete login, issue token, and set session cookie
    const token = await signToken(email, user._id.toString(), user.role);
    await setAuthCookie(token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
