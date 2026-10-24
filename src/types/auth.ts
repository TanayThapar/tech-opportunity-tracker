export type UserRole = 'user' | 'moderator' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  handle: string;
  role: UserRole;
  createdAt: string;
  passwordHash?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
}
