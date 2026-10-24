import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { UserProfile, UserRole } from '@/types/auth';
import { getProfileByEmail, getProfileById, saveProfile } from '@/lib/store';

/**
 * Constant-time comparison to prevent timing attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verifies CRON_SECRET with mandatory requirement (fails closed if unset).
 */
export function verifyCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim().length === 0) {
    // Fail closed: never allow cron trigger if secret is unset
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7).trim();
  return timingSafeCompare(token, secret);
}

/**
 * Gets bootstrap admin emails from server-only environment variable.
 * Re-grants TanayThapar, Sanvi850, panchadip125 and any others configured server-side.
 */
export function getBootstrapAdminEmails(): string[] {
  const envEmails = process.env.BOOTSTRAP_ADMIN_EMAILS || 'tanaythapar@example.com,sanvi850@example.com,panchadip125@example.com';
  return envEmails
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Authenticates user from request headers and retrieves server-verified DB role.
 * NEVER trusts client-provided role claims.
 */
export async function getAuthenticatedUser(request: Request): Promise<UserProfile | null> {
  const authHeader = request.headers.get('authorization');
  const userIdHeader = request.headers.get('x-user-id');
  const userEmailHeader = request.headers.get('x-user-email');

  let profile: UserProfile | null = null;

  if (userIdHeader) {
    profile = await getProfileById(userIdHeader);
  } else if (userEmailHeader) {
    profile = await getProfileByEmail(userEmailHeader);
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    // In production with Supabase JWT: supabase.auth.getUser(token)
    // Here we also check if token is a direct user id
    profile = await getProfileById(token);
    if (!profile) {
      profile = await getProfileByEmail(token);
    }
  }

  if (!profile && userEmailHeader) {
    // Check if user is in bootstrap admin list on first setup
    const cleanEmail = userEmailHeader.toLowerCase().trim();
    const isBootstrap = getBootstrapAdminEmails().some(
      b => cleanEmail === b || cleanEmail.startsWith(b.split('@')[0])
    );

    profile = await saveProfile({
      id: userIdHeader || `usr-${Date.now()}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      handle: cleanEmail.split('@')[0],
      role: isBootstrap ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    });
  }

  // Ensure bootstrap admins are always verified as admin in DB
  if (profile) {
    const isBootstrap = getBootstrapAdminEmails().some(
      b => profile!.email.toLowerCase() === b || profile!.handle.toLowerCase() === b.split('@')[0]
    );
    if (isBootstrap && profile.role !== 'admin') {
      profile.role = 'admin';
      await saveProfile(profile);
    }
  }

  return profile;
}

/**
 * Enforces role-based authorization on route handlers.
 */
export async function requireRole(
  request: Request,
  allowedRoles: UserRole[]
): Promise<{ user: UserProfile | null; errorResponse: NextResponse | null }> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: `Forbidden: Requires one of roles [${allowedRoles.join(', ')}], user has role "${user.role}"`,
        },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}
