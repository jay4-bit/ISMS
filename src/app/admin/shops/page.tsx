'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Store, Users, Clock, CheckCircle, AlertTriangle, Ban, Play, XCircle, Plus, UserPlus, UserMinus, Settings, Edit3, Eye, EyeOff, Mail, Shield } from 'lucide-react';

const SHOP_TYPES = ['PHARMACY', 'GENERAL', 'LIQUOR', 'ELECTRONICS', 'CLOTHING'];

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ padding: '1.5rem', borderRadius: '0.75rem', background: 'var(--card)', border: '1px solid var(--border)', maxWidth: 550, width: '90%', maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--foreground)', margin: 0, fontSize: '1.1rem' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '1.25rem', padding: '0.25rem' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', label }: { value: string; onChange: (v: string) => void; placeholder: string; type?: string; label?: string }) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
    </div>
  );
}

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label?: string }) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.85rem', cursor: 'pointer' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Button({ onClick, children, variant, disabled }: { onClick: () => void; children: React.ReactNode; variant?: 'primary' | 'danger' | 'ghost'; disabled?: boolean }) {
  const btnStyles: Record<string, React.CSSProperties> = {
    primary: { background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#60a5fa' },
    danger: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444' },
    ghost: { background: 'none', border: '1px solid var(--border)', color: 'var(--muted-foreground)' },
  };
  const s = btnStyles[variant || 'ghost'];
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...s, padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: disabled ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      {children}
    </button>
  );
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ shopId: string; shopName: string; status: string } | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', shopType: 'GENERAL', email: '', phone: '', address: '', ownerName: '', ownerEmail: '', ownerPassword: '' });

  const [manageShop, setManageShop] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'CASHIER' });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', isActive: true, newPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();

  async function fetchShops(query?: string) {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.replace('/admin/login'); return; }
    try {
      const url = query ? `/api/admin/shops?search=${encodeURIComponent(query)}` : '/api/admin/shops';
      const res = await fetch(url, { headers: { 'authorization': `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem('admin_token'); router.replace('/admin/login'); return; }
      const data = await res.json();
      if (res.ok) setShops(data.shops || []);
      else setError(data.error || 'Failed to load');
    } catch { setError('Failed to load shops'); }
    setLoading(false);
  }

  useEffect(() => { fetchShops(); const interval = setInterval(fetchShops, 30000); return () => clearInterval(interval); }, []);

  async function handleUpdateSubscription(shopId: string, subscriptionStatus: string) {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setProcessing(shopId);
    setConfirmAction(null);
    try {
      const res = await fetch(`/api/admin/shops/${shopId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify({ subscriptionStatus }),
      });
      if (res.ok) {
        setShops(prev => prev.map(s => s.id === shopId ? { ...s, subscriptionStatus } : s));
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update');
      }
    } catch { setError('Failed to update subscription'); }
    setProcessing(null);
  }

  async function handleDeleteShop() {
    if (!deleteTarget) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/shops/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteTarget(null);
        setDeleteConfirmName('');
        fetchShops(search || undefined);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete shop');
      }
    } catch { setError('Failed to delete shop'); }
    setDeleting(false);
  }

  async function handleCreateShop() {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setError('');
    try {
      const res = await fetch('/api/admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreate(false);
        setCreateForm({ name: '', shopType: 'GENERAL', email: '', phone: '', address: '', ownerName: '', ownerEmail: '', ownerPassword: '' });
        fetchShops(search || undefined);
      } else {
        setError(data.error || 'Failed to create shop');
      }
    } catch { setError('Failed to create shop'); }
  }

  async function openManageUsers(shop: any) {
    setManageShop(shop);
    setUsersLoading(true);
    setUsersError('');
    setShowAddUser(false);
    setEditingUser(null);
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`/api/admin/shops/${shop.id}/users`, { headers: { 'authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
      else setUsersError(data.error || 'Failed to load users');
    } catch { setUsersError('Failed to load users'); }
    setUsersLoading(false);
  }

  async function handleAddUser() {
    if (!manageShop) return;
    const token = localStorage.getItem('admin_token');
    setError('');
    try {
      const res = await fetch(`/api/admin/shops/${manageShop.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddUser(false);
        setUserForm({ name: '', email: '', password: '', role: 'CASHIER' });
        openManageUsers(manageShop);
      } else {
        setError(data.error || 'Failed to add user');
      }
    } catch { setError('Failed to add user'); }
  }

  async function handleEditUser() {
    if (!manageShop || !editingUser) return;
    const token = localStorage.getItem('admin_token');
    setError('');
    try {
      const res = await fetch(`/api/admin/shops/${manageShop.id}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: editingUser.id, ...editForm }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingUser(null);
        setEditForm({ name: '', role: '', isActive: true, newPassword: '' });
        openManageUsers(manageShop);
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch { setError('Failed to update user'); }
  }

  async function handleDeleteUser(userId: string) {
    if (!manageShop) return;
    const token = localStorage.getItem('admin_token');
    if (!confirm('Delete this user? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/shops/${manageShop.id}/users?userId=${userId}`, {
        method: 'DELETE',
        headers: { 'authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        openManageUsers(manageShop);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch { setError('Failed to delete user'); }
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Shops</h1>
        <button onClick={() => setShowCreate(true)}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Plus size={16} /> Create Shop
        </button>
      </div>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>All registered shops and their subscription status</p>

      {error && <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      {confirmAction && (
        <Modal title="Confirm Action" onClose={() => setConfirmAction(null)}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Set <strong style={{ color: 'var(--foreground)' }}>{confirmAction.shopName}</strong> subscription to <strong style={{ color: 'var(--foreground)' }}>{confirmAction.status}</strong>?
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button onClick={() => handleUpdateSubscription(confirmAction.shopId, confirmAction.status)} variant={confirmAction.status === 'EXPIRED' ? 'danger' : 'primary'}>Confirm</Button>
          </div>
        </Modal>
      )}

      {showCreate && (
        <Modal title="Create New Shop" onClose={() => setShowCreate(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Input label="Shop Name" value={createForm.name} onChange={v => setCreateForm({ ...createForm, name: v })} placeholder="Enter shop name" />
              <Select label="Shop Type" value={createForm.shopType} onChange={v => setCreateForm({ ...createForm, shopType: v })}
                options={SHOP_TYPES.map(t => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))} />
            </div>
            <Input label="Email (optional)" value={createForm.email} onChange={v => setCreateForm({ ...createForm, email: v })} placeholder="shop@example.com" type="email" />
            <Input label="Phone (optional)" value={createForm.phone} onChange={v => setCreateForm({ ...createForm, phone: v })} placeholder="+255..." />
            <Input label="Address (optional)" value={createForm.address} onChange={v => setCreateForm({ ...createForm, address: v })} placeholder="Shop address" />
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Owner Account</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input label="Owner Name" value={createForm.ownerName} onChange={v => setCreateForm({ ...createForm, ownerName: v })} placeholder="Full name" />
                <Input label="Owner Email" value={createForm.ownerEmail} onChange={v => setCreateForm({ ...createForm, ownerEmail: v })} placeholder="owner@example.com" type="email" />
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <Input label="Password" value={createForm.ownerPassword} onChange={v => setCreateForm({ ...createForm, ownerPassword: v })} placeholder="Min 6 characters" type="password" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreateShop} variant="primary"
                disabled={!createForm.name || !createForm.ownerName || !createForm.ownerEmail || !createForm.ownerPassword}>
                <Plus size={14} /> Create Shop
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Shop — This Cannot Be Undone" onClose={() => { setDeleteTarget(null); setDeleteConfirmName(''); }}>
          <div style={{ padding: '0.5rem 0' }}>
            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '1rem' }}>
              <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
                ⚠ This action is permanent and cannot be reversed.
              </p>
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              You are about to delete <strong style={{ color: 'var(--foreground)' }}>{deleteTarget.name}</strong>.
              All users, products, sales, inventory, and other data belonging to this shop will be permanently erased.
            </p>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Type <strong style={{ color: 'var(--foreground)' }}>{deleteTarget.name}</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder="Type shop name to confirm"
              style={{
                width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem',
                background: 'var(--background)', border: deleteConfirmName === deleteTarget?.name ? '1px solid #ef4444' : '1px solid var(--border)',
                color: 'var(--foreground)', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button onClick={() => { setDeleteTarget(null); setDeleteConfirmName(''); }}>Cancel</Button>
              <Button onClick={handleDeleteShop} variant="danger" disabled={deleteConfirmName !== deleteTarget?.name || deleting}>
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {manageShop && (
        <Modal title={`Users — ${manageShop.name}`} onClose={() => { setManageShop(null); setEditingUser(null); setShowAddUser(false); }}>
          {usersError && <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{usersError}</div>}

          {!showAddUser && !editingUser && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
              <Button onClick={() => setShowAddUser(true)} variant="primary"><UserPlus size={14} /> Add User</Button>
            </div>
          )}

          {showAddUser && (
            <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--foreground)', margin: '0 0 0.75rem', fontSize: '0.9rem' }}>New User</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <Input value={userForm.name} onChange={v => setUserForm({ ...userForm, name: v })} placeholder="Full name" label="Name" />
                  <Input value={userForm.email} onChange={v => setUserForm({ ...userForm, email: v })} placeholder="user@example.com" type="email" label="Email" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <Input value={userForm.password} onChange={v => setUserForm({ ...userForm, password: v })} placeholder="Password" type="password" label="Password" />
                  <Select value={userForm.role} onChange={v => setUserForm({ ...userForm, role: v })} label="Role"
                    options={['OWNER', 'MANAGER', 'CASHIER', 'PHARMACIST', 'ASSISTANT', 'WINGER'].map(r => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() }))} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <Button onClick={() => { setShowAddUser(false); setUserForm({ name: '', email: '', password: '', role: 'CASHIER' }); }}>Cancel</Button>
                  <Button onClick={handleAddUser} variant="primary" disabled={!userForm.name || !userForm.email || !userForm.password}>
                    <UserPlus size={14} /> Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {editingUser && (
            <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--foreground)', margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Edit User — {editingUser.name}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <Input value={editForm.name} onChange={v => setEditForm({ ...editForm, name: v })} placeholder="Full name" label="Name" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <Select value={editForm.role} onChange={v => setEditForm({ ...editForm, role: v })} label="Role"
                    options={['OWNER', 'MANAGER', 'CASHIER', 'PHARMACIST', 'ASSISTANT', 'WINGER'].map(r => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() }))} />
                  <Select value={editForm.isActive ? 'true' : 'false'} onChange={v => setEditForm({ ...editForm, isActive: v === 'true' })} label="Status"
                    options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
                </div>
                <div>
                  <Input value={editForm.newPassword} onChange={v => setEditForm({ ...editForm, newPassword: v })} placeholder="Leave blank to keep current" type={showPassword ? 'text' : 'password'} label="New Password (optional)" />
                  <button onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                    {showPassword ? <EyeOff size={12} /> : <Eye size={12} />} {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <Button onClick={() => { setEditingUser(null); setEditForm({ name: '', role: '', isActive: true, newPassword: '' }); }}>Cancel</Button>
                  <Button onClick={handleEditUser} variant="primary" disabled={!editForm.name}><Edit3 size={14} /> Save</Button>
                </div>
              </div>
            </div>
          )}

          {usersLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>Loading users...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)', background: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
              No users found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {users.map(u => (
                <div key={u.id} style={{
                  padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--foreground)' }}>{u.name}</span>
                      <span style={{
                        fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '999px', fontWeight: 600,
                        background: u.isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                        color: u.isActive ? '#22c55e' : '#ef4444',
                      }}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={11} /> {u.email}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Shield size={11} /> {u.role}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button onClick={() => { setEditingUser(u); setEditForm({ name: u.name, role: u.role, isActive: u.isActive, newPassword: '' }); setShowAddUser(false); }}
                      style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
                      <Edit3 size={12} />
                    </button>
                    <button onClick={() => handleDeleteUser(u.id)}
                      style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
                      <UserMinus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>Loading...</div>
      ) : (
        <>
          <div style={{ marginBottom: '1rem', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); fetchShops(e.target.value); }} placeholder="Search shops by name, email, or phone..."
              style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', borderRadius: '0.5rem', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
          </div>

          {shops.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)', background: 'var(--card)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              {search ? 'No shops found' : 'No shops registered yet'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {shops.map(shop => {
                const isActive = shop.subscriptionStatus === 'ACTIVE';
                const isTrial = shop.subscriptionStatus === 'TRIAL';
                const isExpired = shop.subscriptionStatus === 'EXPIRED';
                const isCancelled = shop.subscriptionStatus === 'CANCELLED';

                return (
                  <div key={shop.id} style={{ padding: '1rem 1.25rem', borderRadius: '0.75rem', background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Store size={18} color="#3b82f6" />
                          <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--foreground)' }}>{shop.name}</span>
                          <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'var(--border)', color: 'var(--muted-foreground)' }}>{shop.shopType}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Users size={14} /> {shop._count?.users || 0} users
                          </span>
                          <span>Registered: {formatDate(shop.createdAt)}</span>
                          {shop.trialEndsAt && <span>Trial ends: {formatDate(shop.trialEndsAt)}</span>}
                          {shop.subscriptionEndsAt && <span>Expires: {formatDate(shop.subscriptionEndsAt)}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                        <span style={{
                          fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 600,
                          background: isActive ? 'rgba(34, 197, 94, 0.15)' : isTrial ? 'rgba(59, 130, 246, 0.15)' : isExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.15)',
                          color: isActive ? '#22c55e' : isTrial ? '#3b82f6' : isExpired ? '#ef4444' : '#f59e0b',
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                        }}>
                          {isActive ? <CheckCircle size={12} /> : isTrial ? <Clock size={12} /> : <AlertTriangle size={12} />}
                          {shop.subscriptionStatus}
                        </span>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button onClick={() => openManageUsers(shop)}
                            title="Manage Users"
                            style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.75rem', gap: '0.25rem' }}>
                            <Settings size={12} /> Users
                          </button>
                          {!isActive && (
                            <button onClick={() => setConfirmAction({ shopId: shop.id, shopName: shop.name, status: 'ACTIVE' })}
                              disabled={processing === shop.id} title="Activate"
                              style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e', cursor: processing === shop.id ? 'not-allowed' : 'pointer', opacity: processing === shop.id ? 0.6 : 1, display: 'flex', alignItems: 'center', fontSize: '0.75rem', gap: '0.25rem' }}>
                              <Play size={12} /> Activate
                            </button>
                          )}
                          {!isExpired && (
                            <button onClick={() => setConfirmAction({ shopId: shop.id, shopName: shop.name, status: 'EXPIRED' })}
                              disabled={processing === shop.id} title="Expire"
                              style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', cursor: processing === shop.id ? 'not-allowed' : 'pointer', opacity: processing === shop.id ? 0.6 : 1, display: 'flex', alignItems: 'center', fontSize: '0.75rem', gap: '0.25rem' }}>
                              <XCircle size={12} /> Expire
                            </button>
                          )}
                          {!isCancelled && (
                            <button onClick={() => setConfirmAction({ shopId: shop.id, shopName: shop.name, status: 'CANCELLED' })}
                              disabled={processing === shop.id} title="Cancel"
                              style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', cursor: processing === shop.id ? 'not-allowed' : 'pointer', opacity: processing === shop.id ? 0.6 : 1, display: 'flex', alignItems: 'center', fontSize: '0.75rem', gap: '0.25rem' }}>
                              <Ban size={12} /> Cancel
                            </button>
                          )}
                          <button onClick={() => { setDeleteTarget(shop); setDeleteConfirmName(''); }}
                            title="Delete Shop"
                            style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.7rem', gap: '0.2rem', opacity: 0.75 }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
