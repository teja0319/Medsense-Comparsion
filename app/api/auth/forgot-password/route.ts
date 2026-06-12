import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import crypto from 'crypto';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const users = db.collection('users');
    
    // Check if user exists
    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'No user found with this email address' }, { status: 404 });
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: 'User is inactive' }, { status: 403 });
    }

    // Generate a secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save/Overwrite OTP in database for forgot password
    const otps = db.collection('otps');
    await otps.deleteMany({ email, purpose: 'forgot_password' });
    await otps.insertOne({
      email,
      code: otp,
      purpose: 'forgot_password',
      expiresAt,
      createdAt: new Date(),
    });

    // Send OTP via email using Brevo
    await sendOtpEmail(email, otp, 'forgot_password');

    return NextResponse.json({ ok: true, email });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
