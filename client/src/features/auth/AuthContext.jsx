import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [state, setState] = useState({ loading: true, user: null });

  useEffect(() => {
    authApi.me().then((r) => setState({ loading: false, user: r.data })).catch(() => setState({ loading: false, user: null }));
    const onUnauth = () => setState({ loading: false, user: null });
    window.addEventListener('auth:unauthorized', onUnauth);
    return () => window.removeEventListener('auth:unauthorized', onUnauth);
  }, []);

  const login = useCallback(async (body) => { const r = await authApi.login(body); qc.clear(); setState({ loading: false, user: r.data }); }, [qc]);
  const logout = useCallback(async () => { await authApi.logout().catch(() => {}); qc.clear(); setState({ loading: false, user: null }); }, [qc]);

  // UI hints only. The server enforces every permission on every request.
  const value = useMemo(() => ({ ...state, login, logout, role: state.user?.role, canApprove: ['MANAGER', 'HOD'].includes(state.user?.role) }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
