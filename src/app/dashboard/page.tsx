'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, AlertTriangle, TrendingUp, TrendingDown, DollarSign, ShoppingCart, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalInventoryValue: number;
  todaySales: number;
  todayProfit: number;
  fastMovingItems: any[];
  slowMovingItems: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Dashboard</h1>
        <p style={{ color: '#64748b' }}>Welcome back, Admin</p>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
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

        <div className="stat-card" style={{ border: stats?.lowStockCount ? '1px solid #f59e0b' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value" style={{ color: stats?.lowStockCount ? '#f59e0b' : undefined }}>
                {stats?.lowStockCount || 0}
              </div>
              <div className="stat-label">Low Stock Alerts</div>
            </div>
            <AlertTriangle size={24} color={stats?.lowStockCount ? '#f59e0b' : '#22c55e'} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{formatCurrency(stats?.todaySales || 0)}</div>
              <div className="stat-label">Today's Sales</div>
            </div>
            <DollarSign size={24} color="#22c55e" />
          </div>
          <Link href="/dashboard/pos" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#3b82f6', textDecoration: 'none' }}>
            Go to POS <ArrowRight size={16} />
          </Link>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value" style={{ color: '#22c55e' }}>{formatCurrency(stats?.todayProfit || 0)}</div>
              <div className="stat-label">Today's Profit</div>
            </div>
            <TrendingUp size={24} color="#22c55e" />
          </div>
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Inventory Value</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
            {formatCurrency(stats?.totalInventoryValue || 0)}
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
            Total value of all products in stock
          </p>
        </div>

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
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingUp size={20} color="#22c55e" />
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Fast Moving Items</h3>
          </div>
          {stats?.fastMovingItems && stats.fastMovingItems.length > 0 ? (
            <div>
              {stats.fastMovingItems.slice(0, 5).map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.sku}</div>
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

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingDown size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Slow Moving Items</h3>
          </div>
          {stats?.slowMovingItems && stats.slowMovingItems.length > 0 ? (
            <div>
              {stats.slowMovingItems.slice(0, 5).map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.sku}</div>
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
      </div>
    </div>
  );
}
