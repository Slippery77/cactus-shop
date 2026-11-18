import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, ApiError } from '../../lib/api';

const KEY = 'cactus-admin';
const AdminAuthContext = createContext(null);

function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s && new Date(s.expiresAt) > new Date() ? s : null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);

  const login = useCallback(async (password) => {
    const s = await api('/admin/login', { method: 'POST', body: { password } });
    localStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setSession(null);
  }, []);

  /** เรียก API ของ admin พร้อม token ถ้า token หมดอายุ (401) ให้ออกจากระบบ */
  const adminApi = useCallback(
    async (path, opts = {}) => {
      try {
        return await api(`/admin${path}`, { ...opts, token: session?.token });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) logout();
        throw err;
      }
    },
    [session, logout],
  );

  const value = useMemo(() => ({ token: session?.token, login, logout, adminApi }), [session, login, logout, adminApi]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export const useAdminAuth = () => useContext(AdminAuthContext);
