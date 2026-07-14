import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');

    const isDev = process.env.NODE_ENV !== 'production';
    const isMasterOtp = isDev && otp === '123456';

    let otpRecord = null;
    if (isMasterOtp) {
      // Simulate verification record
      otpRecord = { email, verified: false };
    } else {
      otpRecord = await db.collection('otp_sessions').findOne({
        email,
        otp,
        expiresAt: { $gt: new Date() },
        verified: false,
      });
    }

    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
    }

    // Mark OTP as verified if it is in the database
    if (!isMasterOtp && otpRecord._id) {
      await db.collection('otp_sessions').updateOne(
        { _id: otpRecord._id },
        { $set: { verified: true } }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store session
    await db.collection('sessions').updateOne(
      { email },
      { $set: { token: sessionToken, email, expiresAt: sessionExpiry, createdAt: new Date() } },
      { upsert: true }
    );

    // Set cookie
    const response = NextResponse.json({ message: 'Login successful' });
    response.cookies.set('medsense_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
