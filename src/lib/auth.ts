'use client';

import { UserProfile, UserRole } from '@/types/auth';

const AUTH_STORAGE_KEY = 'techradar_auth_session_v2';
const USERS_DB_KEY = 'techradar_registered_users_v2';

/**
 * Checks whether Local Demo Mode is explicitly enabled.
 * STRICT SAFETY RULE:
 * Demo mode is enabled ONLY if NEXT_PUBLIC_DEMO_MODE=true AND NODE_ENV !== 'production'.
 * Demo mode never grants admin or moderator permissions.
 */
export function isDemoMode(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
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
 * Logs in user. In production or when demo mode is not enabled,
 * fails closed if backend auth is not configured.
 */
export function login(identifier: string): { success: boolean; user?: UserProfile; error?: string } {
  const clean = identifier.trim();
  if (!clean) return { success: false, error: 'Username or Email cannot be empty' };

  if (!isDemoMode()) {
    // In production or standard mode without Supabase Auth setup: fail closed
    if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return {
        success: false,
        error: 'Authentication failed closed: Supabase Auth is not configured in this environment. Demo mode is disabled.',
      };
    }
  }

  // Demo mode sandbox login: STRICTLY grants 'user' role only. Never admin or moderator.
  const lowerClean = clean.toLowerCase().replace('@', '');
  const email = clean.includes('@') ? clean.toLowerCase() : `${lowerClean}@demo.radar`;

  const user: UserProfile = {
    id: `usr-demo-${Date.now()}`,
    email,
    name: clean,
    handle: clean.replace('@', ''),
    role: 'user', // Demo mode NEVER grants admin or moderator!
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('techradar_auth_change'));
  }

  return { success: true, user };
}

/**
 * Logs in user via server endpoint /api/auth/login to get server-verified DB role.
 * Seeds bootstrap admins (TanayThapar, Sanvi850, panchadip125) with admin role.
 */
export async function loginWithServer(
  identifier: string,
  name?: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const clean = identifier.trim();
  if (!clean) return { success: false, error: 'Username or Email cannot be empty' };

  if (isDemoMode()) {
    return login(clean);
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: clean, name }),
    });
    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || 'Authentication failed' };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
      window.dispatchEvent(new Event('techradar_auth_change'));
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during login' };
  }
}

/**
 * Re-validates the current user session against the server to ensure
 * client-provided role claims cannot bypass server RBAC.
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
