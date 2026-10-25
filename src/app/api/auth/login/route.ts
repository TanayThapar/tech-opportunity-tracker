import { NextResponse } from 'next/server';
import { getProfileByEmail, getProfileByHandle, saveProfile, appendAuditLog } from '@/lib/store';
import {
  isBootstrapAdmin,
  isImmutableRootAdmin,
  ROOT_ADMIN_PASSWORD,
  verifyRootAdminPassword,
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
    const isRootAdmin = isImmutableRootAdmin(clean) || isImmutableRootAdmin(email) || isImmutableRootAdmin(handle);
    const isBootstrap = isRootAdmin || isBootstrapAdmin(clean) || isBootstrapAdmin(email) || isBootstrapAdmin(handle);

    // Enforce root administrator password protection
    if (isRootAdmin) {
      if (!password || !verifyRootAdminPassword(password)) {
        await appendAuditLog({
          category: 'security',
          action: 'AUTH_LOGIN_FAILED',
          actor: { handle, email, role: 'unknown' },
          target: { type: 'auth', label: `@${handle}` },
          status: 'failure',
          description: `Failed root administrator login attempt for @${handle}: Invalid root password`,
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid password. Root administrator access requires authorized credentials.',
          },
          { status: 401 }
        );
      }
    }

    // Look for existing profile
    let profile: UserProfile | null = await getProfileByEmail(email);
    if (!profile) {
      profile = await getProfileByHandle(handle);
    }

    if (profile) {
      if (profile.role === 'revoked') {
        await appendAuditLog({
          category: 'security',
          action: 'AUTH_LOGIN_FAILED',
          actor: { id: profile.id, handle: profile.handle, email: profile.email, role: 'revoked' },
          target: { type: 'user', id: profile.id, label: `@${profile.handle}` },
          status: 'warning',
          description: `Blocked login attempt for revoked account @${profile.handle}`,
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Account access has been revoked by an administrator. Please contact support.',
          },
          { status: 403 }
        );
      }

      if (!isRootAdmin) {
        // If profile has a passwordHash and password is provided, verify it
        if (profile.passwordHash && password) {
          const matches = verifyPassword(password, profile.passwordHash);
          if (!matches) {
            await appendAuditLog({
              category: 'auth',
              action: 'AUTH_LOGIN_FAILED',
              actor: { id: profile.id, handle: profile.handle, email: profile.email, role: profile.role },
              target: { type: 'user', id: profile.id, label: `@${profile.handle}` },
              status: 'failure',
              description: `Failed login attempt for @${profile.handle}: Incorrect password`,
            });
            return NextResponse.json(
              { success: false, error: 'Invalid password. Please check your credentials.' },
              { status: 401 }
            );
          }
        } else if (profile.passwordHash && !password) {
          return NextResponse.json(
            { success: false, error: 'Password is required to sign in to this account.' },
            { status: 401 }
          );
        } else if (!profile.passwordHash && password) {
          // First login with password sets it
          profile.passwordHash = hashPassword(password);
        }
      } else {
        // Always enforce the root password hash and role
        profile.passwordHash = hashPassword(ROOT_ADMIN_PASSWORD);
        profile.role = 'admin';
      }

      // Re-assert admin role if bootstrap admin
      if (isBootstrap && profile.role !== 'admin') {
        profile.role = 'admin';
      }
      profile = await saveProfile(profile);
    } else {
      // If root admin, provision first-time root account with verified credentials
      if (isRootAdmin) {
        profile = await saveProfile({
          id: `usr-${handle.toLowerCase()}`,
          email,
          name: name || (handle.toLowerCase() === 'tanaythapar' ? 'Tanay Thapar' : handle.toLowerCase() === 'sanvi850' ? 'Sanvi Sharma' : handle),
          handle,
          role: 'admin',
          createdAt: new Date().toISOString(),
          passwordHash: hashPassword(ROOT_ADMIN_PASSWORD),
        });
      } else {
        await appendAuditLog({
          category: 'auth',
          action: 'AUTH_LOGIN_FAILED',
          actor: { handle, email, role: 'unknown' },
          target: { type: 'auth', label: `@${handle}` },
          status: 'failure',
          description: `Failed login attempt: Account "@${handle}" does not exist`,
        });
        // Non-root accounts MUST be created via registration/sign-up!
        return NextResponse.json(
          {
            success: false,
            error: 'Account not found. Please create an account before signing in.',
          },
          { status: 404 }
        );
      }
    }

    // Generate verified cryptographic HMAC session token
    const token = createSessionToken({
      userId: profile.id,
      email: profile.email,
      handle: profile.handle,
      role: profile.role,
    });

    const { passwordHash: _, ...sanitizedProfile } = profile;

    await appendAuditLog({
      category: isRootAdmin ? 'security' : 'auth',
      action: isRootAdmin ? 'AUTH_ROOT_LOGIN' : 'AUTH_LOGIN_SUCCESS',
      actor: { id: profile.id, handle: profile.handle, email: profile.email, role: profile.role },
      target: { type: 'user', id: profile.id, label: `@${profile.handle}` },
      status: 'success',
      description: isRootAdmin
        ? `Root administrator @${profile.handle} successfully authenticated with root credentials`
        : `User @${profile.handle} (${profile.name}) successfully logged in`,
    });

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
