import { NextResponse } from 'next/server';
import { getProfileByEmail, getProfileByHandle, savePendingOtp, appendAuditLog } from '@/lib/store';
import {
  isImmutableRootAdmin,
  hashPassword,
} from '@/lib/serverAuth';
import { generateOtp, sendOtpEmail } from '@/lib/emailOtp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body.name?.trim();
    const identifier = body.identifier?.trim();
    const emailInput = body.email?.trim() || (identifier && identifier.includes('@') ? identifier : undefined);
    const handleInput = body.handle?.trim() || (identifier && !identifier.includes('@') ? identifier : undefined);
    const password = body.password ? String(body.password) : '';

    const cleanHandle = (handleInput || emailInput?.split('@')[0] || 'user')
      .replace(/^@/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');

    const cleanEmail = (emailInput || `${cleanHandle}@radar.internal`).toLowerCase();

    if (!cleanHandle || !cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Username or email is required.' },
        { status: 400 }
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Root administrator handles cannot be registered via public signup
    if (isImmutableRootAdmin(cleanHandle) || isImmutableRootAdmin(cleanEmail)) {
      await appendAuditLog({
        category: 'security',
        action: 'AUTH_SIGNUP_REQUEST',
        actor: { handle: cleanHandle, email: cleanEmail },
        target: { type: 'auth', label: `@${cleanHandle}` },
        status: 'failure',
        description: `Blocked public sign-up registration attempt for protected root administrator account @${cleanHandle}`,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Root administrator accounts cannot be registered via public sign-up. Please sign in with your root credentials.',
        },
        { status: 403 }
      );
    }

    // Check if user already exists
    const existingEmail = await getProfileByEmail(cleanEmail);
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      );
    }

    const existingHandle = await getProfileByHandle(cleanHandle);
    if (existingHandle) {
      return NextResponse.json(
        { success: false, error: 'This username is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    // Generate 6-digit confirmation OTP
    const otp = generateOtp();
    const passwordHash = password ? hashPassword(password) : hashPassword('Manipal_Default');

    await savePendingOtp({
      email: cleanEmail,
      handle: cleanHandle,
      name: name || cleanHandle,
      passwordHash,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });

    const sendRes = await sendOtpEmail(cleanEmail, otp, name || cleanHandle);

    await appendAuditLog({
      category: 'auth',
      action: 'AUTH_SIGNUP_REQUEST',
      actor: { handle: cleanHandle, email: cleanEmail },
      target: { type: 'auth', label: cleanEmail },
      status: 'info',
      description: `New registration initiated for @${cleanHandle} (${cleanEmail}). 6-digit confirmation code dispatched.`,
    });

    return NextResponse.json({
      success: true,
      requireOtp: true,
      email: cleanEmail,
      message: 'A 6-digit verification code has been sent to your email address.',
      devOtp: sendRes.devOtp,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}

