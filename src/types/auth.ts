export type UserRole = 'user' | 'moderator' | 'admin' | 'revoked';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  handle: string;
  role: UserRole;
  createdAt: string;
  passwordHash?: string;
  emailVerified?: boolean;
}

export interface EmailOtpRecord {
  email: string;
  handle: string;
  name: string;
  passwordHash: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
}
