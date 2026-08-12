import React, { createContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

export type UserRole = 'Admin' | 'PropertyManager' | 'Tenant';

export interface User { id: string; email: string; firstName: string; lastName: string; roles: string[]; }
interface AuthContextType { user: User | null; token: string | null; login: (data: any) => void; logout: () => void; loading: boolean; }

export const AuthContext = createContext<AuthContextType>({
  user: null, token: null, login: () => {}, logout: () => {}, loading: true,
});

export const ROLES = {
  Admin: 'Admin' as const,
  PropertyManager: 'PropertyManager' as const,
  Tenant: 'Tenant' as const,
} satisfies Record<string, UserRole>;

export const isStaff = (user: User | null): boolean =>
  !!user?.roles?.some(r => r === 'Admin' || r === 'PropertyManager');

export const isTenant = (user: User | null): boolean =>
  !!user?.roles?.some(r => r === 'Tenant');

export const useRoles = () => {
  const { user } = React.useContext(AuthContext);
  const roles: UserRole[] = (user?.roles ?? []) as UserRole[];
  return {
    user,
    roles,
    isStaff: isStaff(user),
    isTenant: isTenant(user),
    isAdmin: roles.includes('Admin'),
    isPropertyManager: roles.includes('PropertyManager'),
    hasRole: (r: UserRole) => roles.includes(r),
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      axios.get('/api/auth/me').then(res => {
        setUser(res.data);
        setToken(storedToken);
      }).catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete axios.defaults.headers.common['Authorization'];
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (data: any) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    setUser(data.user);
    setToken(data.accessToken);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) await axios.post('/api/auth/logout', { refreshToken });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
  };

  return <AuthContext.Provider value={{ user, token, login, logout, loading }}>{children}</AuthContext.Provider>;
};