'use client';

import { useEffect, useState, createContext, useContext, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SHOP_TYPE_CONFIG } from '@/lib/auth';
import { getDefaultPermissions } from '@/lib/permissions';

interface Shop {
  id: string;
  name: string;
  shopType: string;
  currency: string;
  currencySymbol: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface RolePermission {
  role: string;
  module: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

interface AuthContextType {
  user: User | null;
  shop: Shop | null;
  loading: boolean;
  login: (email: string, password: string, shopId?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (module: string, action: 'read' | 'write' | 'delete') => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  shop: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  hasPermission: () => true
});

function getLocalItem(key: string) {
  if (typeof window !== 'undefined') {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      try { localStorage.removeItem(key); } catch {}
      return null;
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getLocalItem('user'));
  const [shop, setShop] = useState<Shop | null>(() => getLocalItem('shop'));
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<RolePermission[]>(() => getLocalItem('permissions') || []);
  const permissionsLoaded = useRef(false);
  const router = useRouter();

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!shop?.id || permissionsLoaded.current) return;
    permissionsLoaded.current = true;

    fetch(`/api/permissions?role=${user?.role || ''}`, {
      headers: { 'x-shop-id': shop.id },
    })
      .then(res => res.json())
      .then(data => {
        if (data.permissions?.length > 0) {
          setPermissions(data.permissions);
          localStorage.setItem('permissions', JSON.stringify(data.permissions));
        }
      })
      .catch(() => {});
  }, [shop?.id, user?.role]);

  const hasPermission = (module: string, action: 'read' | 'write' | 'delete'): boolean => {
    if (!user) return false;
    if (user.role === 'OWNER') return true;

    const dynamicPerm = permissions.find(p => p.role === user.role && p.module === module);
    if (dynamicPerm) {
      if (action === 'read') return dynamicPerm.canRead;
      if (action === 'write') return dynamicPerm.canWrite;
      if (action === 'delete') return dynamicPerm.canDelete;
    }

    const defaults = getDefaultPermissions(user.role);
    const defaultPerm = defaults.find(p => p.module === module);
    if (defaultPerm) {
      if (action === 'read') return defaultPerm.canRead;
      if (action === 'write') return defaultPerm.canWrite;
      if (action === 'delete') return defaultPerm.canDelete;
    }

    return false;
  };

  const login = async (email: string, password: string, shopId?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, shopId }),
      });

      if (!res.ok) {
        const data = await res.json();
        return { success: false, error: data.error || 'Login failed' };
      }

      const data = await res.json();

      if (data.user && data.shop) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('shop', JSON.stringify(data.shop));
        localStorage.setItem('token', data.token);
        localStorage.setItem('loginTime', String(Date.now()));
        localStorage.removeItem('permissions');
        setUser(data.user);
        setShop(data.shop);
        setPermissions([]);
        permissionsLoaded.current = false;
        return { success: true };
      }

      return { success: false, error: 'Invalid response' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Connection error' };
    }
  };

  const register = async (registerData: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...registerData }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      if (data.success && data.user && data.shop) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('shop', JSON.stringify(data.shop));
        localStorage.setItem('token', data.token);
        localStorage.setItem('loginTime', String(Date.now()));
        localStorage.removeItem('permissions');
        setUser(data.user);
        setShop(data.shop);
        setPermissions([]);
        permissionsLoaded.current = false;
        return { success: true };
      }

      // New flow: email verification required
      if (data.success && data.emailVerified === false) {
        return { success: true };
      }

      return { success: false, error: 'Invalid response' };
    } catch {
      return { success: false, error: 'Connection error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('shop');
    localStorage.removeItem('token');
    localStorage.removeItem('permissions');
    localStorage.removeItem('loginTime');
    setUser(null);
    setShop(null);
    setPermissions([]);
    permissionsLoaded.current = false;
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, shop, loading, login, register, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
