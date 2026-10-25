'use client';

import { UserProfile } from '@/types/auth';

const AUTH_STORAGE_KEY = 'techradar_auth_session_v3';
const AUTH_TOKEN_KEY = 'techradar_auth_token_v3';

/**
 * Checks whether Demo / Alpha Sandbox Mode is enabled.
 * STRICT SECURITY:
 * - NEVER active in production (fails closed).
 * - Only active in non-production environments when NEXT_PUBLIC_DEMO_MODE=true.
 */
export function isDemoMode(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
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
 * Returns authorization headers for server API requests.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * Logs in user via server endpoint /api/auth/login.
 * Returns verified UserProfile with cryptographic session token.
 */
export async function loginWithServer(
  identifier: string,
  password?: string,
  name?: string
): Promise<{ success: boolean; user?: UserProfile; token?: string; error?: string }> {
  const clean = identifier.trim();
  if (!clean) return { success: false, error: 'Username or Email cannot be empty' };

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: clean, password, name }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        }
        window.dispatchEvent(new Event('techradar_auth_change'));
      }
      return { success: true, user: data.user, token: data.token };
    }
    return { success: false, error: data.error || 'Authentication failed' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during sign in' };
  }
}

export interface SignupResponse {
  success: boolean;
  requireOtp?: boolean;
  email?: string;
  devOtp?: string;
  message?: string;
  user?: UserProfile;
  token?: string;
  error?: string;
}

/**
 * Registers a new account via /api/auth/signup. Dispatches an email OTP confirmation.
 */
export async function signupWithServer(
  name: string,
  identifier: string,
  password?: string,
  email?: string,
  handle?: string
): Promise<SignupResponse> {
  const cleanName = name.trim();
  const clean = identifier.trim();
  if (!clean && !email && !handle) return { success: false, error: 'Username or Email cannot be empty' };

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        identifier: clean || handle,
        email: email || (clean.includes('@') ? clean : undefined),
        handle: handle || (!clean.includes('@') ? clean : undefined),
        password,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        requireOtp: !!data.requireOtp,
        email: data.email,
        devOtp: data.devOtp,
        message: data.message,
        user: data.user,
        token: data.token,
      };
    }
    return { success: false, error: data.error || 'Registration failed' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during registration' };
  }
}

/**
 * Confirms email address using the 6-digit OTP code.
 */
export async function verifyOtpWithServer(
  email: string,
  otp: string
): Promise<{ success: boolean; user?: UserProfile; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        }
        window.dispatchEvent(new Event('techradar_auth_change'));
      }
      return { success: true, user: data.user, token: data.token };
    }
    return { success: false, error: data.error || 'Verification failed' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during verification' };
  }
}

/**
 * Requests a fresh 6-digit OTP code to the specified email.
 */
export async function resendOtpWithServer(
  email: string
): Promise<{ success: boolean; devOtp?: string; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, devOtp: data.devOtp, message: data.message };
    }
    return { success: false, error: data.error || 'Failed to resend code' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during resend' };
  }
}

/**
 * Signs out user locally and invalidates session cookie on server.
 */
export async function logoutWithServer(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
  } catch {
    // Continue local cleanup even if offline
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.dispatchEvent(new Event('techradar_auth_change'));
  }
}

/**
 * Re-validates current session against server RBAC.
 */
export async function fetchCurrentUser(): Promise<UserProfile | null> {
  if (typeof window === 'undefined') return null;

  try {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        return data.user;
      }
    } else if (res.status === 401) {
      // Session expired or invalid
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.dispatchEvent(new Event('techradar_auth_change'));
      return null;
    }
  } catch (err) {
    console.warn('Failed to verify session with server:', err);
  }
  return getCurrentUser();
}

/**
 * Legacy demo login helper maintained only for isolated unit tests.
 * Note: Does not bypass server RBAC.
 */
export function login(identifier: string): { success: boolean; user?: UserProfile; error?: string } {
  const clean = identifier.trim();
  if (!clean) return { success: false, error: 'Username or Email cannot be empty' };
  const lowerClean = clean.toLowerCase().replace(/^@/, '');
  const isTanay = lowerClean === 'tanaythapar';

  const user: UserProfile = {
    id: `usr-${isTanay ? 'admin' : 'user'}-${lowerClean}`,
    email: clean.includes('@') ? clean.toLowerCase() : `${lowerClean}@demo.radar`,
    name: clean.replace(/^@/, ''),
    handle: lowerClean,
    role: isTanay ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('techradar_auth_change'));
  }

  return { success: true, user };
}
