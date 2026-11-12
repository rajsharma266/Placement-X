import { useCallback, useEffect, useState } from 'react';
import * as authService from './authService';
import { AuthContext } from './authContext';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveSession = useCallback(({ user: nextUser, token }) => { localStorage.setItem('placementx_token', token); setUser(nextUser); }, []);
  const signIn = useCallback(async (credentials) => { const session = await authService.login(credentials); saveSession(session); return session.user; }, [saveSession]);
  const signUp = useCallback(async (details) => { const session = await authService.register(details); saveSession(session); return session.user; }, [saveSession]);
  const signOut = useCallback(async () => { try { await authService.logout(); } finally { localStorage.removeItem('placementx_token'); setUser(null); } }, []);

  useEffect(() => {
    const restoreSession = async () => {
      if (!localStorage.getItem('placementx_token')) { setIsLoading(false); return; }
      try { const { user: currentUser } = await authService.getCurrentUser(); setUser(currentUser); } catch { localStorage.removeItem('placementx_token'); } finally { setIsLoading(false); }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    const clearExpiredSession = () => setUser(null);
    window.addEventListener('placementx:unauthorized', clearExpiredSession);
    return () => window.removeEventListener('placementx:unauthorized', clearExpiredSession);
  }, []);

  const updateUser = useCallback((nextUser) => setUser(nextUser), []);
  return <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, updateUser }}>{children}</AuthContext.Provider>;
};
