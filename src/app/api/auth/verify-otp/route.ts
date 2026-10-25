import { NextResponse } from 'next/server';
import { getPendingOtp, deletePendingOtp, saveProfile, savePendingOtp, appendAuditLog } from '@/lib/store';
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

    if (Date.now() > pending.expiresAt) {
      await deletePendingOtp(email);
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    if (pending.otp !== otp) {
      pending.attempts = (pending.attempts || 0) + 1;
      await appendAuditLog({
        category: 'auth',
        action: 'AUTH_OTP_FAILED',
        actor: { handle: pending.handle, email },
        target: { type: 'auth', label: email },
        status: 'failure',
        description: `Failed OTP confirmation attempt for ${email}: Incorrect code (${pending.attempts}/5)`,
      });
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

    await appendAuditLog({
      category: 'auth',
      action: 'AUTH_OTP_VERIFIED',
      actor: { id: profile.id, handle: profile.handle, email: profile.email, role: profile.role },
      target: { type: 'user', id: profile.id, label: `@${profile.handle}` },
      status: 'success',
      description: `Email ${email} verified successfully. Account @${profile.handle} activated.`,
    });

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
