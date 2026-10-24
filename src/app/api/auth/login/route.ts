import { NextResponse } from 'next/server';
import { getProfileByEmail, getProfileByHandle, saveProfile } from '@/lib/store';
import { isBootstrapAdmin } from '@/lib/serverAuth';
import { UserProfile } from '@/types/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = body.identifier?.trim();
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
      // Re-assert admin role if bootstrap admin
      if (isBootstrap && profile.role !== 'admin') {
        profile.role = 'admin';
        profile = await saveProfile(profile);
      }
    } else {
      // Provision profile with verified DB role
      profile = await saveProfile({
        id: `usr-${handle.toLowerCase()}`,
        email,
        name: name || handle,
        handle,
        role: isBootstrap ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
      });
    }

    const response = NextResponse.json({ success: true, user: profile });
    // Set cookie for session persistence across navigation
    response.cookies.set('radar_user_id', profile.id, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
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
