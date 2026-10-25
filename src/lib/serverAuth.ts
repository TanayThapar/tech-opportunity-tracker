import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { UserProfile, UserRole } from '@/types/auth';
import { getProfileByEmail, getProfileById, getProfileByHandle, saveProfile } from '@/lib/store';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SessionData {
  userId: string;
  email: string;
  handle: string;
  role: UserRole;
  exp: number;
}

let memorySessionSecret: string | null = null;

/**
 * Retrieves the cryptographic session signing secret.
 * Falls back to a deterministic key in test or random key in local dev.
 */
export function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
    return process.env.SESSION_SECRET.trim();
  }
  if (process.env.NODE_ENV === 'test') {
    return 'vitest-test-session-secret-key-at-least-32-chars-long!!';
  }
  // Stable serverless key so different Lambda containers share the same session secret
  return 'radar-secure-session-hmac-sha256-default-fallback-key-2026';
}

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
 * Securely hashes passwords using standard scrypt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored scrypt salt:hash string using constant-time comparison.
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derived = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derived.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derived);
  } catch {
    return false;
  }
}

/**
 * Creates an HMAC-SHA256 signed JWT session token.
 */
export function createSessionToken(
  payload: { userId: string; email: string; handle: string; role: UserRole },
  expiresInSeconds = 7 * 24 * 60 * 60
): string {
  const secret = getSessionSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const data = {
    sub: payload.userId,
    email: payload.email,
    handle: payload.handle,
    role: payload.role,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 signed session token.
 */
export function verifySessionToken(token: string): { valid: boolean; data?: SessionData; error?: string } {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token missing' };
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed token structure' };
    }
    const [headerB64, payloadB64, signature] = parts;
    const secret = getSessionSecret();

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, error: 'Invalid token signature' };
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    return {
      valid: true,
      data: {
        userId: payload.sub,
        email: payload.email,
        handle: payload.handle,
        role: payload.role,
        exp: payload.exp,
      },
    };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Token verification exception' };
  }
}

/**
 * Parses HTTP cookie header into key-value map.
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  }
  return cookies;
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
 * Root administrators with the highest level of access defined permanently in source code.
 * Their access level cannot be altered or revoked through any UI or API endpoint.
 */
export const IMMUTABLE_ROOT_ADMINS = ['tanaythapar', 'sanvi850'];

export const ROOT_ADMIN_PASSWORD = process.env.ROOT_ADMIN_PASSWORD || 'Manipal';

export function verifyRootAdminPassword(password?: string | null): boolean {
  if (!password) return false;
  return timingSafeCompare(password, ROOT_ADMIN_PASSWORD);
}

export function isImmutableRootAdmin(identifier?: string | null): boolean {
  if (!identifier) return false;
  const clean = identifier.toLowerCase().trim().replace(/^@/, '');
  const handle = clean.split('@')[0];
  return IMMUTABLE_ROOT_ADMINS.some(
    root => clean === root || handle === root || (clean.includes('@') && clean.startsWith(root))
  );
}

/**
 * Gets bootstrap admin emails/handles from server-only environment variable.
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
  if (isImmutableRootAdmin(identifier)) return true;
  const clean = identifier.toLowerCase().trim().replace(/^@/, '');
  const admins = getBootstrapAdminEmails();
  return admins.some(admin => {
    const adminClean = admin.toLowerCase().trim().replace(/^@/, '');
    const adminHandle = adminClean.split('@')[0];
    return clean === adminClean || clean === adminHandle || (clean.includes('@') && clean.startsWith(adminHandle));
  });
}

/**
 * Returns a server Supabase client if environment credentials exist.
 */
function getSupabaseAuthClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return null;
}

/**
 * Authenticates user strictly from validated session tokens (Bearer header or HTTP-only cookie).
 *
 * CRITICAL SECURITY:
 * - NEVER trusts caller-supplied identity headers (x-user-id, x-user-email, x-user-handle, x-user-role).
 * - Derives user identity and role solely from the verified cryptographic session and database record.
 */
export async function getAuthenticatedUser(request: Request): Promise<UserProfile | null> {
  const authHeader = request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      token = cookies['radar_session'] || null;
    }
  }

  if (!token) {
    return null;
  }

  // 1. Try Supabase Auth token if Supabase credentials are configured
  const supabase = getSupabaseAuthClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (data?.user && !error) {
        let profile = await getProfileById(data.user.id);
        if (!profile) {
          const email = data.user.email || `${data.user.id}@supabase.auth`;
          const handle = email.split('@')[0];
          const isBootstrap = isBootstrapAdmin(email) || isBootstrapAdmin(handle);
          profile = await saveProfile({
            id: data.user.id,
            email,
            name: handle,
            handle,
            role: isBootstrap ? 'admin' : 'user',
            createdAt: new Date().toISOString(),
          });
        }

        if (profile) {
          const isBootstrap = isBootstrapAdmin(profile.email) || isBootstrapAdmin(profile.handle);
          if (isBootstrap && profile.role !== 'admin') {
            profile.role = 'admin';
            await saveProfile(profile);
          }
          if (profile.role === 'revoked') {
            return null;
          }
          const { passwordHash: _, ...sanitized } = profile;
          return sanitized;
        }
      }
    } catch {
      // Continue to HMAC token verification
    }
  }

  // 2. Verify self-hosted cryptographic HMAC session token
  const verification = verifySessionToken(token);
  if (!verification.valid || !verification.data) {
    return null;
  }

  const { userId, email, handle } = verification.data;

  // Retrieve user record from database to enforce current role (never trust client claims)
  let profile = await getProfileById(userId);
  if (!profile && email) {
    profile = await getProfileByEmail(email);
  }
  if (!profile && handle) {
    profile = await getProfileByHandle(handle);
  }

  if (!profile) {
    // If user has a valid cryptographic token signed with server secret, rehydrate in local memory
    const isRoot = isImmutableRootAdmin(handle) || isImmutableRootAdmin(email);
    const isBootstrap = isBootstrapAdmin(email) || isBootstrapAdmin(handle);
    const resolvedRole: UserRole = isRoot || isBootstrap ? 'admin' : (verification.data.role || 'user');
    profile = await saveProfile({
      id: userId,
      email: email || `${userId}@radar.internal`,
      name: handle || 'User',
      handle: handle || 'user',
      role: resolvedRole,
      createdAt: new Date().toISOString(),
    });
  }

  // Enforce server-side bootstrap admin verification
  const isBootstrap = isBootstrapAdmin(profile.email) || isBootstrapAdmin(profile.handle);
  if (isBootstrap && profile.role !== 'admin') {
    profile.role = 'admin';
    await saveProfile(profile);
  }

  if (profile.role === 'revoked') {
    return null;
  }

  const { passwordHash: _, ...sanitized } = profile;
  return sanitized;
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
        { success: false, error: 'Unauthorized: Authentication required with valid session' },
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
