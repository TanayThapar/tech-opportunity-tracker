'use client';

import { UserProfile, UserRole } from '@/types/auth';

const AUTH_STORAGE_KEY = 'techradar_auth_session_v2';
const USERS_DB_KEY = 'techradar_registered_users_v2';

export const ADMIN_HANDLES = ['tanaythapar', 'sanvi850', 'panchadip125'];

/**
 * Checks whether an identifier belongs to a whitelisted administrator.
 */
export function isAdminIdentifier(identifier?: string | null): boolean {
  if (!identifier) return false;
  const clean = identifier.toLowerCase().trim().replace(/^@/, '');
  return ADMIN_HANDLES.some(
    h =>
      clean === h ||
      clean === `${h}@example.com` ||
      clean === `${h}@radar.internal` ||
      clean === `${h}@demo.radar` ||
      clean === 'tanay.ggmu@gmail.com' ||
      clean.startsWith(h)
  );
}

/**
 * Checks whether Demo / Alpha Testing Mode is enabled.
 * Default enabled for Alpha testing so testers and admins can use the app without requiring Supabase.
 * Disabled only when explicitly set to NEXT_PUBLIC_DEMO_MODE=false.
 */
export function isDemoMode(): boolean {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'false') {
    return false;
  }
  return true;
}

export function getCurrentUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Logs in user locally for Demo / Alpha Testing.
 * Testers receive role 'user' (separated from admin tools).
 * Administrators (@TanayThapar) receive role 'admin'.
 */
export function login(identifier: string): { success: boolean; user?: UserProfile; error?: string } {
  const clean = identifier.trim();
  if (!clean) return { success: false, error: 'Username or Email cannot be empty' };

  const lowerClean = clean.toLowerCase().replace(/^@/, '');
  const isAdmin = isAdminIdentifier(clean);
  const email = clean.includes('@') ? clean.toLowerCase() : `${lowerClean}@demo.radar`;

  const user: UserProfile = {
    id: `usr-${isAdmin ? 'admin' : 'tester'}-${lowerClean}`,
    email,
    name: clean.replace(/^@/, ''),
    handle: lowerClean,
    role: isAdmin ? 'admin' : 'user', // Testers get 'user', Admins get 'admin'
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('techradar_auth_change'));
  }

  return { success: true, user };
}

/**
 * Logs in user via server endpoint /api/auth/login or falls back gracefully in demo mode.
 */
export async function loginWithServer(
  identifier: string,
  name?: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const clean = identifier.trim();
  if (!clean) return { success: false, error: 'Username or Email cannot be empty' };

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: clean, name }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
          window.dispatchEvent(new Event('techradar_auth_change'));
        }
        return { success: true, user: data.user };
      }
    }
  } catch {
    // If server is unreachable or offline, fallback to local demo auth
  }

  return login(clean);
}

/**
 * Re-validates current session against server RBAC.
 */
export async function fetchCurrentUser(): Promise<UserProfile | null> {
  if (typeof window === 'undefined') return null;
  const cached = getCurrentUser();
  if (!cached) return null;

  try {
    const headers: Record<string, string> = {};
    if (cached.id) headers['x-user-id'] = cached.id;
    if (cached.email) headers['x-user-email'] = cached.email;
    if (cached.handle) headers['x-user-handle'] = cached.handle;

    const res = await fetch('/api/auth/me', { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        return data.user;
      }
    }
  } catch (err) {
    console.warn('Failed to verify session with server:', err);
  }
  return cached;
}

export function signup(name: string, identifier: string): { success: boolean; user?: UserProfile; error?: string } {
  return login(identifier);
}

export async function signupWithServer(
  name: string,
  identifier: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  return loginWithServer(identifier, name);
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event('techradar_auth_change'));
  }
}
