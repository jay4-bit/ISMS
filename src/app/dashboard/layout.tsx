'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Package, ShoppingCart, Undo2, BarChart3, 
  Menu, X, Users, FileText, ClipboardCheck, DollarSign, Settings, 
  User, LogOut, CreditCard, TrendingUp, Shield
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/components/AuthProvider';

const ROLE_MENUS: Record<string, { href: string; label: string; icon: any; module: string }[]> = {
  ADMIN: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { href: '/dashboard/inventory', label: 'Inventory', icon: Package, module: 'inventory' },
    { href: '/dashboard/pos', label: 'POS / Sales', icon: ShoppingCart, module: 'pos' },
    { href: '/dashboard/installments', label: 'Installments', icon: CreditCard, module: 'pos' },
    { href: '/dashboard/returns', label: 'Returns', icon: Undo2, module: 'returns' },
    { href: '/dashboard/suppliers', label: 'Suppliers', icon: Users, module: 'suppliers' },
    { href: '/dashboard/purchase-orders', label: 'Purchase Orders', icon: FileText, module: 'purchase-orders' },
    { href: '/dashboard/stock-count', label: 'Stock Count', icon: ClipboardCheck, module: 'stock-count' },
    { href: '/dashboard/expenses', label: 'Expenses', icon: DollarSign, module: 'expenses' },
    { href: '/dashboard/profit-loss', label: 'Profit & Loss', icon: TrendingUp, module: 'profit-loss' },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, module: 'reports' },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings, module: 'settings' },
  ],
  MANAGER: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { href: '/dashboard/inventory', label: 'Inventory', icon: Package, module: 'inventory' },
    { href: '/dashboard/pos', label: 'POS / Sales', icon: ShoppingCart, module: 'pos' },
    { href: '/dashboard/installments', label: 'Installments', icon: CreditCard, module: 'pos' },
    { href: '/dashboard/returns', label: 'Returns', icon: Undo2, module: 'returns' },
    { href: '/dashboard/suppliers', label: 'Suppliers', icon: Users, module: 'suppliers' },
    { href: '/dashboard/purchase-orders', label: 'Purchase Orders', icon: FileText, module: 'purchase-orders' },
    { href: '/dashboard/stock-count', label: 'Stock Count', icon: ClipboardCheck, module: 'stock-count' },
    { href: '/dashboard/expenses', label: 'Expenses', icon: DollarSign, module: 'expenses' },
    { href: '/dashboard/profit-loss', label: 'Profit & Loss', icon: TrendingUp, module: 'profit-loss' },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, module: 'reports' },
  ],
  CASHIER: [
    { href: '/dashboard/inventory', label: 'Inventory', icon: Package, module: 'inventory' },
    { href: '/dashboard/pos', label: 'POS / Sales', icon: ShoppingCart, module: 'pos' },
    { href: '/dashboard/installments', label: 'Installments', icon: CreditCard, module: 'installments' },
    { href: '/dashboard/returns', label: 'Returns', icon: Undo2, module: 'returns' },
  ],
  WINGER: [
    { href: '/dashboard/inventory', label: 'Inventory', icon: Package, module: 'inventory' },
  ],
  SHOP_ASSISTANT: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { href: '/dashboard/inventory', label: 'Inventory', icon: Package, module: 'inventory' },
    { href: '/dashboard/pos', label: 'POS / Sales', icon: ShoppingCart, module: 'pos' },
    { href: '/dashboard/stock-count', label: 'Stock Count', icon: ClipboardCheck, module: 'stock-count' },
  ],
  ACCOUNTANT: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { href: '/dashboard/expenses', label: 'Expenses', icon: DollarSign, module: 'expenses' },
    { href: '/dashboard/profit-loss', label: 'Profit & Loss', icon: TrendingUp, module: 'profit-loss' },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, module: 'reports' },
  ],
};

const bottomNavItems = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, module: 'settings' },
  { href: '/dashboard/permissions', label: 'Permissions', icon: Shield, module: 'users' },
  { href: '/dashboard/profile', label: 'My Profile', icon: User, module: 'settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { settings, loading: settingsLoading } = useSettings();
  const { user, logout } = useAuth();

  const userRole = user?.role || 'CASHIER';
  const navItems = ROLE_MENUS[userRole] || ROLE_MENUS.CASHIER;
  
  const filteredBottomNav = bottomNavItems.filter(item => item.href === '/dashboard/profile');

  useEffect(() => {
    if (userRole === 'WINGER' && pathname === '/dashboard') {
      router.replace('/dashboard/inventory');
    }
  }, [userRole, pathname, router]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 60,
          padding: '0.5rem',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          display: 'none',
        }}
      >
        {sidebarOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
      </button>

      <aside style={{
        width: '280px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderRight: '1px solid #334155',
        zIndex: 50,
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #334155', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '0.75rem', 
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Package size={24} color="white" />
            </div>
            <div>
              <span style={{ fontWeight: '700', fontSize: '1.3rem', color: '#f1f5f9' }}>ISMS Pro</span>
              <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '600' }}>
                {settingsLoading ? 'Loading...' : `${settings.currencySymbol} ${settings.currency}`}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '1rem 0.75rem',
          scrollbarWidth: 'thin',
          scrollbarColor: '#475569 transparent',
        }}>
          {/* Custom scrollbar for webkit */}
          <style>{`
            nav::-webkit-scrollbar { width: 6px; }
            nav::-webkit-scrollbar-track { background: transparent; }
            nav::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
            nav::-webkit-scrollbar-thumb:hover { background: #64748b; }
          `}</style>

          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', paddingLeft: '0.75rem' }}>
            Main Menu
          </div>
          
          {navItems.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.6rem',
                  color: active ? '#f1f5f9' : '#94a3b8',
                  textDecoration: 'none',
                  fontWeight: active ? '600' : '500',
                  fontSize: '0.9rem',
                  marginBottom: '0.25rem',
                  background: active ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                  transition: 'all 0.15s ease',
                  border: active ? 'none' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                    e.currentTarget.style.color = '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <item.icon size={20} style={{ color: active ? '#fff' : '#94a3b8' }} />
                {item.label}
                {active && (
                  <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                )}
              </Link>
            );
          })}

          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', marginTop: '1.5rem', paddingLeft: '0.75rem' }}>
            Account
          </div>
          
          {filteredBottomNav.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.6rem',
                  color: active ? '#f1f5f9' : '#94a3b8',
                  textDecoration: 'none',
                  fontWeight: active ? '600' : '500',
                  fontSize: '0.9rem',
                  marginBottom: '0.25rem',
                  background: active ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                    e.currentTarget.style.color = '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <item.icon size={20} style={{ color: active ? '#fff' : '#94a3b8' }} />
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              borderRadius: '0.6rem',
              color: '#ef4444',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '0.9rem',
              marginTop: '0.75rem',
              background: 'transparent',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              width: '100%',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut size={20} />
            Logout
          </button>
        </nav>

        {/* Footer - User Profile */}
        <div style={{ 
          padding: '1rem', 
          borderTop: '1px solid #334155',
          background: '#0f172a',
          flexShrink: 0,
        }}>
          <div style={{ 
            padding: '0.75rem', 
            borderRadius: '0.6rem',
            background: 'linear-gradient(135deg, #334155, #1e293b)',
            border: '1px solid #475569'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '1rem'
              }}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#f1f5f9' }}>{user?.name || 'User'}</div>
                <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '500' }}>{user?.role || 'User'}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ marginLeft: '280px', minHeight: '100vh', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        {children}
        
        {/* Global Footer */}
        <footer style={{
          marginTop: 'auto',
          padding: '1.5rem',
          borderTop: '1px solid #334155',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Package size={20} style={{ color: '#8b5cf6' }} />
            <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: '500' }}>
              ISMS Pro - Tanzania
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8rem', color: '#64748b' }}>
            <span>Inventory & Sales Management System</span>
            <span style={{ color: '#475569' }}>|</span>
            <span>Version 1.0.0</span>
            <span style={{ color: '#475569' }}>|</span>
            <span>&copy; 2026</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '600' }}>
            Made for Tanzania • {settings.currencySymbol} {settings.currency}
          </div>
        </footer>
      </main>
    </div>
  );
}
