import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, request, setToken } from '@/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return undefined;
    request('GET', '/api/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const startSession = useCallback(({ token, user: u }) => {
    setToken(token);
    setUser(u);
    return u;
  }, []);

  /** Signs in. Returns the person, or a next step: { setup, setupToken, name } (first time: choose a password) / { needsPassword, name }. */
  const login = useCallback(async (email, password) => {
    const res = await request('POST', '/api/auth/login', { email, ...(password ? { password } : {}) });
    return res.token ? startSession(res) : res;
  }, [startSession]);
  /** First password (needs the setup token from login). Signs the person in. */
  const setPassword = useCallback(async (setupToken, password) => startSession(await request('POST', '/api/auth/set-password', { setupToken, password })), [startSession]);
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, setPassword, logout, setUser }), [user, loading, login, setPassword, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
