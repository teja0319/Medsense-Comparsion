import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/password';

export async function POST(req: Request) {
  try {
    const { email, otp, password } = await req.json();
    if (!email || !otp || !password) {
      return NextResponse.json({ error: 'All fields (email, otp, new password) are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const otps = db.collection('otps');

    // Find valid OTP
    const otpDoc = await otps.findOne({
      email,
      code: otp,
      purpose: 'forgot_password',
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return NextResponse.json({ error: 'Invalid or expired recovery code' }, { status: 400 });
    }

    // OTP is valid, hash the new password
    const hashedPassword = hashPassword(password);

    const users = db.collection('users');
    const result = await users.updateOne(
      { email },
      { 
        $set: { 
          password: hashedPassword, 
          updated_at: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete verified OTP to prevent reuse
    await otps.deleteMany({ email, purpose: 'forgot_password' });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
