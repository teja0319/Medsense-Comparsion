export async function sendOtpEmail(email: string, otp: string, purpose: 'login' | 'forgot_password'): Promise<any> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'developers@yira.ai';
  const senderName = process.env.BREVO_SENDER_NAME || 'MedSense Security';

  console.log(`[sendOtpEmail] Attempting to send ${purpose} email to ${email}`);
  console.log(`[sendOtpEmail] config - BREVO_API_KEY present: ${!!apiKey}, SENDER_EMAIL: ${senderEmail}, SENDER_NAME: ${senderName}`);

  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not defined in environment variables.');
  }

  const subject = purpose === 'login' 
    ? 'MedSense - Login Verification Code' 
    : 'MedSense - Reset Your Password';

  const htmlContent = purpose === 'login'
    ? `<!DOCTYPE html>
       <html>
       <head>
         <meta charset="utf-8">
         <title>Login Verification</title>
       </head>
       <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 32px 16px; margin: 0; color: #0f172a;">
         <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
           <div style="text-align: center; margin-bottom: 24px;">
             <span style="font-size: 24px; font-weight: bold; color: oklch(0.55 0.176 265.75);">MedSense</span>
           </div>
           <h2 style="font-size: 20px; font-weight: 600; text-align: center; margin-bottom: 8px;">Verify Your Identity</h2>
           <p style="font-size: 14px; color: #64748b; text-align: center; line-height: 1.5; margin-bottom: 24px;">
             Enter the following code to complete your login. This code is valid for 10 minutes.
           </p>
           <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
             <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${otp}</span>
           </div>
           <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 32px;">
             If you did not request this verification code, please ignore this email or contact support.
           </p>
         </div>
       </body>
       </html>`
    : `<!DOCTYPE html>
       <html>
       <head>
         <meta charset="utf-8">
         <title>Reset Your Password</title>
       </head>
       <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 32px 16px; margin: 0; color: #0f172a;">
         <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
           <div style="text-align: center; margin-bottom: 24px;">
             <span style="font-size: 24px; font-weight: bold; color: oklch(0.55 0.176 265.75);">MedSense</span>
           </div>
           <h2 style="font-size: 20px; font-weight: 600; text-align: center; margin-bottom: 8px;">Reset Your Password</h2>
           <p style="font-size: 14px; color: #64748b; text-align: center; line-height: 1.5; margin-bottom: 24px;">
             You requested to reset your password. Use the code below to complete the reset process. This code is valid for 10 minutes.
           </p>
           <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
             <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${otp}</span>
           </div>
           <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 32px;">
             If you did not request a password reset, you can safely ignore this email.
           </p>
         </div>
       </body>
       </html>`;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [
        {
          email: email,
        }
      ],
      subject: subject,
      htmlContent: htmlContent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email via Brevo: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}
