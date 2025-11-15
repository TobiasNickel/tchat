import { makeAtom, useAtom } from '../utils/atom';
import { authSdk, type User } from '../sdk/auth.sdk';
import { HttpError } from '../sdk/http';

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
    const data = await authSdk.getCurrentUser();
    authStateAtom.set({ user: data.user, loading: false }, false);
    console.log('Logged in as:', data.user);
  } catch (error) {
    authStateAtom.set({ user: null, loading: false }, false);
    console.log('Not logged in:', error);
  }
}

export async function login(email: string, password: string): Promise<void> {
  try {
    const data = await authSdk.login({ email, password });
    authStateAtom.set({ user: data.user, loading: false }, false);
    console.log('Logged in as:', data.user);
  } catch (error) {
    authStateAtom.set({ user: null, loading: false }, false);
    if (error instanceof HttpError) {
      throw new Error(error.body.error || 'Login failed');
    }
    console.error('Login error:', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await authSdk.logout();
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
