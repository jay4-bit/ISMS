'use client';

import { useEffect, useState } from 'react';
import { HandCoins, Plus, UserPlus, UserMinus, DollarSign, Phone, Trash2, Edit3, X, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Filter, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/components/AuthProvider';

interface DebtPayment {
  id: string;
  amount: number;
  paidAt: string;
  notes: string | null;
  createdAt: string;
}

interface Debt {
  id: string;
  personName: string;
  personPhone: string | null;
  type: 'DEBTOR' | 'CREDITOR';
  amount: number;
  paidAmount: number;
  description: string | null;
  dueDate: string | null;
  status: 'ACTIVE' | 'SETTLED' | 'CANCELLED';
  notes: string | null;
  createdAt: string;
  payments: DebtPayment[];
  balance: number;
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'DEBTOR' | 'CREDITOR'>('DEBTOR');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [showPayment, setShowPayment] = useState<Debt | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const { settings } = useSettings();
  const { shop } = useAuth();

  const [form, setForm] = useState({
    personName: '',
    personPhone: '',
    amount: '',
    description: '',
    dueDate: '',
    notes: '',
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => { fetchDebts(); const interval = setInterval(fetchDebts, 30000); return () => clearInterval(interval); }, []);

  async function fetchDebts() {
    setLoading(true);
    try {
      const res = await fetch('/api/debts', {
        headers: { 'x-shop-id': shop?.id || '' },
      });
      const json = await res.json();
      setDebts(Array.isArray(json) ? json.map((d: Debt) => ({ ...d, balance: d.amount - d.paidAmount })) : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const formatCurr = (n: number) => formatCurrency(n, settings.currency);

  const filtered = debts.filter(d => {
    if (d.type !== tab) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.personName.toLowerCase().includes(q) && !(d.personPhone || '').includes(q)) return false;
    }
    return true;
  });

  const debtorTotal = debts.filter(d => d.type === 'DEBTOR' && d.status === 'ACTIVE').reduce((s, d) => s + (d.amount - d.paidAmount), 0);
  const creditorTotal = debts.filter(d => d.type === 'CREDITOR' && d.status === 'ACTIVE').reduce((s, d) => s + (d.amount - d.paidAmount), 0);

  function resetForm() {
    setForm({ personName: '', personPhone: '', amount: '', description: '', dueDate: '', notes: '' });
    setEditing(null);
  }

  async function handleSave() {
    if (!form.personName || !form.amount) return;
    const body: any = { ...form, amount: parseFloat(form.amount), type: tab };
    if (!editing) {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify(body),
      });
      if (res.ok) { resetForm(); setShowForm(false); fetchDebts(); }
    } else {
      body.id = editing.id;
      const res = await fetch('/api/debts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify(body),
      });
      if (res.ok) { resetForm(); setShowForm(false); fetchDebts(); }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this record?')) return;
    const res = await fetch(`/api/debts?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-shop-id': shop?.id || '' },
    });
    if (res.ok) fetchDebts();
  }

  async function handleRecordPayment() {
    if (!showPayment || !paymentAmount) return;
    const res = await fetch('/api/debts/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
      body: JSON.stringify({ debtId: showPayment.id, amount: parseFloat(paymentAmount), notes: paymentNotes }),
    });
    if (res.ok) {
      setPaymentAmount(''); setPaymentNotes('');
      setShowPayment(null);
      fetchDebts();
    }
  }

  function editDebt(d: Debt) {
    setEditing(d);
    setForm({
      personName: d.personName,
      personPhone: d.personPhone || '',
      amount: String(d.amount),
      description: d.description || '',
      dueDate: d.dueDate ? d.dueDate.split('T')[0] : '',
      notes: d.notes || '',
    });
    setShowForm(true);
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}><HandCoins size={28} /> Debts Tracking</h1>
          <p style={styles.subtitle}>Track people who owe you and people you owe</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={styles.addBtn}>
          <Plus size={18} /> New Record
        </button>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryRow}>
        <div style={{ ...styles.summaryCard, borderLeft: '4px solid #22c55e' }}>
          <ArrowUpRight size={20} color="#22c55e" />
          <div>
            <div style={styles.summaryLabel}>People Who Owe Me</div>
            <div style={{ ...styles.summaryValue, color: '#22c55e' }}>{formatCurr(debtorTotal)}</div>
          </div>
        </div>
        <div style={{ ...styles.summaryCard, borderLeft: '4px solid #ef4444' }}>
          <ArrowDownRight size={20} color="#ef4444" />
          <div>
            <div style={styles.summaryLabel}>People I Owe</div>
            <div style={{ ...styles.summaryValue, color: '#ef4444' }}>{formatCurr(creditorTotal)}</div>
          </div>
        </div>
        <div style={{ ...styles.summaryCard, borderLeft: '4px solid #3b82f6' }}>
          <HandCoins size={20} color="#3b82f6" />
          <div>
            <div style={styles.summaryLabel}>Total Records</div>
            <div style={styles.summaryValue}>{debts.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        <button onClick={() => setTab('DEBTOR')} style={{ ...styles.tab, ...(tab === 'DEBTOR' ? styles.tabActive : {}) }}>
          <UserMinus size={16} /> People Who Owe Me
        </button>
        <button onClick={() => setTab('CREDITOR')} style={{ ...styles.tab, ...(tab === 'CREDITOR' ? styles.tabActive : {}) }}>
          <UserPlus size={16} /> People I Owe
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={14} style={{ color: 'var(--muted-foreground)' }} />
          <input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} style={styles.searchInput} />
        </div>
        <div style={styles.statusFilter}>
          <Filter size={14} style={{ color: 'var(--muted-foreground)' }} />
          <select className="debt-status-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={styles.select}>
            <option value="ACTIVE">Active</option>
            <option value="SETTLED">Settled</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div style={styles.overlay} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editing ? 'Edit' : 'New'} {tab === 'DEBTOR' ? 'Debtor' : 'Creditor'}</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.label}>Full Name *</label>
              <input value={form.personName} onChange={e => setForm(f => ({ ...f, personName: e.target.value }))} style={styles.input} placeholder="Person's name" />

              <label style={styles.label}>Phone</label>
              <input value={form.personPhone} onChange={e => setForm(f => ({ ...f, personPhone: e.target.value }))} style={styles.input} placeholder="Phone number" />

              <label style={styles.label}>Amount *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={styles.input} placeholder="0" min="0" step="0.01" />

              <label style={styles.label}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={styles.input} placeholder="What is this for?" />

              <label style={styles.label}>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={styles.input} />

              <label style={styles.label}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={styles.textarea} placeholder="Additional notes..." rows={3} />
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleSave} style={styles.saveBtn}>{editing ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div style={styles.overlay} onClick={() => setShowPayment(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Record Payment</h3>
              <button onClick={() => setShowPayment(null)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={{ ...styles.modalBody, padding: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '0.75rem' }}>
                Recording payment for <strong>{showPayment.personName}</strong>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                Total: {formatCurr(showPayment.amount)} &middot; Paid: {formatCurr(showPayment.paidAmount)} &middot; Balance: {formatCurr(showPayment.balance)}
              </p>
              <label style={styles.label}>Payment Amount *</label>
              <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={styles.input} placeholder="0" min="0" step="0.01" />
              <label style={styles.label}>Notes</label>
              <textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} style={styles.textarea} placeholder="Payment notes..." rows={2} />
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowPayment(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleRecordPayment} style={styles.saveBtn} disabled={!paymentAmount}>Record Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? <div style={styles.loading}>Loading...</div> : (
        <div style={styles.list}>
          {filtered.length === 0 ? (
            <div style={styles.empty}>
              <HandCoins size={48} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>No {tab === 'DEBTOR' ? 'debtors' : 'creditors'} found</p>
              <button onClick={() => { resetForm(); setShowForm(true); }} style={styles.addSmallBtn}>Add {tab === 'DEBTOR' ? 'a Debtor' : 'a Creditor'}</button>
            </div>
          ) : filtered.map(d => {
            const expanded = expandedId === d.id;
            const bal = d.amount - d.paidAmount;
            const settled = d.status === 'SETTLED';
            return (
              <div key={d.id} style={{ ...styles.card, opacity: settled ? 0.6 : 1 }}>
                <div style={styles.cardMain}>
                  <div style={styles.cardLeft}>
                    <div style={styles.cardName}>
                      <span style={{ fontWeight: '600', fontSize: '1rem' }}>{d.personName}</span>
                      {d.personPhone && <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={11} />{d.personPhone}</span>}
                    </div>
                    {d.description && <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>{d.description}</div>}
                  </div>
                  <div style={styles.cardRight}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: settled ? 'var(--muted-foreground)' : (tab === 'DEBTOR' ? '#22c55e' : '#ef4444') }}>
                        {formatCurr(bal)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                        of {formatCurr(d.amount)}
                      </div>
                    </div>
                  </div>
                  <div style={styles.badgeGroup}>
                    {settled && <span style={{ ...styles.badge, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>Settled</span>}
                    {d.status === 'CANCELLED' && <span style={{ ...styles.badge, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Cancelled</span>}
                    {d.dueDate && new Date(d.dueDate) < new Date() && !settled && d.status !== 'CANCELLED' && (
                      <span style={{ ...styles.badge, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Overdue</span>
                    )}
                  </div>
                  <div style={styles.cardActions}>
                    {!settled && d.status !== 'CANCELLED' && (
                      <button onClick={() => setShowPayment(d)} style={{ ...styles.iconBtn, color: '#22c55e' }} title="Record Payment"><DollarSign size={16} /></button>
                    )}
                    <button onClick={() => editDebt(d)} style={{ ...styles.iconBtn, color: '#3b82f6' }} title="Edit"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(d.id)} style={{ ...styles.iconBtn, color: '#ef4444' }} title="Delete"><Trash2 size={16} /></button>
                    <button onClick={() => setExpandedId(expanded ? null : d.id)} style={styles.iconBtn}>
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div style={styles.expanded}>
                    <div style={styles.expandedGrid}>
                      <div><span style={styles.expLabel}>Amount:</span> {formatCurr(d.amount)}</div>
                      <div><span style={styles.expLabel}>Paid:</span> {formatCurr(d.paidAmount)}</div>
                      <div><span style={{ ...styles.expLabel, fontWeight: '700' }}>Balance:</span> <span style={{ fontWeight: '600', color: tab === 'DEBTOR' ? '#22c55e' : '#ef4444' }}>{formatCurr(bal)}</span></div>
                      {d.dueDate && <div><span style={styles.expLabel}>Due:</span> {new Date(d.dueDate).toLocaleDateString()}</div>}
                      <div><span style={styles.expLabel}>Status:</span> {d.status}</div>
                      <div><span style={styles.expLabel}>Created:</span> {new Date(d.createdAt).toLocaleDateString()}</div>
                    </div>
                    {d.notes && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}><span style={styles.expLabel}>Notes:</span> {d.notes}</div>}
                    {d.payments.length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.35rem' }}>Payment History</div>
                        {d.payments.map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                            <span>{new Date(p.paidAt).toLocaleDateString()}{p.notes ? ` - ${p.notes}` : ''}</span>
                            <span style={{ color: '#22c55e', fontWeight: '600' }}>{formatCurr(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', padding: '1.5rem', color: 'var(--foreground)' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', fontSize: '1rem', color: 'var(--muted-foreground)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 },
  subtitle: { color: 'var(--muted-foreground)', fontSize: '0.875rem', marginTop: '0.25rem' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' },
  addSmallBtn: { marginTop: '0.75rem', padding: '0.5rem 1rem', background: '#3b82f6', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer', fontSize: '0.85rem' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  summaryCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--card)', borderRadius: '0.75rem', border: '1px solid var(--border)' },
  summaryLabel: { fontSize: '0.75rem', color: 'var(--muted-foreground)' },
  summaryValue: { fontSize: '1.25rem', fontWeight: '700' },
  tabBar: { display: 'flex', gap: '0.5rem', marginBottom: '1rem' },
  tab: { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--muted-foreground)', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' },
  tabActive: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '1px solid #3b82f6', color: 'white' },
  filterBar: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem' },
  searchInput: { border: 'none', background: 'none', color: 'var(--foreground)', fontSize: '0.85rem', outline: 'none', width: '100%' },
  statusFilter: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem' },
  select: { background: 'none', border: 'none', color: 'var(--foreground)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--muted-foreground)' },
  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' },
  cardMain: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', flexWrap: 'wrap' },
  cardLeft: { flex: 1, minWidth: '150px' },
  cardName: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  cardRight: { textAlign: 'right' },
  badgeGroup: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' },
  badge: { padding: '0.2rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.65rem', fontWeight: '600' },
  cardActions: { display: 'flex', gap: '0.25rem', alignItems: 'center' },
  iconBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0 },
  expanded: { padding: '0 1rem 1rem', borderTop: '1px solid var(--border)' },
  expandedGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', padding: '0.75rem 0', fontSize: '0.85rem' },
  expLabel: { color: 'var(--muted-foreground)', fontSize: '0.75rem' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: 'var(--card)', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--border)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' },
  modalTitle: { fontSize: '1.1rem', fontWeight: '600', margin: 0 },
  closeBtn: { background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.25rem' },
  modalBody: { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' },
  label: { fontSize: '0.8rem', fontWeight: '600', color: 'var(--foreground)' },
  input: { width: '100%', padding: '0.6rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '0.6rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  cancelBtn: { padding: '0.5rem 1rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.85rem' },
  saveBtn: { padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' },
};
