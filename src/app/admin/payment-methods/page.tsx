'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2, Smartphone, Landmark, CreditCard } from 'lucide-react';

export default function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function fetchMethods() {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.replace('/admin/login'); return; }
    try {
      const res = await fetch('/api/admin/payment-methods', { headers: { 'authorization': `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem('admin_token'); router.replace('/admin/login'); return; }
      const data = await res.json();
      if (res.ok) setMethods(data.methods || []);
      else setError(data.error || 'Failed to load');
    } catch { setError('Failed to load payment methods'); }
    setLoading(false);
  }

  useEffect(() => { fetchMethods(); const interval = setInterval(fetchMethods, 30000); return () => clearInterval(interval); }, []);

  function addMethod() {
    setMethods([...methods, { id: null, type: 'MOBILE', label: '', name: '', number: '', isActive: true, sortOrder: methods.length }]);
  }

  function updateMethod(i: number, field: string, value: any) {
    const m = [...methods];
    m[i] = { ...m[i], [field]: value };
    setMethods(m);
  }

  function removeMethod(i: number) {
    setMethods(methods.filter((_, j) => j !== i));
  }

  async function saveAll() {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setSaving(true);
    setError('');

    try {
      const existing = await (await fetch('/api/admin/payment-methods', { headers: { 'authorization': `Bearer ${token}` } })).json();
      const existingIds = new Set((existing.methods || []).map((m: any) => m.id));
      const currentIds = new Set(methods.filter(m => m.id).map((m: any) => m.id));

      for (const id of existingIds) {
        if (!currentIds.has(id)) {
          await fetch(`/api/admin/payment-methods?id=${id}`, { method: 'DELETE', headers: { 'authorization': `Bearer ${token}` } });
        }
      }

      for (let i = 0; i < methods.length; i++) {
        const m = methods[i];
        const payload = { ...m, sortOrder: i };
        if (m.id) {
          await fetch('/api/admin/payment-methods', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        } else {
          await fetch('/api/admin/payment-methods', { method: 'POST', headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        }
      }

      await fetchMethods();
    } catch { setError('Failed to save'); }
    setSaving(false);
  }

  function typeIcon(type: string) {
    switch (type) {
      case 'MOBILE': return <Smartphone size={18} />;
      case 'BANK': return <Landmark size={18} />;
      default: return <CreditCard size={18} />;
    }
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>Payment Methods</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={addMethod} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={16} /> Add Method
          </button>
          <button onClick={saveAll} disabled={saving} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        Configure the payment accounts that shops will see when paying their subscription.
      </p>

      {error && <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      {methods.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}>
          No payment methods configured. Click &quot;Add Method&quot; to add one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {methods.map((m, i) => (
            <div key={i} style={{ padding: '1rem 1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Type</label>
                  <select value={m.type} onChange={e => updateMethod(i, 'type', e.target.value)} style={{ width: '100%', padding: '0.5rem 0.5rem', borderRadius: '0.4rem', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.85rem' }}>
                    <option value="MOBILE">Mobile Money</option>
                    <option value="BANK">Bank</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Label</label>
                  <input type="text" value={m.label} onChange={e => updateMethod(i, 'label', e.target.value)} placeholder="e.g. Vodacom Lipa" style={{ width: '100%', padding: '0.5rem 0.5rem', borderRadius: '0.4rem', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Account Name</label>
                  <input type="text" value={m.name || ''} onChange={e => updateMethod(i, 'name', e.target.value)} placeholder="e.g. Vodacom Tanzania" style={{ width: '100%', padding: '0.5rem 0.5rem', borderRadius: '0.4rem', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Number</label>
                  <input type="text" value={m.number || ''} onChange={e => updateMethod(i, 'number', e.target.value)} placeholder="e.g. 54564556" style={{ width: '100%', padding: '0.5rem 0.5rem', borderRadius: '0.4rem', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <button onClick={() => removeMethod(i)} style={{ marginTop: '1.25rem', padding: '0.4rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={m.isActive} onChange={e => updateMethod(i, 'isActive', e.target.checked)} style={{ accentColor: '#22c55e' }} />
                  Active
                </label>
                {typeIcon(m.type)}
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {m.type === 'MOBILE' ? 'Mobile Money' : m.type === 'BANK' ? 'Bank Transfer' : 'Card'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
