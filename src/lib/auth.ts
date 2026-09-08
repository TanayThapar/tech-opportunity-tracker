'use client';

import { UserProfile, UserRole } from '@/types/auth';

const AUTH_STORAGE_KEY = 'techradar_auth_session_v1';
const USERS_DB_KEY = 'techradar_registered_users_v1';

// Seed admin account
const DEFAULT_ADMIN: UserProfile = {
  id: 'usr-admin-1',
  email: 'tanay@techradar.dev',
  name: 'Tanay Thapar',
  handle: 'tanay',
  role: 'admin',
  createdAt: '2026-09-01T00:00:00Z',
};

function getRegisteredUsers(): UserProfile[] {
  if (typeof window === 'undefined') return [DEFAULT_ADMIN];
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (!raw) {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify([DEFAULT_ADMIN]));
      return [DEFAULT_ADMIN];
    }
    return JSON.parse(raw);
  } catch {
    return [DEFAULT_ADMIN];
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

export function login(email: string, roleRequested?: UserRole): { success: boolean; user?: UserProfile; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'Email cannot be empty' };

  const users = getRegisteredUsers();
  let user = users.find(u => u.email.toLowerCase() === cleanEmail);

  // If signing in with the designated owner address or requesting admin explicitly
  const isAdmin = cleanEmail.includes('tanay') || cleanEmail.includes('admin') || roleRequested === 'admin';

  if (!user) {
    // Auto-create profile for seamless login/signup
    user = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      handle: cleanEmail.split('@')[0],
      role: isAdmin ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    }
  } else if (isAdmin && user.role !== 'admin') {
    user.role = 'admin';
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('techradar_auth_change'));
  }

  return { success: true, user };
}

export function signup(name: string, email: string, handle: string): { success: boolean; user?: UserProfile; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'Email is required' };
  if (!name.trim()) return { success: false, error: 'Name is required' };

  const users = getRegisteredUsers();
  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return login(cleanEmail);
  }

  const isAdmin = cleanEmail.includes('tanay') || cleanEmail.includes('admin');
  const newUser: UserProfile = {
    id: `usr-${Date.now()}`,
    email: cleanEmail,
    name: name.trim(),
    handle: handle.trim() || cleanEmail.split('@')[0],
    role: isAdmin ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  if (typeof window !== 'undefined') {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    window.dispatchEvent(new Event('techradar_auth_change'));
  }

  return { success: true, user: newUser };
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event('techradar_auth_change'));
  }
}
