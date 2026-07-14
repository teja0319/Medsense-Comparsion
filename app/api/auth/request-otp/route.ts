import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store in MongoDB
    await db.collection('otp_sessions').updateOne(
      { email },
      { $set: { otp, email, expiresAt, verified: false, createdAt: new Date() } },
      { upsert: true }
    );

    // Send email using SMTP Brevo
    const sender = process.env.SMTP_SENDER || 'developers@yira.ai';
    await transporter.sendMail({
      from: `"Medsense Security" <${sender}>`,
      to: email,
      subject: `🔐 ${otp} is your Medsense verification code`,
      text: `Your Medsense verification code is ${otp}. This code is valid for 5 minutes.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #0f172a;
              margin: 0;
              padding: 0;
            }
            .wrapper {
              background-color: #0f172a;
              padding: 40px 20px;
            }
            .container {
              max-width: 480px;
              margin: 0 auto;
              background: #1e293b;
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 16px;
              padding: 32px;
              text-align: center;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
            }
            .logo {
              font-size: 26px;
              font-weight: 800;
              color: #3b82f6;
              margin-bottom: 24px;
              letter-spacing: -0.5px;
            }
            .title {
              font-size: 18px;
              font-weight: 700;
              color: #ffffff;
              margin-bottom: 12px;
            }
            .subtitle {
              font-size: 13px;
              color: #94a3b8;
              line-height: 1.55;
              margin-bottom: 30px;
            }
            .otp-card {
              background: #0f172a;
              border: 1px solid rgba(255, 255, 255, 0.04);
              padding: 18px 28px;
              border-radius: 12px;
              display: inline-block;
              margin-bottom: 30px;
            }
            .otp-code {
              font-family: 'Courier New', Courier, monospace;
              font-size: 36px;
              font-weight: 800;
              letter-spacing: 6px;
              color: #3b82f6;
            }
            .footer {
              font-size: 11px;
              color: #64748b;
              border-top: 1px solid rgba(255, 255, 255, 0.06);
              padding-top: 20px;
              line-height: 1.45;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="logo">Medsense</div>
              <div class="title">Verification Code</div>
              <div class="subtitle">Please use the verification code below to access your Medsense Dashboard session.</div>
              <div class="otp-card">
                <div class="otp-code">${otp}</div>
              </div>
              <div class="footer">
                This code was requested for a dashboard login attempt.<br>
                It is valid for 5 minutes. If you did not request this code, you can safely ignore this email.
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    // Log OTP to console for development verification fallback
    console.log(`\n🔐 OTP for ${email}: ${otp}\n`);

    // In development mode, return the OTP in response for easy testing
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({ 
      message: 'OTP sent successfully',
      debugOtp: isDev ? otp : undefined
    });
  } catch (error) {
    console.error('Error requesting OTP:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
