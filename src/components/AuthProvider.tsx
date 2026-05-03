'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SHOP_TYPE_CONFIG } from '@/lib/auth';

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

interface AuthContextType {
  user: User | null;
  shop: Shop | null;
  loading: boolean;
  login: (email: string, password: string, shopId?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (module: string, action: 'read' | 'write' | 'delete') => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  shop: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  hasPermission: () => true
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedShop = localStorage.getItem('shop');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }

    if (storedShop) {
      try {
        setShop(JSON.parse(storedShop));
      } catch {
        localStorage.removeItem('shop');
      }
    }

    setLoading(false);
  }, []);

  const hasPermission = (module: string, action: 'read' | 'write' | 'delete'): boolean => {
    if (!user) return false;
    if (user.role === 'OWNER') return true;

    const shopConfig = SHOP_TYPE_CONFIG[shop?.shopType || ''];
    if (!shopConfig) return false;

    const allowedModules: Record<string, string[]> = {
      PHARMACIST: ['pos', 'inventory', 'returns'],
      MANAGER: ['dashboard', 'inventory', 'pos', 'returns', 'suppliers', 'expenses', 'reports'],
      CASHIER: ['pos', 'returns'],
      WINGER: ['pos', 'inventory'],
      ASSISTANT: ['inventory', 'pos']
    };

    const userModules = allowedModules[user.role] || [];
    return userModules.includes(module);
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
        setUser(data.user);
        setShop(data.shop);
        return { success: true };
      }

      return { success: false, error: 'Invalid response' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Connection error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('shop');
    localStorage.removeItem('token');
    setUser(null);
    setShop(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, shop, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}