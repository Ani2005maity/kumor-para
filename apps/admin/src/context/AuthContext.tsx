import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer' | 'seller';
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<AdminUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async (): Promise<AdminUser | null> => {
    try {
      const res = await api.get<{ user: AdminUser }>('/auth/me');
      if (res && res.user && res.user.role === 'admin') {
        setUser(res.user);
        return res.user;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = async (email: string, password: string): Promise<AdminUser> => {
    const res = await api.post<{ user: AdminUser }>('/auth/login', { email, password });
    if (!res || !res.user) {
      throw new Error('Invalid login response from server');
    }
    if (res.user.role !== 'admin') {
      throw new Error('Access denied: You do not have administrator privileges.');
    }
    setUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
