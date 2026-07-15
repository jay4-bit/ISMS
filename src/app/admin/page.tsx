'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Users, DollarSign, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  async function fetchStats() {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.replace('/admin/login'); return; }

    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'authorization': `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem('admin_token'); router.replace('/admin/login'); return; }
      const data = await res.json();
      if (res.ok) setStats(data);
      else setError(data.error || 'Failed to load');
    } catch { setError('Failed to load stats'); }
    setLoading(false);
  }

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>;

  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>;

  const cards = [
    { label: 'Total Shops', value: stats?.totalShops || 0, icon: Store, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    { label: 'Pending Payments', value: stats?.pendingPayments || 0, icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { label: 'Confirmed Payments', value: stats?.confirmedPayments || 0, icon: CheckCircle, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    { label: 'Total Revenue', value: `TSh ${(stats?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: '#f1f5f9' }}>Admin Dashboard</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Overview of all shops and payments</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {cards.map(card => (
          <div key={card.label} style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '0.5rem', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={20} color={card.color} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>{card.value}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '1.5rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="#f59e0b" />
          Pending Payments
          {stats?.pendingPayments > 0 && (
            <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              {stats.pendingPayments}
            </span>
          )}
        </h2>
        {stats?.recentPayments?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats.recentPayments.slice(0, 5).map((p: any) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#0f172a' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>{p.shop?.name || 'Unknown'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>TSh {p.amount?.toLocaleString()} · {p.monthsPaid}m · Ref: {p.reference || '—'}</div>
                </div>
                <Link href="/admin/payments" style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none' }}>
                  Review →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No pending payments</p>
        )}
      </div>
    </div>
  );
}
