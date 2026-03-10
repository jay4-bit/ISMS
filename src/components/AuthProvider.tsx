'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: string;
}

interface Permission {
  role: string;
  module: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

interface AuthContextType {
  user: User | null;
  permissions: Permission[];
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (module: string, action: 'read' | 'write' | 'delete') => boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  permissions: [],
  loading: true, 
  login: async () => false, 
  logout: () => {},
  hasPermission: () => true
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      
      fetch('/api/permissions')
        .then(res => res.json())
        .then(data => {
          const rolePerms = (data.permissions || []).filter((p: Permission) => p.role === userData.role);
          setPermissions(rolePerms);
        })
        .catch(e => console.error('Failed to fetch permissions:', e))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const hasPermission = (module: string, action: 'read' | 'write' | 'delete'): boolean => {
    if (loading) return true;
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    
    const perm = permissions.find(p => p.module === module);
    if (!perm) return false;
    
    switch (action) {
      case 'read': return perm.canRead;
      case 'write': return perm.canWrite;
      case 'delete': return perm.canDelete;
      default: return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        setUser(data.user);
        
        const permRes = await fetch('/api/permissions');
        const permData = await permRes.json();
        const rolePerms = (permData.permissions || []).filter((p: Permission) => p.role === data.user.role);
        setPermissions(rolePerms);
        setLoading(false);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setPermissions([]);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
