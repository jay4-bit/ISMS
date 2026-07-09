'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, TrendingUp, CreditCard, Search, Download, Smartphone, Landmark, Wallet } from 'lucide-react';

export default function AdminIncomesPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d' | '1y'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchPayments() {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.replace('/admin/login'); return; }
    try {
      const res = await fetch('/api/subscription/payments', {
        headers: { 'authorization': `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem('admin_token'); router.replace('/admin/login'); return; }
      const data = await res.json();
      if (res.ok) setPayments(data.payments || []);
      else setError(data.error || 'Failed to load');
    } catch { setError('Failed to load incomes'); }
    setLoading(false);
  }

  const confirmed = payments.filter(p => p.status === 'CONFIRMED');

  const now = new Date();
  const dateCutoffs: Record<string, number> = {
    '7d': 7, '30d': 30, '90d': 90, '1y': 365, 'all': Infinity,
  };

  const filtered = confirmed.filter(p => {
    const paidAt = new Date(p.paidAt);
    if (customStart && paidAt < new Date(customStart)) return false;
    if (customEnd) {
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      if (paidAt > end) return false;
    }
    if (!customStart && !customEnd) {
      const daysAgo = dateCutoffs[dateRange];
      if (daysAgo !== Infinity && paidAt < new Date(now.getTime() - daysAgo * 86400000)) return false;
    }
    if (methodFilter !== 'all' && !p.paymentMethod?.toLowerCase().includes(methodFilter.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.shop?.name?.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q) ||
        p.paymentMethod?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalIncome = filtered.reduce((sum, p) => sum + p.amount, 0);
  const totalTransactions = filtered.length;
  const avgTransaction = totalTransactions > 0 ? totalIncome / totalTransactions : 0;

  function methodTypeIcon(method: string) {
    const m = (method || '').toUpperCase();
    if (m.includes('MOBILE')) return <Smartphone size={14} color="#22c55e" />;
    if (m.includes('BANK')) return <Landmark size={14} color="#3b82f6" />;
    return <Wallet size={14} color="#f59e0b" />;
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-TZ', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Incomes</h1>
        <button
          onClick={() => {
            const csv = [
              ['Date', 'Shop', 'Amount', 'Payment Method', 'Reference', 'Months', 'Notes'],
              ...filtered.map(p => [
                new Date(p.paidAt).toISOString(),
                p.shop?.name || '',
                p.amount,
                p.paymentMethod || '',
                p.reference || '',
                p.monthsPaid,
                `"${(p.notes || '').replace(/"/g, '""')}"`,
              ]),
            ].map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `incomes-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
            URL.revokeObjectURL(url);
          }}
          style={{
            padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.85rem',
            background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#60a5fa',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        All confirmed subscription payments
      </p>

      {error && <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={18} color="#22c55e" />
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Total Income</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>
            TSh {totalIncome.toLocaleString()}
          </div>
        </div>
        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={18} color="#3b82f6" />
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Avg / Transaction</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>
            TSh {Math.round(avgTransaction).toLocaleString()}
          </div>
        </div>
        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CreditCard size={18} color="#f59e0b" />
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Transactions</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>
            {totalTransactions}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search shop, reference, method..."
            style={{
              width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', borderRadius: '0.5rem',
              background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
          style={{
            padding: '0.65rem 0.75rem', borderRadius: '0.5rem', background: '#1e293b',
            border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.9rem', cursor: 'pointer',
          }}
        >
          <option value="all">All Methods</option>
          <option value="MOBILE">Mobile Money</option>
          <option value="BANK">Bank Transfer</option>
          <option value="CARD">Card</option>
        </select>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {(['all', '7d', '30d', '90d', '1y'] as const).map(key => (
            <button
              key={key}
              onClick={() => { setDateRange(key); setCustomStart(''); setCustomEnd(''); }}
              style={{
                padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem',
                background: dateRange === key && !customStart && !customEnd ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                border: dateRange === key && !customStart && !customEnd ? '1px solid #3b82f6' : '1px solid #334155',
                color: dateRange === key && !customStart && !customEnd ? '#60a5fa' : '#94a3b8', cursor: 'pointer',
              }}
            >
              {key === 'all' ? 'All' : key}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="date" value={customStart}
            onChange={e => { setCustomStart(e.target.value); setDateRange('all'); }}
            style={{
              padding: '0.45rem 0.6rem', borderRadius: '0.5rem', background: '#1e293b',
              border: customStart ? '1px solid #3b82f6' : '1px solid #334155',
              color: '#f1f5f9', fontSize: '0.8rem', cursor: 'pointer', colorScheme: 'dark',
            }}
          />
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>to</span>
          <input
            type="date" value={customEnd}
            onChange={e => { setCustomEnd(e.target.value); setDateRange('all'); }}
            style={{
              padding: '0.45rem 0.6rem', borderRadius: '0.5rem', background: '#1e293b',
              border: customEnd ? '1px solid #3b82f6' : '1px solid #334155',
              color: '#f1f5f9', fontSize: '0.8rem', cursor: 'pointer', colorScheme: 'dark',
            }}
          />
          {(customStart || customEnd) && (
            <button
              onClick={() => { setCustomStart(''); setCustomEnd(''); setDateRange('all'); }}
              style={{
                padding: '0.4rem 0.6rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}>
          No confirmed payments found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(p => (
            <div key={p.id} style={{
              padding: '1rem 1.25rem', borderRadius: '0.75rem',
              background: '#1e293b', border: '1px solid #334155',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9' }}>
                      TSh {p.amount?.toLocaleString()}
                    </span>
                    <span style={{
                      fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '999px', fontWeight: 600,
                      background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e',
                    }}>
                      CONFIRMED
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                    {p.shop?.name || 'Unknown shop'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                  {formatDate(p.paidAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem', color: '#94a3b8', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {methodTypeIcon(p.paymentMethod)}
                  <strong style={{ color: '#f1f5f9', fontWeight: 500 }}>{p.paymentMethod || '—'}</strong>
                </span>
                {p.reference && <span>Ref: <strong style={{ color: '#f1f5f9', fontWeight: 500 }}>{p.reference}</strong></span>}
                <span>{p.monthsPaid} month{p.monthsPaid > 1 ? 's' : ''}</span>
                {p.notes && <span>Notes: <strong style={{ color: '#f1f5f9', fontWeight: 500 }}>{p.notes}</strong></span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
