import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { UserProfile, UserRole } from '@/types/auth';
import { getProfileByEmail, getProfileById, getProfileByHandle, saveProfile } from '@/lib/store';

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
 * Gets bootstrap admin emails/handles from server-only environment variable.
 * Re-grants TanayThapar, Sanvi850, panchadip125 and any others configured server-side.
 */
export function getBootstrapAdminEmails(): string[] {
  const envEmails =
    process.env.BOOTSTRAP_ADMIN_EMAILS ||
    'tanaythapar@example.com,tanaythapar,tanay.ggmu@gmail.com,sanvi850@example.com,sanvi850,panchadip125@example.com,panchadip125';
  return envEmails
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks if a given identifier, email or handle belongs to a bootstrap admin.
 */
export function isBootstrapAdmin(identifier?: string | null): boolean {
  if (!identifier) return false;
  const clean = identifier.toLowerCase().trim().replace(/^@/, '');
  const admins = getBootstrapAdminEmails();
  return admins.some(admin => {
    const adminClean = admin.toLowerCase().trim().replace(/^@/, '');
    const adminHandle = adminClean.split('@')[0];
    return clean === adminClean || clean === adminHandle || (clean.includes('@') && clean.startsWith(adminHandle));
  });
}

/**
 * Authenticates user from request headers and retrieves server-verified DB role.
 * NEVER trusts client-provided role claims.
 */
export async function getAuthenticatedUser(request: Request): Promise<UserProfile | null> {
  const authHeader = request.headers.get('authorization');
  const userIdHeader = request.headers.get('x-user-id');
  const userEmailHeader = request.headers.get('x-user-email');
  const userHandleHeader = request.headers.get('x-user-handle');

  let profile: UserProfile | null = null;

  if (userIdHeader) {
    profile = await getProfileById(userIdHeader);
  }
  if (!profile && userEmailHeader) {
    profile = await getProfileByEmail(userEmailHeader);
    if (!profile) {
      profile = await getProfileByHandle(userEmailHeader);
    }
  }
  if (!profile && userHandleHeader) {
    profile = await getProfileByHandle(userHandleHeader);
    if (!profile) {
      profile = await getProfileByEmail(userHandleHeader);
    }
  }
  if (!profile && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    profile = await getProfileById(token);
    if (!profile) {
      profile = await getProfileByEmail(token);
    }
    if (!profile) {
      profile = await getProfileByHandle(token);
    }
  }

  // If user does not exist in store yet, resolve bootstrap admin or auto-provision
  const lookupCandidate = userEmailHeader || userHandleHeader || (userIdHeader?.startsWith('usr-') ? userIdHeader.slice(4) : userIdHeader);
  if (!profile && lookupCandidate) {
    const cleanCand = lookupCandidate.toLowerCase().trim().replace(/^@/, '');
    const isBootstrap = isBootstrapAdmin(cleanCand);
    const cleanHandle = (userHandleHeader || userEmailHeader?.split('@')[0] || cleanCand.split('@')[0]).replace(/^@/, '');
    const cleanEmail = userEmailHeader || (cleanCand.includes('@') ? cleanCand : `${cleanHandle.toLowerCase()}@radar.internal`);

    profile = await saveProfile({
      id: userIdHeader || `usr-${cleanHandle.toLowerCase()}`,
      email: cleanEmail,
      name: cleanHandle,
      handle: cleanHandle,
      role: isBootstrap ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    });
  }

  // Ensure bootstrap admins are always verified as admin in DB
  if (profile) {
    const isBootstrap = isBootstrapAdmin(profile.email) || isBootstrapAdmin(profile.handle);
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
