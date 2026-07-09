'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => { fetchPayments(); const interval = setInterval(fetchPayments, 15000); return () => clearInterval(interval); }, []);

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
    } catch { setError('Failed to load payments'); }
    setLoading(false);
  }

  async function handleAction(paymentId: string, action: 'CONFIRMED' | 'REJECTED') {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setProcessing(paymentId);
    try {
      const res = await fetch('/api/subscription/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify({ paymentId, action }),
      });
      if (res.ok) {
        setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: action } : p));
      }
    } catch {}
    setProcessing(null);
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const pending = payments.filter(p => p.status === 'PENDING');
  const history = payments.filter(p => p.status !== 'PENDING');

  const filteredPending = pending.filter(p =>
    !search || p.shop?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.reference?.toLowerCase().includes(search.toLowerCase()) ||
    p.paymentMethod?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: '#f1f5f9' }}>Payments</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Review and confirm subscription payments</p>

      {error && <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      <div style={{ marginBottom: '1rem', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by shop, reference, or method..." style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', borderRadius: '0.5rem', background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box' }} />
      </div>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={18} color="#f59e0b" />
        Pending ({filteredPending.length})
      </h2>

      {filteredPending.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155', marginBottom: '2rem' }}>
          {search ? 'No matching payments' : 'No pending payments'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {filteredPending.map(p => (
                  <div key={p.id} style={{ padding: '1rem 1.25rem', borderRadius: '0.75rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9' }}>TSh {p.amount?.toLocaleString()}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                          {p.shop?.name || 'Unknown'}
                          {p.shop?.subscriptionStatus && (
                            <span style={{
                              marginLeft: '0.5rem', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '999px', fontWeight: 600,
                              background: p.shop.subscriptionStatus === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : p.shop.subscriptionStatus === 'TRIAL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                              color: p.shop.subscriptionStatus === 'ACTIVE' ? '#22c55e' : p.shop.subscriptionStatus === 'TRIAL' ? '#3b82f6' : '#ef4444',
                            }}>
                              {p.shop.subscriptionStatus}
                            </span>
                          )}
                          <span style={{ marginLeft: '0.5rem' }}>· {p.monthsPaid} month{p.monthsPaid > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleAction(p.id, 'CONFIRMED')} disabled={processing === p.id} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.85rem', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#22c55e', cursor: processing === p.id ? 'not-allowed' : 'pointer', opacity: processing === p.id ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle size={16} /> {processing === p.id ? '...' : 'Confirm'}
                        </button>
                        <button onClick={() => handleAction(p.id, 'REJECTED')} disabled={processing === p.id} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', cursor: processing === p.id ? 'not-allowed' : 'pointer', opacity: processing === p.id ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <XCircle size={16} /> Reject
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                      {p.reference && <span>Ref: <strong style={{ color: '#f1f5f9' }}>{p.reference}</strong></span>}
                      {p.paymentMethod && <span>Method: <strong style={{ color: '#f1f5f9' }}>{p.paymentMethod}</strong></span>}
                      {p.notes && <span>Notes: <strong style={{ color: '#f1f5f9' }}>{p.notes}</strong></span>}
                      <span>Date: {formatDate(p.paidAt)}</span>
                    </div>
                  </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#f1f5f9' }}>History ({history.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {history.map(p => (
                  <div key={p.id} style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#1e293b', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>TSh {p.amount?.toLocaleString()} · {p.shop?.name || 'Unknown'}
                          {p.shop?.subscriptionStatus && (
                            <span style={{
                              marginLeft: '0.5rem', fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '999px', fontWeight: 600,
                              background: p.shop.subscriptionStatus === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : p.shop.subscriptionStatus === 'TRIAL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                              color: p.shop.subscriptionStatus === 'ACTIVE' ? '#22c55e' : p.shop.subscriptionStatus === 'TRIAL' ? '#3b82f6' : '#ef4444',
                            }}>
                              {p.shop.subscriptionStatus}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: p.status === 'CONFIRMED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.1)', color: p.status === 'CONFIRMED' ? '#22c55e' : '#ef4444' }}>{p.status}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatDate(p.paidAt)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
                      <span>{p.monthsPaid} month{p.monthsPaid > 1 ? 's' : ''}</span>
                      {p.reference && <span>Ref: <strong style={{ color: '#94a3b8' }}>{p.reference}</strong></span>}
                      {p.paymentMethod && <span>Method: <strong style={{ color: '#94a3b8' }}>{p.paymentMethod}</strong></span>}
                      {p.notes && <span>Notes: <strong style={{ color: '#94a3b8' }}>{p.notes}</strong></span>}
                    </div>
                  </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
