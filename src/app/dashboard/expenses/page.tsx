'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Plus, Edit, Trash2, X, TrendingUp, Calendar, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  reference: string | null;
  date: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'RENT', label: 'Rent', color: '#8b5cf6' },
  { value: 'UTILITIES', label: 'Utilities', color: '#3b82f6' },
  { value: 'SALARIES', label: 'Salaries', color: '#22c55e' },
  { value: 'SUPPLIES', label: 'Supplies', color: '#f59e0b' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: '#ef4444' },
  { value: 'MARKETING', label: 'Marketing', color: '#ec4899' },
  { value: 'TRANSPORT', label: 'Transport', color: '#06b6d4' },
  { value: 'OTHER', label: 'Other', color: '#64748b' },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [formData, setFormData] = useState({
    category: 'OTHER', amount: '', description: '', reference: '', date: new Date().toISOString().split('T')[0]
  });
  const { settings } = useSettings();

  useEffect(() => { fetchExpenses(); }, []);

  async function fetchExpenses() {
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  }

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
    try {
      const method = editingExpense ? 'PUT' : 'POST';
      const body = editingExpense ? { ...formData, id: editingExpense.id } : formData;
      const res = await fetch('/api/expenses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setShowModal(false);
        fetchExpenses();
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return;
    try {
      await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      fetchExpenses();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }

  const filteredExpenses = expenses.filter(e => {
    if (filterCategory && e.category !== filterCategory) return false;
    if (dateRange.start && new Date(e.date) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(e.date) > new Date(dateRange.end)) return false;
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: filteredExpenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0)
  }));

  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + e.amount, 0);

  const formatCurr = (amount: number) => formatCurrency(amount, settings.currency);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Expenses Tracking</h1>
          <p style={{ color: '#64748b' }}>Track and categorize business expenses</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary">
          <Plus size={18} /> Add Expense
        </button>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} color="#ef4444" />
            <div>
              <div className="stat-value">{formatCurr(totalExpenses)}</div>
              <div className="stat-label">Total Expenses</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} color="#3b82f6" />
            <div>
              <div className="stat-value">{formatCurr(thisMonth)}</div>
              <div className="stat-label">This Month</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="#22c55e" />
            <div>
              <div className="stat-value">{filteredExpenses.length}</div>
              <div className="stat-label">Transactions</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={20} color="#8b5cf6" />
            <div>
              <div className="stat-value">{EXPENSE_CATEGORIES.filter(c => byCategory.find(bc => bc.value === c.value && bc.total > 0)).length}</div>
              <div className="stat-label">Categories Used</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>By Category</h3>
          {byCategory.map(cat => (
            <div key={cat.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: cat.color }} />
                <span style={{ fontSize: '0.875rem' }}>{cat.label}</span>
              </div>
              <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{formatCurr(cat.total)}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select className="select" style={{ width: 'auto' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
            </select>
            <input type="date" className="input" style={{ width: 'auto' }} value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
            <span style={{ alignSelf: 'center' }}>to</span>
            <input type="date" className="input" style={{ width: 'auto' }} value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(expense => {
                const cat = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                return (
                  <tr key={expense.id}>
                    <td>{new Date(expense.date).toLocaleDateString()}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat?.color }} />
                        {cat?.label || expense.category}
                      </span>
                    </td>
                    <td>{expense.description}</td>
                    <td>{expense.reference || '-'}</td>
                    <td style={{ fontWeight: '600', color: '#ef4444' }}>{formatCurr(expense.amount)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={() => openModal(expense)} className="btn btn-secondary" style={{ padding: '0.25rem' }}><Edit size={14} /></button>
                        <button onClick={() => handleDelete(expense.id)} className="btn btn-danger" style={{ padding: '0.25rem' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredExpenses.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <DollarSign size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>No expenses recorded yet.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Category</label>
                  <select className="select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required>
                    {EXPENSE_CATEGORIES.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="label">Amount</label>
                  <input type="number" step="0.01" className="input" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Description</label>
                <input type="text" className="input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="label">Reference</label>
                  <input type="text" className="input" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} placeholder="Invoice #" />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingExpense ? 'Update' : 'Add Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
