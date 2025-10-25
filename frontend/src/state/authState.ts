import { makeAtom, useAtom } from '../utils/atom';
import { config } from '../config';

export interface User {
  id: number;
  email: string;
  name: string;
  permissions?: string[];
  blocked?: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

// Create global auth state atom
export const authStateAtom = makeAtom<AuthState, Record<string, never>>(
  { user: null, loading: true },
  {},
  'authState'
);

// Auth API functions
export async function checkAuth(): Promise<void> {
  try {
    const response = await fetch(`${config.basePath}api/auth.php/current-user`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Not logged in');
    }

    const data = await response.json();
    authStateAtom.set({ user: data.user, loading: false }, false);
    console.log('Logged in as:', data.user);
  } catch (error) {
    authStateAtom.set({ user: null, loading: false }, false);
    console.log('Not logged in:', error);
  }
}

export async function login(email: string, password: string): Promise<void> {
  try {
    const response = await fetch(`${config.basePath}api/auth.php/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      authStateAtom.set({ user: null, loading: false }, false);
      throw new Error(errorData.error || 'Login failed');
    }

    const data = await response.json();
    authStateAtom.set({ user: data.user, loading: false }, false);
    console.log('Logged in as:', data.user);
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    const response = await fetch(`${config.basePath}api/auth.php/logout`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    authStateAtom.set({ user: null, loading: false }, false);
    console.log('Logged out');
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

// Hook to use auth state in components
export function useAuthState() {
  return useAtom(authStateAtom);
}
