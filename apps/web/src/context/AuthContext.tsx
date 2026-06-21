'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AuthUser,
  clearSession,
  getStoredToken,
  getStoredUser,
  storeSession,
} from '@/lib/auth';
import { apiFetch } from '@/lib/api';

type LoginResponse = {
  user: AuthUser;
  accessToken: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const publicPaths = ['/login', '/portal', '/support', '/register'];

  const loginWithToken = useCallback((accessToken: string, authUser: AuthUser) => {
    storeSession(accessToken, authUser);
    setUser(authUser);
    router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    if (isLoading) return;
    const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (!user && !isPublic) {
      router.replace('/login');
    }
    if (user && pathname === '/login') {
      router.replace('/dashboard');
    }
  }, [isLoading, user, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    storeSession(data.accessToken, data.user);
    setUser(data.user);
    router.replace('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    router.replace('/login');
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      loginWithToken,
      logout,
    }),
    [user, isLoading, login, loginWithToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}