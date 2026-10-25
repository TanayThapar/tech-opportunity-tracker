import { NextResponse } from 'next/server';
import { getPendingOtp, deletePendingOtp, saveProfile, savePendingOtp } from '@/lib/store';
import { createSessionToken } from '@/lib/serverAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();
    const otp = body.otp?.trim();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and OTP code are required.' },
        { status: 400 }
      );
    }

    const pending = await getPendingOtp(email);
    if (!pending) {
      return NextResponse.json(
        { success: false, error: 'Verification code expired or not found. Please request a new code.' },
        { status: 400 }
      );
    }

    if (pending.otp !== otp) {
      pending.attempts = (pending.attempts || 0) + 1;
      if (pending.attempts >= 5) {
        await deletePendingOtp(email);
        return NextResponse.json(
          { success: false, error: 'Too many failed attempts. Please register again.' },
          { status: 400 }
        );
      }
      await savePendingOtp(pending);
      return NextResponse.json(
        { success: false, error: `Invalid verification code. ${5 - pending.attempts} attempts remaining.` },
        { status: 400 }
      );
    }

    // OTP verified successfully! Create user profile
    const profile = await saveProfile({
      id: `usr-${pending.handle}-${Date.now().toString(36)}`,
      email: pending.email,
      name: pending.name,
      handle: pending.handle,
      role: 'user',
      createdAt: new Date().toISOString(),
      passwordHash: pending.passwordHash,
      emailVerified: true,
    });

    await deletePendingOtp(email);

    const token = createSessionToken({
      userId: profile.id,
      email: profile.email,
      handle: profile.handle,
      role: profile.role,
    });

    const { passwordHash: _, ...sanitizedProfile } = profile;

    const response = NextResponse.json({
      success: true,
      user: sanitizedProfile,
      token,
      message: 'Email verified successfully! Welcome to Opportunity Radar.',
    });

    response.cookies.set('radar_session', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}
