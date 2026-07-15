'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Plus, Edit, Trash2, X, Search, Download } from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  reference: string | null;
  date: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'HOSTING', label: 'Hosting', color: '#3b82f6' },
  { value: 'DOMAIN', label: 'Domain', color: '#8b5cf6' },
  { value: 'SMS', label: 'SMS', color: '#22c55e' },
  { value: 'MARKETING', label: 'Marketing', color: '#ec4899' },
  { value: 'SOFTWARE', label: 'Software', color: '#06b6d4' },
  { value: 'COMMISSION', label: 'Commission', color: '#f59e0b' },
  { value: 'SALARY', label: 'Salary', color: '#ef4444' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: '#14b8a6' },
  { value: 'OTHER', label: 'Other', color: '#64748b' },
];

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    category: 'OTHER', amount: '', description: '', reference: '', date: new Date().toISOString().split('T')[0]
  });
  const router = useRouter();

  async function fetchExpenses() {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.replace('/admin/login'); return; }

    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/admin/expenses?${params}`, {
        headers: { 'authorization': `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem('admin_token'); router.replace('/admin/login'); return; }
      const data = await res.json();
      if (res.ok) setExpenses(data.expenses || []);
      else setError(data.error || 'Failed to load');
    } catch { setError('Failed to load expenses'); }
    setLoading(false);
  }

  useEffect(() => { fetchExpenses(); const interval = setInterval(fetchExpenses, 30000); return () => clearInterval(interval); }, [categoryFilter]);

  function openModal(expense?: Expense) {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        category: expense.category,
        amount: expense.amount.toString(),
        description: expense.description,
        reference: expense.reference || '',
        date: expense.date.split('T')[0]
      });
    } else {
      setEditingExpense(null);
      setFormData({ category: 'OTHER', amount: '', description: '', reference: '', date: new Date().toISOString().split('T')[0] });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const method = editingExpense ? 'PUT' : 'POST';
      const payload = editingExpense ? { ...formData, id: editingExpense.id } : formData;
      const res = await fetch('/api/admin/expenses', {
        method,
        headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        fetchExpenses();
      }
    } catch { setError('Save failed'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      await fetch(`/api/admin/expenses?id=${id}`, { method: 'DELETE', headers: { 'authorization': `Bearer ${token}` } });
      fetchExpenses();
    } catch { setError('Delete failed'); }
  }

  const filtered = expenses.filter(e => {
    if (search) {
      const q = search.toLowerCase();
      return e.description.toLowerCase().includes(q) || (e.reference || '').toLowerCase().includes(q);
    }
    return true;
  });

  const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0)
  }));

  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + e.amount, 0);

  const formatCurr = (amount: number) => `TSh ${amount.toLocaleString()}`;

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>Expenses</h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 1.5rem' }}>Track operating costs for the system</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => {
              const csv = [
                ['Date', 'Category', 'Description', 'Reference', 'Amount'],
                ...filtered.map(e => [
                  new Date(e.date).toISOString(),
                  e.category,
                  `"${e.description.replace(/"/g, '""')}"`,
                  e.reference || '',
                  e.amount,
                ]),
              ].map(r => r.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `admin-expenses-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.85rem',
              background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#60a5fa',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}
          >
            <Download size={16} /> Export
          </button>
          <button onClick={() => openModal()} style={{
            padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.85rem',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', color: 'white',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}>
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={18} color="#ef4444" />
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Total Expenses</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>{formatCurr(totalExpenses)}</div>
        </div>
        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={18} color="#3b82f6" />
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>This Month</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>{formatCurr(thisMonth)}</div>
        </div>
        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={18} color="#22c55e" />
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Transactions</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>{filtered.length}</div>
        </div>
        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={18} color="#8b5cf6" />
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Categories Used</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>{byCategory.filter(c => c.total > 0).length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: '#f1f5f9', fontSize: '1rem' }}>By Category</h3>
          {byCategory.map(cat => (
            <div key={cat.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: cat.color }} />
                <span style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>{cat.label}</span>
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f1f5f9' }}>{formatCurr(cat.total)}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: '#1e293b', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search descriptions..."
                style={{
                  width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', borderRadius: '0.5rem',
                  background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <select
              value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setLoading(true); }}
              style={{
                padding: '0.65rem 0.75rem', borderRadius: '0.5rem', background: '#0f172a',
                border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <DollarSign size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No expenses recorded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filtered.map(expense => {
                const cat = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                return (
                  <div key={expense.id} style={{
                    padding: '0.85rem 1rem', borderRadius: '0.5rem',
                    background: '#0f172a', border: '1px solid #334155',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat?.color, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>{expense.description}</div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                          <span>{cat?.label || expense.category}</span>
                          <span>{new Date(expense.date).toLocaleDateString()}</span>
                          {expense.reference && <span>Ref: {expense.reference}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '1rem' }}>{formatCurr(expense.amount)}</span>
                      <button onClick={() => openModal(expense)} style={{ padding: '0.35rem', borderRadius: '0.4rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', cursor: 'pointer' }}>
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(expense.id)} style={{ padding: '0.35rem', borderRadius: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem',
            width: '100%', maxWidth: 480, border: '1px solid #334155',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Category</label>
                  <select
                    value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    required
                  >
                    {EXPENSE_CATEGORIES.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Amount (TSh)</label>
                  <input
                    type="number" step="0.01" min="0" value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Description</label>
                <input
                  type="text" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Reference (optional)</label>
                  <input
                    type="text" value={formData.reference}
                    onChange={e => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Invoice #"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Date</label>
                  <input
                    type="date" value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box', colorScheme: 'dark' }}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: '0.6rem 1.25rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.9rem',
                  background: 'transparent', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer',
                }}>
                  Cancel
                </button>
                <button type="submit" style={{
                  padding: '0.6rem 1.25rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', color: 'white', cursor: 'pointer',
                }}>
                  {editingExpense ? 'Update' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
