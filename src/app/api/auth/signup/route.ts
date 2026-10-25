import { NextResponse } from 'next/server';
import { getProfileByEmail, getProfileByHandle, saveProfile } from '@/lib/store';
import {
  isBootstrapAdmin,
  isImmutableRootAdmin,
  hashPassword,
  createSessionToken,
} from '@/lib/serverAuth';

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

    // Root administrator handles cannot be registered via public signup
    if (isImmutableRootAdmin(cleanHandle) || isImmutableRootAdmin(cleanEmail)) {
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

    const isBootstrap = isBootstrapAdmin(cleanEmail) || isBootstrapAdmin(cleanHandle);
    const role = isBootstrap ? 'admin' : 'user';

    const profile = await saveProfile({
      id: `usr-${cleanHandle}-${Date.now().toString(36)}`,
      email: cleanEmail,
      name: name || cleanHandle,
      handle: cleanHandle,
      role,
      createdAt: new Date().toISOString(),
      passwordHash: password ? hashPassword(password) : undefined,
    });

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
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
