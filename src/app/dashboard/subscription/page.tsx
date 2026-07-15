'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AlertTriangle, CheckCircle, Clock, CreditCard, Calendar, Smartphone, Landmark, Wallet } from 'lucide-react';

const PLANS = [
  { months: 1, label: '1 Month', price: 30000, discount: 0 },
  { months: 3, label: '3 Months', price: 81000, discount: 10 },
  { months: 6, label: '6 Months', price: 144000, discount: 20 },
  { months: 12, label: '12 Months', price: 240000, discount: 33 },
];

export default function SubscriptionPage() {
  const { shop, subscription, refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [paymentRef, setPaymentRef] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [payStep, setPayStep] = useState<'idle' | 'method' | 'confirm'>('idle');
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [globalMethods, setGlobalMethods] = useState<any[]>([]);

  const expired = subscription?.status === 'EXPIRED';
  const trial = subscription?.status === 'TRIAL';

  useEffect(() => {
    fetchPayments();
    fetch('/api/payment-methods').then(r => r.json()).then(d => { if (d.methods) setGlobalMethods(d.methods); }).catch(() => {});
    const interval = setInterval(fetchPayments, 15000);
    return () => clearInterval(interval);
  }, []);

  function methodIcon(type: string) {
    switch (type) {
      case 'MOBILE': return <Smartphone size={24} color="#22c55e" />;
      case 'BANK': return <Landmark size={24} color="#3b82f6" />;
      default: return <Wallet size={24} color="#f59e0b" />;
    }
  }

  function methodTypeLabel(type: string) {
    switch (type) {
      case 'MOBILE': return 'Mobile Money';
      case 'BANK': return 'Bank Transfer';
      case 'CARD': return 'Card';
      default: return type;
    }
  }

  async function fetchPayments() {
    try {
      const res = await fetch('/api/subscription/payments', {
        headers: { 'x-shop-id': shop?.id || '' },
      });
      const data = await res.json();
      if (data.payments) setPayments(data.payments);
    } catch {}
  }

  function handleStartPay() {
    if (globalMethods.length === 0) {
      setMessage({ text: 'No payment methods configured. Contact the administrator.', type: 'error' });
      return;
    }
    setPayStep('method');
    setSelectedMethod(null);
    setPaymentRef('');
    setMessage(null);
  }

  async function handleConfirmPay() {
    if (!selectedMethod) return;
    if (!paymentRef.trim()) {
      setMessage({ text: 'Please enter the transaction reference before submitting.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/subscription/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({
          amount: selectedPlan.price,
          paymentMethod: `${selectedMethod.type} - ${selectedMethod.label}`,
          reference: paymentRef.trim(),
          monthsPaid: selectedPlan.months,
          notes: `Payment for ${selectedPlan.label} via ${methodTypeLabel(selectedMethod.type)} - ${selectedMethod.label} (${selectedMethod.number})`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          text: `Payment submitted! Reference: "${paymentRef || 'N/A'}". Your subscription will be activated once the payment is confirmed.`,
          type: 'success',
        });
        setPayStep('idle');
        setSelectedMethod(null);
        setPaymentRef('');
        refreshSubscription();
        fetchPayments();
      } else {
        setMessage({ text: data.error || 'Payment failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Failed to process payment', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function daysLeft(d: string | null) {
    if (!d) return 0;
    const diff = new Date(d).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Subscription</h1>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>Manage your plan and billing</p>

      {message && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: message.type === 'success' ? '#22c55e' : '#ef4444',
          fontSize: '0.9rem',
        }}>
          {message.text}
        </div>
      )}

      {expired && (
        <div style={{
          padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem',
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444',
        }}>
          <AlertTriangle size={20} />
          <div>
            <strong>Your subscription has expired.</strong> Renew now to continue using all features.
          </div>
        </div>
      )}

      {trial && (
        <div style={{
          padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem',
          background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#3b82f6',
        }}>
          <Clock size={20} />
          <div>
            <strong>Trial period:</strong> {daysLeft(subscription?.trialEndsAt || null)} days remaining (ends {formatDate(subscription?.trialEndsAt || null)}).
            {subscription?.subscriptionEndsAt && new Date(subscription.subscriptionEndsAt) > new Date()
              ? ` Your paid plan (${formatDate(subscription.subscriptionEndsAt)}) will activate automatically after trial ends.`
              : ' Subscribe to keep using Inshop.'}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          padding: '1.25rem', borderRadius: '0.75rem', background: 'var(--card)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)' }}>
            <CheckCircle size={18} color={subscription?.status === 'ACTIVE' ? '#22c55e' : '#ef4444'} />
            {subscription?.status === 'ACTIVE' ? 'Active' : subscription?.status === 'TRIAL' ? 'Trial' : 'Expired'}
          </div>
        </div>
        <div style={{
          padding: '1.25rem', borderRadius: '0.75rem', background: 'var(--card)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Expires</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)' }}>
            <Calendar size={18} color="var(--muted-foreground)" />
            {formatDate(subscription?.subscriptionEndsAt || subscription?.trialEndsAt || null)}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--foreground)' }}>Choose a Plan</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {PLANS.map(plan => (
          <button
            key={plan.months}
            onClick={() => setSelectedPlan(plan)}
            style={{
              padding: '1.25rem 1rem', borderRadius: '0.75rem', cursor: 'pointer',
              background: selectedPlan.months === plan.months ? 'rgba(59, 130, 246, 0.15)' : 'var(--card)',
              border: selectedPlan.months === plan.months ? '2px solid #3b82f6' : '1px solid var(--border)',
              textAlign: 'center', color: 'var(--foreground)', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              TSh {plan.price.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>{plan.label}</div>
            {plan.discount > 0 && (
              <div style={{
                fontSize: '0.75rem', color: '#22c55e', marginTop: '0.35rem',
                background: 'rgba(34, 197, 94, 0.15)', display: 'inline-block',
                padding: '0.1rem 0.5rem', borderRadius: '999px',
              }}>
                Save {plan.discount}%
              </div>
            )}
          </button>
        ))}
      </div>

      {payStep === 'idle' && (
        <button
          onClick={handleStartPay}
          style={{
            width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.95rem',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', color: 'white',
            cursor: 'pointer', marginBottom: '2rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}
        >
          <CreditCard size={18} />
          Pay TSh {selectedPlan.price.toLocaleString()}
        </button>
      )}

      {payStep === 'method' && globalMethods.length > 0 && (
        <div style={{
          padding: '1.5rem', borderRadius: '0.75rem', background: 'var(--card)',
          border: '1px solid var(--border)', marginBottom: '1.5rem',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--foreground)' }}>
            Select Payment Method
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {globalMethods.map((m, i) => (
              <button
                key={i}
                onClick={() => { setSelectedMethod(m); setPayStep('confirm'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: '0.5rem',
                  background: selectedMethod?.id === m.id ? 'rgba(59, 130, 246, 0.15)' : 'var(--background)',
                  border: selectedMethod?.id === m.id ? '2px solid #3b82f6' : '1px solid transparent',
                  cursor: 'pointer', color: 'var(--foreground)', width: '100%', textAlign: 'left',
                }}
              >
                {methodIcon(m.type)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                    {methodTypeLabel(m.type)} &middot; {m.number}
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', color: selectedMethod?.id === m.id ? '#3b82f6' : 'var(--muted-foreground)' }}>
                  {selectedMethod?.id === m.id ? '✓' : '>'}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setPayStep('idle')}
            style={{
              marginTop: '0.75rem', padding: '0.5rem 1rem', background: 'none',
              border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--muted-foreground)',
              cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {payStep === 'confirm' && selectedMethod && (
        <div style={{
          padding: '1.5rem', borderRadius: '0.75rem', background: 'var(--card)',
          border: '1px solid var(--border)', marginBottom: '2rem',
        }}>
          <div style={{
            padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
            background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#3b82f6', fontSize: '0.85rem',
          }}>
            Send <strong>TSh {selectedPlan.price.toLocaleString()}</strong> to <strong>{selectedMethod.label} - {selectedMethod.number}</strong>
            {' '}({selectedMethod.name}), then enter the transaction reference below. Your subscription will be activated once the payment is confirmed.
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--foreground)' }}>
            Confirm Payment
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--muted-foreground)' }}>Plan</span>
              <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{selectedPlan.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--muted-foreground)' }}>Amount</span>
              <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>TSh {selectedPlan.price.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--muted-foreground)' }}>Pay To</span>
              <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{selectedMethod.label} - {selectedMethod.number}</span>
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
              Transaction Reference <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="Enter transaction ID or receipt number"
              style={{
                width: '100%', padding: '0.65rem 0.75rem', borderRadius: '0.5rem',
                background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setPayStep('method')}
              disabled={loading}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.9rem',
                background: 'none', border: '1px solid var(--border)', color: 'var(--muted-foreground)',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              }}
            >
              Back
            </button>
            <button
              onClick={handleConfirmPay}
              disabled={loading}
              style={{
                flex: 2, padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.95rem',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              <CheckCircle size={18} />
              {loading ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      )}

      {payments.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--foreground)' }}>Payment History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {payments.map((p: any) => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1rem', borderRadius: '0.5rem',
                background: 'var(--card)', border: '1px solid var(--border)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--foreground)' }}>TSh {p.amount.toLocaleString()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    {p.monthsPaid} month{p.monthsPaid > 1 ? 's' : ''} &middot; {p.paymentMethod || '—'}
                    {p.reference ? ` · Ref: ${p.reference}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '999px',
                    background: p.status === 'CONFIRMED' ? 'rgba(34, 197, 94, 0.15)' : p.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.15)',
                    color: p.status === 'CONFIRMED' ? '#22c55e' : p.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
                  }}>
                    {p.status || 'PENDING'}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                    {formatDate(p.paidAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
