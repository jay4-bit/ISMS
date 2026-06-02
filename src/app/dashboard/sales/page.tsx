'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Search, Eye, Printer, X, Package, Calendar, Clock, CalendarDays, CalendarCheck, List, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Sale {
  id: string;
  receiptNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  saleType: string;
  amountPaid: number;
  customerName: string | null;
  customerPhone: string | null;
  saleStatus: string;
  isPaid: boolean;
  isInstallment: boolean;
  installmentPaid: number | null;
  installmentDue: number | null;
  createdAt: string;
  cashier: { name: string };
  items: { id: string; product: { name: string; electronicsFields?: { imei?: string | null } | null }; quantity: number; unitPrice: number; total: number }[];
}

export default function SalesPage() {
  const { shop } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [timeFilter, setTimeFilter] = useState('ALL');

  useEffect(() => { fetchSales(); }, [shop]);

  useEffect(() => {
    const interval = setInterval(fetchSales, 15000);
    return () => clearInterval(interval);
  }, [shop]);

  function isInPeriod(dateStr: string, period: string): boolean {
    const d = new Date(dateStr);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'TODAY':
        return d >= startOfDay;
      case 'WEEK': {
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        return d >= startOfWeek;
      }
      case 'MONTH':
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      case '3MONTHS': {
        const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return d >= start;
      }
      case '6MONTHS': {
        const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        return d >= start;
      }
      case 'YEAR':
        return d.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  }

  async function fetchSales() {
    try {
      const res = await fetch('/api/sales', {
        headers: { 'x-shop-id': shop?.id || '' }
      });
      const data = await res.json();
      setSales(data.sales || []);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSales = sales.filter(s => 
    isInPeriod(s.createdAt, timeFilter) &&
    (!search || 
    s.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    s.customerPhone?.includes(search))
  );

  const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="sales-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Sales History</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>View all completed sales</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {[
            { key: 'ALL', label: 'All' },
            { key: 'TODAY', label: 'Today' },
            { key: 'WEEK', label: '7 Days' },
            { key: 'MONTH', label: '30 Days' },
            { key: '3MONTHS', label: '3 Months' },
            { key: '6MONTHS', label: '6 Months' },
            { key: 'YEAR', label: '12 Months' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setTimeFilter(opt.key)}
              className="filter-tab"
              style={{
                padding: '0.35rem 0.65rem', borderRadius: '0.375rem', border: '1px solid',
                borderColor: timeFilter === opt.key ? 'var(--primary)' : 'var(--border)',
                background: timeFilter === opt.key ? 'var(--primary)' : 'transparent',
                color: timeFilter === opt.key ? 'white' : 'var(--muted-foreground)',
                cursor: 'pointer', fontWeight: timeFilter === opt.key ? '600' : '400',
                fontSize: '0.78rem', whiteSpace: 'nowrap',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search by receipt, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '0.5rem', paddingLeft: '34px', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ padding: '0.5rem 1rem', background: 'color-mix(in srgb, var(--success) 12.5%, transparent)', borderRadius: '0.5rem' }}>
            <span style={{ color: 'var(--success)', fontWeight: '600' }}>Total: {formatCurrency(totalSales)}</span>
          </div>
        </div>
      </div>

      {(() => {
        const dailyMap: Record<string, { date: string; total: number; sortKey: string }> = {};
        filteredSales.forEach(s => {
          const day = new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const key = new Date(s.createdAt).toISOString().slice(0, 10);
          if (!dailyMap[key]) dailyMap[key] = { date: day, total: 0, sortKey: key };
          dailyMap[key].total += s.total;
        });
        const chartData = Object.values(dailyMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-30);

        if (chartData.length < 1) return null;

        return (
          <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} color="#22c55e" />
                <h3 style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--foreground)' }}>Sales Trend</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{chartData.length} days</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} width={50} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }}
                  labelStyle={{ color: 'var(--muted-foreground)', fontWeight: '600', marginBottom: '4px' }}
                  formatter={(value: any) => [formatCurrency(value as number), 'Sales']}
                  labelFormatter={(label: any) => String(label)}
                />
                <Area type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2.5} fill="#22c55e" fillOpacity={0.15} dot={{ fill: '#22c55e', stroke: 'var(--background)', strokeWidth: 2, r: 3.5 }} activeDot={{ fill: '#22c55e', stroke: 'var(--background)', strokeWidth: 2, r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      <div className="card table-responsive sales-table" style={{ padding: 0, overflow: 'auto' }}>
        <table className="table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--card)' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>RECEIPT</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>DATE</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>CUSTOMER</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>ITEMS</th>
              <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>TOTAL</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>STATUS</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale, index) => (
              <tr key={sale.id} style={{ background: index % 2 === 0 ? 'var(--card)' : 'var(--background)' }}>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--foreground)', fontSize: '0.75rem' }}>{sale.receiptNumber}</div>
                </td>
                <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>
                  {formatDate(sale.createdAt)}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ color: 'var(--foreground)', fontSize: '0.75rem' }}>{sale.customerName || '-'}</div>
                  {sale.customerPhone && <div style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>{sale.customerPhone}</div>}
                </td>
                <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>
                  <div>{sale.items.length} item(s)</div>
                  {sale.items.map((item, i) => (
                    <div key={i} style={{ fontSize: '0.65rem', color: 'var(--foreground)', marginTop: '0.15rem' }}>
                      {item.product.name}{item.product.electronicsFields?.imei ? <span style={{ color: 'var(--warning)', fontFamily: 'monospace', marginLeft: '0.25rem' }}>IMEI: {item.product.electronicsFields.imei}</span> : null}
                    </div>
                  ))}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)', fontSize: '0.75rem' }}>
                  {formatCurrency(sale.total)}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '0.2rem 0.5rem', 
                    background: sale.saleStatus === 'COMPLETE' ? 'color-mix(in srgb, var(--success) 12.5%, transparent)' : 'color-mix(in srgb, var(--warning) 12.5%, transparent)', 
                    color: sale.saleStatus === 'COMPLETE' ? 'var(--success)' : 'var(--warning)', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.65rem', 
                    fontWeight: '600' 
                  }}>
                    {sale.saleStatus === 'COMPLETE' ? 'Complete' : 'Installment'}
                  </span>
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => setSelectedSale(sale)} 
                      className="btn btn-secondary view-btn"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      <Eye size={14} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredSales.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <ShoppingCart size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No sales found</p>
          </div>
        )}
      </div>

      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Sale Receipt</h2>
              <button onClick={() => setSelectedSale(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Receipt:</span>
                <span style={{ fontWeight: '600' }}>{selectedSale.receiptNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Date:</span>
                <span>{formatDate(selectedSale.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Cashier:</span>
                <span>{selectedSale.cashier.name}</span>
              </div>
              {selectedSale.customerName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Customer:</span>
                  <span>{selectedSale.customerName}</span>
                </div>
              )}
              {selectedSale.customerPhone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Phone:</span>
                  <span>{selectedSale.customerPhone}</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Items</h3>
              {selectedSale.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem' }}>{item.product.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{item.quantity} x {formatCurrency(item.unitPrice)}</div>
                    {item.product.electronicsFields?.imei && <div style={{ fontSize: '0.7rem', color: 'var(--warning)', fontFamily: 'monospace' }}>IMEI: {item.product.electronicsFields.imei}</div>}
                  </div>
                  <div style={{ fontWeight: '600' }}>{formatCurrency(item.total)}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Subtotal:</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Discount:</span>
                <span>-{formatCurrency(selectedSale.discount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #334155', fontWeight: '600', fontSize: '1.1rem' }}>
                <span>Total:</span>
                <span style={{ color: 'var(--success)' }}>{formatCurrency(selectedSale.total)}</span>
              </div>
              {selectedSale.isInstallment && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: 'var(--warning)' }}>
                    <span>Paid:</span>
                    <span>{formatCurrency(selectedSale.installmentPaid || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--destructive)' }}>
                    <span>Due:</span>
                    <span>{formatCurrency(selectedSale.installmentDue || 0)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
