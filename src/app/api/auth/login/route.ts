import { NextResponse } from 'next/server';
import { getProfileByEmail, getProfileByHandle, saveProfile } from '@/lib/store';
import {
  isBootstrapAdmin,
  hashPassword,
  verifyPassword,
  createSessionToken,
} from '@/lib/serverAuth';
import { UserProfile } from '@/types/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = body.identifier?.trim();
    const password = body.password ? String(body.password) : '';
    const name = body.name?.trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Identifier (username or email) is required.' },
        { status: 400 }
      );
    }

    const clean = identifier.replace(/^@/, '').trim();
    const isEmail = clean.includes('@');
    const email = isEmail ? clean.toLowerCase() : `${clean.toLowerCase()}@radar.internal`;
    const handle = clean.split('@')[0];
    const isBootstrap = isBootstrapAdmin(clean) || isBootstrapAdmin(email) || isBootstrapAdmin(handle);

    // Look for existing profile
    let profile: UserProfile | null = await getProfileByEmail(email);
    if (!profile) {
      profile = await getProfileByHandle(handle);
    }

    if (profile) {
      // If profile has a passwordHash and password is provided, verify it
      if (profile.passwordHash && password) {
        const matches = verifyPassword(password, profile.passwordHash);
        if (!matches) {
          return NextResponse.json(
            { success: false, error: 'Invalid password. Please check your credentials.' },
            { status: 401 }
          );
        }
      } else if (!profile.passwordHash && password) {
        // First login with password sets it
        profile.passwordHash = hashPassword(password);
      }

      // Re-assert admin role if bootstrap admin
      if (isBootstrap && profile.role !== 'admin') {
        profile.role = 'admin';
      }
      profile = await saveProfile(profile);
    } else {
      // Auto-provision bootstrap admin or new tester/user
      const initialRole = isBootstrap ? 'admin' : 'user';
      profile = await saveProfile({
        id: `usr-${handle.toLowerCase()}`,
        email,
        name: name || handle,
        handle,
        role: initialRole,
        createdAt: new Date().toISOString(),
        passwordHash: password ? hashPassword(password) : undefined,
      });
    }

    // Generate verified cryptographic HMAC session token
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

    // Set secure HTTP-only cookie for session persistence across navigation
    response.cookies.set('radar_session', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
