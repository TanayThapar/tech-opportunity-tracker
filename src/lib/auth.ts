'use client';

import { UserProfile, UserRole } from '@/types/auth';

const AUTH_STORAGE_KEY = 'techradar_auth_session_v1';
const USERS_DB_KEY = 'techradar_registered_users_v1';

// Strict Admin Whitelist: TanayThapar and Sanvi850
export const ADMIN_WHITELIST: string[] = ['tanaythapar', 'sanvi850'];

export function isWhitelistedAdmin(identifier: string): boolean {
  if (!identifier) return false;
  const clean = identifier.trim().toLowerCase().replace('@', '');
  return ADMIN_WHITELIST.some(allowed => clean === allowed.toLowerCase());
}

// Initial registered admins
const SEED_USERS: UserProfile[] = [
  {
    id: 'usr-admin-tanay',
    email: 'tanaythapar@gmail.com',
    name: 'Tanay Thapar',
    handle: 'TanayThapar',
    role: 'admin',
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'usr-admin-sanvi',
    email: 'sanvi850@gmail.com',
    name: 'Sanvi',
    handle: 'Sanvi850',
    role: 'admin',
    createdAt: '2026-09-01T00:00:00Z',
  },
];

function getRegisteredUsers(): UserProfile[] {
  if (typeof window === 'undefined') return SEED_USERS;
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (!raw) {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_USERS;
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

export function login(identifier: string): { success: boolean; user?: UserProfile; error?: string } {
  const clean = identifier.trim();
  if (!clean) return { success: false, error: 'Username, Handle, or Email cannot be empty' };

  const users = getRegisteredUsers();
  const lowerClean = clean.toLowerCase().replace('@', '');

  // Check if identifier matches handle or email
  let user = users.find(
    u => u.handle.toLowerCase() === lowerClean || u.email.toLowerCase() === lowerClean
  );

  const isAdmin = isWhitelistedAdmin(clean) || (user && isWhitelistedAdmin(user.handle));

  if (!user) {
    // Register on the fly
    user = {
      id: `usr-${Date.now()}`,
      email: clean.includes('@') ? clean.toLowerCase() : `${lowerClean}@user.radar`,
      name: clean,
      handle: clean.replace('@', ''),
      role: isAdmin ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    }
  } else {
    // Ensure whitelisted users always have role='admin'
    if (isAdmin) {
      user.role = 'admin';
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('techradar_auth_change'));
  }

  return { success: true, user };
}

export function signup(name: string, identifier: string): { success: boolean; user?: UserProfile; error?: string } {
  const clean = identifier.trim();
  if (!clean) return { success: false, error: 'Username or Email is required' };
  if (!name.trim()) return { success: false, error: 'Name is required' };

  const users = getRegisteredUsers();
  const lowerClean = clean.toLowerCase().replace('@', '');

  const existing = users.find(
    u => u.handle.toLowerCase() === lowerClean || u.email.toLowerCase() === lowerClean
  );
  if (existing) {
    return login(clean);
  }

  const isAdmin = isWhitelistedAdmin(clean);

  const newUser: UserProfile = {
    id: `usr-${Date.now()}`,
    email: clean.includes('@') ? clean.toLowerCase() : `${lowerClean}@user.radar`,
    name: name.trim(),
    handle: clean.replace('@', ''),
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
