import { NextResponse } from 'next/server';
import { getPendingOtp, savePendingOtp, appendAuditLog } from '@/lib/store';
import { generateOtp, sendOtpEmail } from '@/lib/emailOtp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    const pending = await getPendingOtp(email);
    if (!pending) {
      return NextResponse.json(
        { success: false, error: 'No active registration pending for this email. Please register again.' },
        { status: 400 }
      );
    }

    const newOtp = generateOtp();
    pending.otp = newOtp;
    pending.expiresAt = Date.now() + 10 * 60 * 1000;
    pending.attempts = 0;
    await savePendingOtp(pending);

    const sendRes = await sendOtpEmail(email, newOtp, pending.name);

    await appendAuditLog({
      category: 'auth',
      action: 'AUTH_OTP_RESENT',
      actor: { handle: pending.handle, email },
      target: { type: 'auth', label: email },
      status: 'info',
      description: `Fresh 6-digit confirmation code requested and resent to ${email}`,
    });

    return NextResponse.json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
      devOtp: sendRes.devOtp,
    });
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resend verification code.' },
      { status: 500 }
    );
  }
}
