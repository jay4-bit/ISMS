'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Download } from 'lucide-react';

interface ProfitData {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeCount: number;
  expenseCount: number;
  incomeByMonth: { month: string; total: number; count: number }[];
  expenseByCategory: { category: string; total: number; count: number }[];
}

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  HOSTING: 'Hosting', DOMAIN: 'Domain', SMS: 'SMS', MARKETING: 'Marketing',
  SOFTWARE: 'Software', COMMISSION: 'Commission', SALARY: 'Salary',
  MAINTENANCE: 'Maintenance', OTHER: 'Other',
};

const PERIODS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' },
];

export default function AdminProfitPage() {
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [error, setError] = useState('');
  const router = useRouter();

  async function fetchData() {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.replace('/admin/login'); return; }

    try {
      const res = await fetch(`/api/admin/profit?period=${period}`, {
        headers: { 'authorization': `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem('admin_token'); router.replace('/admin/login'); return; }
      const d = await res.json();
      if (res.ok) setData(d);
      else setError(d.error || 'Failed to load');
    } catch { setError('Failed to load profit data'); }
    setLoading(false);
  }

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 30000); return () => clearInterval(interval); }, [period]);

  const formatCurr = (amount: number) => `TSh ${amount.toLocaleString()}`;

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>Profit & Loss</h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 1.5rem' }}>Income - Expenses = Profit</p>
        </div>
        <button
          onClick={() => {
            if (!data) return;
            const csv = [
              ['Metric', 'Value'],
              ['Total Income', data.totalIncome],
              ['Total Expenses', data.totalExpenses],
              ['Net Profit', data.netProfit],
              ['Income Transactions', data.incomeCount],
              ['Expense Transactions', data.expenseCount],
              ...data.incomeByMonth.map(m => [`Income ${m.month}`, m.total]),
              ...data.expenseByCategory.map(c => [`Expense ${c.category}`, c.total]),
            ].map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `admin-profit-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
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

      {error && <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => { setPeriod(p.value); setLoading(true); }}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.85rem',
              background: period === p.value ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              border: period === p.value ? '1px solid #3b82f6' : '1px solid #334155',
              color: period === p.value ? '#60a5fa' : '#94a3b8', cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.5rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <TrendingUp size={20} color="#22c55e" />
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Income</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#22c55e' }}>{formatCurr(data?.totalIncome || 0)}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>{data?.incomeCount || 0} transactions</div>
        </div>

        <div style={{ padding: '1.5rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <TrendingDown size={20} color="#ef4444" />
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Expenses</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444' }}>{formatCurr(data?.totalExpenses || 0)}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>{data?.expenseCount || 0} transactions</div>
        </div>

        <div style={{
          padding: '1.5rem', borderRadius: '0.75rem',
          background: (data?.netProfit || 0) >= 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: (data?.netProfit || 0) >= 0 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <DollarSign size={20} color={(data?.netProfit || 0) >= 0 ? '#22c55e' : '#ef4444'} />
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Net Profit</span>
          </div>
          <div style={{
            fontSize: '1.75rem', fontWeight: 700,
            color: (data?.netProfit || 0) >= 0 ? '#22c55e' : '#ef4444',
          }}>
            {(data?.netProfit || 0) >= 0 ? '' : '-'}{formatCurr(Math.abs(data?.netProfit || 0))}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            {(data?.netProfit || 0) >= 0 ? 'Profitable' : 'Loss'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: '#f1f5f9', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={16} color="#22c55e" /> Income by Month
          </h3>
          {data?.incomeByMonth && data.incomeByMonth.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.incomeByMonth.map(m => {
                const max = Math.max(...data.incomeByMonth.map(x => x.total), 1);
                const pct = (m.total / max) * 100;
                return (
                  <div key={m.month}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                      <span>{m.month}</span>
                      <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{formatCurr(m.total)} ({m.count})</span>
                    </div>
                    <div style={{ height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#22c55e', borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No income data for this period</p>
          )}
        </div>

        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: '#f1f5f9', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={16} color="#ef4444" /> Expenses by Category
          </h3>
          {data?.expenseByCategory && data.expenseByCategory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.expenseByCategory.map(c => {
                const max = Math.max(...data.expenseByCategory.map(x => x.total), 1);
                const pct = (c.total / max) * 100;
                return (
                  <div key={c.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                      <span>{EXPENSE_CATEGORY_LABELS[c.category] || c.category}</span>
                      <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{formatCurr(c.total)} ({c.count})</span>
                    </div>
                    <div style={{ height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#ef4444', borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No expenses for this period</p>
          )}
        </div>
      </div>

      <div style={{
        padding: '1.5rem', borderRadius: '0.75rem',
        background: '#1e293b', border: '1px solid #334155',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Income</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22c55e' }}>{formatCurr(data?.totalIncome || 0)}</div>
        </div>
        <div style={{ fontSize: '1.5rem', color: '#64748b' }}>-</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Expenses</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{formatCurr(data?.totalExpenses || 0)}</div>
        </div>
        <div style={{ fontSize: '1.5rem', color: '#64748b' }}>=</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Net Profit</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: (data?.netProfit || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
            {formatCurr(data?.netProfit || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
