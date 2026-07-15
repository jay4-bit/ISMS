'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, AlertTriangle, TrendingUp, TrendingDown, DollarSign, ShoppingCart, ArrowRight, Receipt, RotateCcw, BadgeDollarSign, Activity, User, LogIn, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/context/SettingsContext';

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  lowStockItems: any[];
  totalInventoryValue: number;
  totalSellingValue: number;
  avgPurchaseCost: number;
  avgSellingPrice: number;
  todaySales: number;
  todayProfit: number;
  salesCount: number;
  todayExpenses: number;
  todayReturns: number;
  netProfit: number;
  fastMovingItems: any[];
  slowMovingItems: any[];
  expiringProducts: any[];
  expiringCount: number;
  expiredProducts: any[];
  expiredCount: number;
}

interface ActivityItem {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  details?: string;
  createdAt: string;
}

const accountActions = new Set(['LOGIN', 'USER_CREATED']);
const businessActions = new Set(['SALE_CREATED', 'SALE_RETURNED', 'EXPENSE_ADDED', 'PRODUCT_CREATED']);

const actionIcons: Record<string, any> = {
  LOGIN: LogIn,
  SALE_CREATED: ShoppingCart,
  SALE_RETURNED: RotateCcw,
  EXPENSE_ADDED: BadgeDollarSign,
  PRODUCT_CREATED: Package,
  USER_CREATED: User,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { shop, user } = useAuth();
  const { settings } = useSettings();
  const showWidget = (id: string) => settings.dashboardConfig?.[id] !== false;

  useEffect(() => {
    if (shop?.id) fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [shop?.id]);

  async function fetchDashboardData() {
    try {
      setError(null);
      const res = await fetch('/api/dashboard', {
        headers: { 'x-shop-id': shop?.id || '' }
      });
      if (!res.ok) {
        throw new Error(`Failed to load: ${res.status}`);
      }
      const data = await res.json();
      setStats(data.stats);
      setRecentActivities(data.recentActivities || []);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '1rem' }}>
        <AlertTriangle size={48} color="#ef4444" />
        <p style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: '600' }}>{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Dashboard</h1>
        <p style={{ color: '#64748b' }}>Welcome back, {user?.name || 'Admin'}</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        {showWidget('stat-total-products') && (
        <div className="stat-card" style={{ flex: '1 1 200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{stats?.totalProducts || 0}</div>
              <div className="stat-label">Total Products</div>
            </div>
            <Package size={24} color="#3b82f6" />
          </div>
          <Link href="/dashboard/inventory" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#3b82f6', textDecoration: 'none' }}>
            View inventory <ArrowRight size={16} />
          </Link>
        </div>
        )}

        {showWidget('stat-low-stock-alerts') && settings.lowStockAlert && (
          <div className="stat-card" style={{ flex: '1 1 200px', border: (stats?.lowStockCount || 0) > 0 ? '1px solid #f59e0b' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="stat-value" style={{ color: (stats?.lowStockCount || 0) > 0 ? '#f59e0b' : undefined }}>
                  {stats?.lowStockCount || 0}
                </div>
                <div className="stat-label">Low Stock Alerts</div>
              </div>
              <AlertTriangle size={24} color={(stats?.lowStockCount || 0) > 0 ? '#f59e0b' : '#22c55e'} />
            </div>
          </div>
        )}

        {showWidget('stat-expiry-alerts') && settings.expiryAlert && (
          <div className="stat-card" style={{ flex: '1 1 200px', border: (stats?.expiringCount || stats?.expiredCount || 0) > 0 ? '1px solid #ef4444' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="stat-value" style={{ color: (stats?.expiringCount || stats?.expiredCount || 0) > 0 ? '#ef4444' : undefined }}>
                  {(stats?.expiringCount || 0) + (stats?.expiredCount || 0)}
                </div>
                <div className="stat-label">Expiry Alerts</div>
              </div>
              <AlertTriangle size={24} color={(stats?.expiringCount || stats?.expiredCount || 0) > 0 ? '#ef4444' : '#22c55e'} />
            </div>
          </div>
        )}

        {showWidget('stat-today-sales') && (
        <div className="stat-card" style={{ flex: '1 1 200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{formatCurrency(stats?.todaySales || 0)}</div>
              <div className="stat-label">Today&apos;s Sales</div>
            </div>
            <DollarSign size={24} color="#22c55e" />
          </div>
          <Link href="/dashboard/pos" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#3b82f6', textDecoration: 'none' }}>
            Go to POS <ArrowRight size={16} />
          </Link>
        </div>
        )}

        {showWidget('stat-net-profit') && (
        <div className="stat-card" style={{ flex: '1 1 200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value" style={{ color: (stats?.netProfit || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                {formatCurrency(stats?.netProfit || 0)}
              </div>
              <div className="stat-label">Net Profit Today</div>
            </div>
            <TrendingUp size={24} color={(stats?.netProfit || 0) >= 0 ? '#22c55e' : '#ef4444'} />
          </div>
        </div>
        )}

        {showWidget('stat-total-selling-value') && (
        <div className="stat-card" style={{ flex: '1 1 200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{formatCurrency(stats?.totalSellingValue || 0)}</div>
              <div className="stat-label">Total Selling Value</div>
            </div>
            <DollarSign size={24} color="#22c55e" />
          </div>
        </div>
        )}
      </div>

      <div className="grid-cols-3" style={{ marginBottom: '1.5rem' }}>
        {showWidget('summary-today-transactions') && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Receipt size={20} color="#3b82f6" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>Today&apos;s Transactions</h3>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#3b82f6' }}>
            {stats?.salesCount || 0}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Total sales made today
          </p>
        </div>
        )}

        {showWidget('summary-returns-today') && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <RotateCcw size={20} color="#ef4444" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>Returns Today</h3>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ef4444' }}>
            {formatCurrency(stats?.todayReturns || 0)}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Refunds + repair costs
          </p>
        </div>
        )}

        {showWidget('summary-expenses-today') && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <BadgeDollarSign size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>Expenses Today</h3>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f59e0b' }}>
            {formatCurrency(stats?.todayExpenses || 0)}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Operational costs today
          </p>
        </div>
        )}
      </div>

      <div className="grid-cols-3" style={{ marginBottom: '1.5rem' }}>
        {showWidget('inventory-value-cost') && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Inventory Value (Cost)</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
            {formatCurrency(stats?.totalInventoryValue || 0)}
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
            Total purchase cost of all products in stock
          </p>
        </div>
        )}

        {showWidget('avg-cost-price') && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Avg Cost / Price</h3>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Avg Purchase Cost</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
                {formatCurrency(stats?.avgPurchaseCost || 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Avg Selling Price</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#22c55e' }}>
                {formatCurrency(stats?.avgSellingPrice || 0)}
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem' }}>
            Average across all non-faulty products
          </p>
        </div>
        )}

        {showWidget('quick-actions') && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Quick Actions</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/pos" className="btn btn-primary">
              <ShoppingCart size={18} /> New Sale
            </Link>
            <Link href="/dashboard/inventory" className="btn btn-secondary">
              <Package size={18} /> Manage Inventory
            </Link>
            <Link href="/dashboard/reports" className="btn btn-secondary">
              <TrendingUp size={18} /> View Reports
            </Link>
          </div>
        </div>
        )}
      </div>

      <div className="grid-cols-3">
        {showWidget('fast-moving-items') && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingUp size={20} color="#22c55e" />
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Fast Moving Items</h3>
          </div>
          {stats?.fastMovingItems && stats.fastMovingItems.length > 0 ? (
            <div>
              {stats.fastMovingItems.map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{item.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: '#22c55e' }}>{item.stockQuantity} sold</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No sales data yet</p>
          )}
        </div>
        )}

        {showWidget('slow-moving-items') && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingDown size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Slow Moving Items</h3>
          </div>
          {stats?.slowMovingItems && stats.slowMovingItems.length > 0 ? (
            <div>
              {stats.slowMovingItems.map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{item.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: '#f59e0b' }}>{item.stockQuantity} in stock</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No slow moving items</p>
          )}
        </div>
        )}

        {showWidget('low-stock-items') && settings.lowStockAlert && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Low Stock Items</h3>
            </div>
            {stats?.lowStockItems && stats.lowStockItems.length > 0 ? (
              <div>
                {stats.lowStockItems.map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600', color: '#f59e0b' }}>{item.stockQuantity} left</div>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/inventory" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#3b82f6', textDecoration: 'none' }}>
                  View all inventory <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Stock levels are healthy</p>
            )}
          </div>
        )}

        {showWidget('expiring-expired-items') && settings.expiryAlert && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={20} color="#ef4444" />
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Expiring & Expired</h3>
            </div>
            {stats?.expiredProducts && stats.expiredProducts.length > 0 ? (
              <div>
                {stats.expiredProducts.map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600', color: '#ef4444' }}>Expired</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {stats?.expiringProducts && stats.expiringProducts.length > 0 ? (
              <div>
                {stats.expiringProducts.map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600', color: '#f59e0b' }}>Expiring soon</div>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/inventory" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#3b82f6', textDecoration: 'none' }}>
                  View all inventory <ArrowRight size={16} />
                </Link>
              </div>
            ) : (stats?.expiredProducts?.length || 0) === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No products expiring soon</p>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid-cols-2" style={{ marginTop: '1.5rem' }}>
        {showWidget('accounts-activity-feed') && (
        <div className="card" style={{ padding: '0.75rem' }}>
          {(() => {
            const accountActs = recentActivities.filter(a => accountActions.has(a.action));
            const uniqueUsers = [...new Set(accountActs.map(a => a.userName).filter(Boolean))];
            const loginsToday = accountActs.filter(a => a.action === 'LOGIN' && new Date(a.createdAt).toDateString() === new Date().toDateString()).length;
            const newUsers = accountActs.filter(a => a.action === 'USER_CREATED').length;
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={15} color="#8b5cf6" />
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '600' }}>Accounts</h3>
                  </div>
                  <Link href="/dashboard/activities" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.7rem', color: '#3b82f6', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    View all <ArrowRight size={11} />
                  </Link>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.6rem' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '0.3rem', background: 'rgba(139,92,246,0.08)', borderRadius: '0.3rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#8b5cf6' }}>{uniqueUsers.length}</div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Users</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '0.3rem', background: 'rgba(59,130,246,0.08)', borderRadius: '0.3rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#3b82f6' }}>{loginsToday}</div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logins Today</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '0.3rem', background: 'rgba(34,197,94,0.08)', borderRadius: '0.3rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#22c55e' }}>{newUsers}</div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Users</div>
                  </div>
                </div>
                {accountActs.length > 0 ? (
                  <div>
                    {accountActs.slice(0, 2).map((a) => {
                      const Icon = actionIcons[a.action] || Activity;
                      return (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={10} color="#8b5cf6" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <strong>{a.userName || 'System'}</strong> {a.action === 'LOGIN' ? 'logged in' : 'was created'}
                            </div>
                            <div style={{ fontSize: '0.55rem', color: 'var(--muted-foreground)' }}>
                              {new Date(a.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>No account activity yet</p>
                )}
              </>
            );
          })()}
        </div>
        )}

        {showWidget('business-activity-feed') && (
        <div className="card" style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={15} color="#3b82f6" />
              <h3 style={{ fontSize: '0.85rem', fontWeight: '600' }}>Business Activities</h3>
            </div>
            <Link href="/dashboard/activities" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.7rem', color: '#3b82f6', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {recentActivities.filter(a => businessActions.has(a.action)).length > 0 ? (
            <div>
              {recentActivities.filter(a => businessActions.has(a.action)).slice(0, 3).map((a) => {
                const Icon = actionIcons[a.action] || Activity;
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={11} color="#3b82f6" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong>{a.userName || 'System'}</strong> {a.details?.replace(/^[^—]*—\s*/, '').substring(0, 40) || a.action.replace(/_/g, ' ').toLowerCase()}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)' }}>
                        {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>No business activities yet</p>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
