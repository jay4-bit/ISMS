'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Store, CreditCard, LogOut, ChevronLeft, ChevronRight, Settings, BarChart3, Smartphone, DollarSign } from 'lucide-react';

const ADMIN_PATHS = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Shops', href: '/admin/shops', icon: Store },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Incomes', href: '/admin/incomes', icon: DollarSign },
  { name: 'Payment Methods', href: '/admin/payment-methods', icon: Smartphone },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    if (!t) {
      if (pathname !== '/admin/login') router.replace('/admin/login');
    } else {
      setToken(t);
    }
  }, [pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;

  if (!token) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a' }}>
      <div style={{
        width: collapsed ? 64 : 220, transition: 'width 0.2s',
        background: '#1e293b', borderRight: '1px solid #334155',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: collapsed ? '1rem 0' : '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          {!collapsed && <><div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BarChart3 size={18} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>Admin</span></>}
        </div>

        <div style={{ flex: 1, padding: '0.5rem' }}>
          {ADMIN_PATHS.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: collapsed ? '0.75rem 0' : '0.65rem 0.75rem',
                  borderRadius: '0.5rem', textDecoration: 'none', color: active ? '#f1f5f9' : '#64748b',
                  background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  marginBottom: '0.25rem', fontWeight: active ? 600 : 400,
                }}
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>

        <div style={{ padding: collapsed ? '0.5rem' : '0.75rem', borderTop: '1px solid #334155' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button
            onClick={() => { localStorage.removeItem('admin_token'); router.push('/admin/login'); }}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}
          >
            <LogOut size={18} />
            {!collapsed && <span style={{ fontSize: '0.85rem' }}>Logout</span>}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
