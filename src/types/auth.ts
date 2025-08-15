export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
}

// Minimal session shape to avoid any
export interface SessionLike {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // epoch seconds
  user: User;
}

export interface AuthState {
  user: User | null;
  session: SessionLike | null;
  loading: boolean;
}