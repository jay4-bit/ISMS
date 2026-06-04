'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  ArrowLeftRight,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  UserPlus,
  ShoppingBag,
  Truck,
  Receipt,
  PieChart,
  Calculator,
  RefreshCw,
  PackagePlus,
  Sun,
  Moon,
  Clock,
  Activity
} from 'lucide-react';
import { SHOP_TYPE_CONFIG } from '@/lib/auth';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import ReminderPopup from '@/components/ReminderPopup';

const DASHBOARD_PATHS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package, permission: 'inventory' },
  { name: 'POS', href: '/dashboard/pos', icon: ShoppingCart, permission: 'pos' },
  { name: 'Sales', href: '/dashboard/sales', icon: DollarSign, permission: 'sales' },
  { name: 'Returns', href: '/dashboard/returns', icon: RefreshCw, permission: 'returns' },
  { name: 'Installments', href: '/dashboard/installments', icon: Calculator, permission: 'installments' },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Truck, permission: 'suppliers' },
  { name: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: PackagePlus, permission: 'purchase-orders' },
  { name: 'Clients', href: '/dashboard/clients', icon: UserPlus, permission: 'clients' },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt, permission: 'expenses' },
  { name: 'Profit & Loss', href: '/dashboard/profit-loss', icon: PieChart, permission: 'profit-loss' },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, permission: 'reports' },
  { name: 'Users', href: '/dashboard/users', icon: Users, permission: 'users' },
  { name: 'Activities', href: '/dashboard/activities', icon: Activity, permission: 'activities' },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, shop, logout, hasPermission } = useAuth();
  const { settings, logo } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const redirectAttempted = useRef(false);
  const [uptime, setUptime] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('loginTime')) {
      localStorage.setItem('loginTime', String(Date.now()));
    }
    const update = () => {
      const start = parseInt(localStorage.getItem('loginTime') || String(Date.now()), 10);
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      setUptime(`${h}:${m}:${s}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (pathname === '/dashboard' && !hasPermission('dashboard', 'read') && !redirectAttempted.current) {
      redirectAttempted.current = true;
      const firstPermitted = DASHBOARD_PATHS.find(p => p.permission !== 'dashboard' && hasPermission(p.permission, 'read'));
      router.replace(firstPermitted?.href || '/');
    }
  }, [pathname, hasPermission, router]);

  if (!user || !shop) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (pathname === '/dashboard' && !hasPermission('dashboard', 'read')) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  const shopConfig = SHOP_TYPE_CONFIG[shop.shopType] || {};

  const navigation = DASHBOARD_PATHS.filter(item => hasPermission(item.permission, 'read'));

  const shopIcons: Record<string, string> = {
    PHARMACY: '💊',
    GENERAL: '🏪',
    LIQUOR: '🍷',
    ELECTRONICS: '📱',
    CLOTHING: '👕',
  };

  return (
    <div style={styles.layout}>
      {mobileOpen && <div className="dash-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`dash-sidebar ${mobileOpen ? 'open' : ''}`}
        style={{
          ...styles.sidebar,
          width: collapsed ? '80px' : '260px',
        }}
      >
        <div style={styles.sidebarHeader}>
          <div style={styles.shopBadge}>
            <span style={styles.shopIcon}>
              {logo ? <img src={logo} alt={shop.name} style={styles.shopLogoImg} /> : shopIcons[shop.shopType]}
            </span>
            {!collapsed && (
              <div style={styles.shopInfo}>
                <span style={styles.shopName}>{settings.businessName || shop.name}</span>
                <span style={styles.shopType}>{shopConfig.name}</span>
              </div>
            )}
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="dash-collapse-btn" style={styles.collapseBtn}>
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button className="dash-close-btn" onClick={() => setMobileOpen(false)} style={styles.collapseBtn}>
            <X size={20} />
          </button>
        </div>

        <nav style={styles.nav}>
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <Link href="/dashboard/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div style={styles.userDetails}>
                  <span style={styles.userName}>{user.name}</span>
                  <span style={styles.userRole}>{user.role}</span>
                </div>
              )}
            </div>
          </Link>
          <button onClick={logout} style={styles.logoutBtn}>
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="dash-main" style={{...styles.main, marginLeft: collapsed ? '80px' : '260px'}}>
        <header style={styles.header}>
          <button className="dash-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} style={styles.menuBtn}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div style={styles.headerTitle}>
            <h1 style={styles.pageTitle}>
              {navigation.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.name || 'Dashboard'}
            </h1>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.uptime} title="Session duration">
              <span>{uptime}</span>
            </div>
            <button onClick={toggleTheme} style={styles.themeBtn} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

          <main style={styles.content}>
            <ReminderPopup shopId={shop?.id} />
            {children}
          </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--background)',
  },
  sidebar: {
    width: '260px',
    background: 'linear-gradient(180deg, var(--card) 0%, var(--background) 100%)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s',
    position: 'fixed',
    height: '100vh',
    zIndex: 100,
  },
  sidebarHeader: {
    padding: '1.25rem',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  shopIcon: {
    fontSize: '1.75rem',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopLogoImg: {
    width: '36px',
    height: '36px',
    borderRadius: '0.5rem',
    objectFit: 'cover',
  },
  shopInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  shopName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--foreground)',
  },
  shopType: {
    fontSize: '0.75rem',
    color: 'var(--muted-foreground)',
  },
  collapseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted-foreground)',
    cursor: 'pointer',
    padding: '0.25rem',
  },
  nav: {
    flex: 1,
    padding: '1rem 0.75rem',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    color: 'var(--foreground)',
    textDecoration: 'none',
    borderRadius: '0.5rem',
    marginBottom: '0.25rem',
    transition: 'all 0.15s',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  navItemActive: {
    background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
    color: 'var(--primary)',
    borderLeft: '3px solid var(--primary)',
  },
  sidebarFooter: {
    padding: '1rem',
    borderTop: '1px solid var(--border)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--foreground)',
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'var(--muted-foreground)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.625rem 1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '0.5rem',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  main: {
    flex: 1,
    marginLeft: '260px',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    height: '64px',
    background: 'var(--card)',
    borderBottom: '1px solid var(--border)',
    padding: '0 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  menuBtn: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: 'var(--foreground)',
    cursor: 'pointer',
    padding: '0.5rem',
  },
  headerTitle: {
    flex: 1,
  },
  pageTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--foreground)',
    margin: 0,
  },
  headerLogo: {
    height: '36px',
    maxWidth: '180px',
    objectFit: 'contain',
    borderRadius: '0.375rem',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  uptime: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--muted-foreground)',
    fontSize: '0.85rem',
    fontWeight: '500',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
  },
  themeBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    padding: '0.4rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  content: {
    flex: 1,
    padding: '1.5rem',
    overflow: 'auto',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'var(--background)',
    color: 'var(--foreground)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--border)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};