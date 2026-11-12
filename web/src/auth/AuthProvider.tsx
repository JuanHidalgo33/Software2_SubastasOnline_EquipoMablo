import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';
import { AuthContext, type AuthContextValue } from './AuthContext';
import { clearSession, loadSession, saveSession, type Session } from './session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const stored = loadSession();
    setAuthToken(stored?.token ?? null);
    return stored;
  });

  const logout = useCallback(() => {
    clearSession();
    setAuthToken(null);
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login({ email, password });
    const newSession = { token, user };
    saveSession(newSession);
    setAuthToken(token);
    setSession(newSession);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await authApi.registerUser({ name, email, password });
      await login(email, password);
    },
    [login],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, token: session?.token ?? null, login, register, logout }),    [session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}