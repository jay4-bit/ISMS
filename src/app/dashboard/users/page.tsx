'use client';

import { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Key, X, Shield, Check, Save, RotateCcw, Eye, Lock, Plus, Edit } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { MODULES } from '@/lib/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const { shop, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'CASHIER' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [permSelectedRole, setPermSelectedRole] = useState('CASHIER');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [permSaving, setPermSaving] = useState(false);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', color: '#6b7280' });

  const roles = [
    { value: 'OWNER', label: 'Owner', desc: 'Full control of the shop', color: '#ef4444', builtIn: true },
    { value: 'MANAGER', label: 'Manager', desc: 'Can manage inventory and reports', color: '#f59e0b', builtIn: true },
    { value: 'CASHIER', label: 'Cashier', desc: 'Can process sales and returns', color: '#3b82f6', builtIn: true },
    { value: 'PHARMACIST', label: 'Pharmacist', desc: 'For pharmacy shop type', color: '#8b5cf6', builtIn: true },
    { value: 'WINGER', label: 'Winger', desc: 'Can assist sales and inventory', color: '#22c55e', builtIn: true },
    { value: 'ASSISTANT', label: 'Assistant', desc: 'Can process sales and manage stock', color: '#ec4899', builtIn: true },
  ];

  const displayRoles = (() => {
    const builtIn = roles.map(r => ({ ...r, id: r.value }));
    const custom = allRoles.filter((r: any) => !r.builtIn).map((r: any) => ({
      value: r.name,
      label: r.label || r.name,
      desc: r.description || 'Custom role',
      color: r.color || '#6b7280',
      id: r.id,
      builtIn: false,
    }));
    return [...builtIn, ...custom];
  })();

  useEffect(() => { fetchUsers(); if (shop?.id) fetchRoles(); }, [shop]);

  useEffect(() => {
    if (shop?.id && permSelectedRole) fetchPermissions();
  }, [shop?.id, permSelectedRole]);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users', { headers: { 'x-shop-id': shop?.id || '' } });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) { console.error('Failed to fetch users:', error); }
    finally { setLoading(false); }
  }

  async function fetchRoles() {
    try {
      const res = await fetch('/api/roles', { headers: { 'x-shop-id': shop?.id || '' } });
      const data = await res.json();
      setAllRoles(data.roles || []);
    } catch (error) { console.error('Failed to fetch roles:', error); }
  }

  async function fetchPermissions() {
    try {
      const res = await fetch(`/api/permissions?role=${permSelectedRole}`, { headers: { 'x-shop-id': shop?.id || '' } });
      const data = await res.json();
      setPermissions(data.permissions?.length > 0 ? data.permissions : []);
    } catch (error) { console.error('Failed to fetch permissions:', error); }
  }

  function showNotification(message: string, type: 'success' | 'error') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  async function handleCreateUser() {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ ...userForm, actingUserId: user?.id, actingUserName: user?.name }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('User created successfully!', 'success');
        setShowModal(false);
        setUserForm({ name: '', email: '', password: '', role: 'CASHIER' });
        fetchUsers();
      } else {
        showNotification(data.error || 'Failed to create user', 'error');
      }
    } catch (error) { showNotification('Failed to create user', 'error'); }
  }

  function openResetModal(user: User) {
    setResetUser(user); setNewPassword(''); setConfirmPassword(''); setShowResetModal(true);
  }

  async function handleResetPassword() {
    if (!newPassword || !confirmPassword) { showNotification('Please fill in both password fields', 'error'); return; }
    if (newPassword !== confirmPassword) { showNotification('Passwords do not match', 'error'); return; }
    if (newPassword.length < 4) { showNotification('Password must be at least 4 characters', 'error'); return; }
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ id: resetUser?.id, newPassword, name: resetUser?.name }),
      });
      if (res.ok) {
        showNotification('Password reset successfully!', 'success');
        setShowResetModal(false); setResetUser(null);
      } else { const data = await res.json(); showNotification(data.error || 'Failed to reset password', 'error'); }
    } catch (error) { showNotification('Failed to reset password', 'error'); }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE', headers: { 'x-shop-id': shop?.id || '' } });
      if (res.ok) { showNotification('User deleted successfully!', 'success'); fetchUsers(); }
    } catch (error) { showNotification('Failed to delete user', 'error'); }
  }

  async function handleSaveRole() {
    if (!roleForm.name.trim()) { showNotification('Role name is required', 'error'); return; }
    try {
      const res = await fetch('/api/roles', {
        method: editingRole ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify(editingRole
          ? { id: editingRole.id, name: roleForm.name, description: roleForm.description, color: roleForm.color }
          : { name: roleForm.name, description: roleForm.description, color: roleForm.color }),
      });
      if (res.ok) {
        showNotification(editingRole ? 'Role updated!' : 'Role created!', 'success');
        setShowRoleModal(false); fetchRoles();
      } else { const data = await res.json(); showNotification(data.error || 'Failed to save role', 'error'); }
    } catch (error) { showNotification('Failed to save role', 'error'); }
  }

  async function handleDeleteRole(role: any) {
    if (!confirm(`Delete role "${role.label}"? Users with this role will be reassigned to CASHIER.`)) return;
    try {
      const res = await fetch(`/api/roles?id=${role.id}`, { method: 'DELETE', headers: { 'x-shop-id': shop?.id || '' } });
      if (res.ok) {
        showNotification('Role deleted', 'success');
        fetchRoles(); fetchUsers();
      }
    } catch (error) { showNotification('Failed to delete role', 'error'); }
  }

  function getPermission(moduleId: string): any {
    return permissions.find((p: any) => p.role === permSelectedRole && p.module === moduleId) || {
      role: permSelectedRole, module: moduleId, canRead: false, canWrite: false, canDelete: false,
    };
  }

  function updatePermission(moduleId: string, field: string, value: boolean) {
    setPermissions((prev: any[]) => {
      const existing = prev.findIndex((p: any) => p.role === permSelectedRole && p.module === moduleId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], [field]: value };
        return updated;
      }
      return [...prev, { role: permSelectedRole, module: moduleId, canRead: false, canWrite: false, canDelete: false, [field]: value }];
    });
  }

  async function savePermissions() {
    setPermSaving(true);
    try {
      const rolePermissions = permissions.filter((p: any) => p.role === permSelectedRole);
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ role: permSelectedRole, permissions: rolePermissions }),
      });
      if (res.ok) {
        showNotification('Permissions saved successfully!', 'success');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to save permissions', 'error');
      }
    } catch (error) { showNotification('Failed to save permissions', 'error'); }
    finally { setPermSaving(false); }
  }

  async function resetRolePermissions() {
    if (!confirm(`Reset permissions for ${displayRoles.find(r => r.value === permSelectedRole)?.label} to defaults?`)) return;
    try {
      const res = await fetch(`/api/permissions?role=${permSelectedRole}`, { method: 'PUT', headers: { 'x-shop-id': shop?.id || '' } });
      if (res.ok) { showNotification('Permissions reset to defaults', 'success'); setPermissions([]); }
    } catch (error) { showNotification('Failed to reset permissions', 'error'); }
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      OWNER: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
      MANAGER: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
      CASHIER: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
      PHARMACIST: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' },
      WINGER: { bg: 'rgba(139, 92, 246, 0.2)', text: '#8b5cf6' },
      ASSISTANT: { bg: 'rgba(236, 72, 153, 0.2)', text: '#ec4899' },
    };
    return colors[role] || { bg: 'rgba(107, 114, 128, 0.2)', text: '#6b7280' };
  };

  if (loading && activeTab === 'users') return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div className="users-page" style={{ padding: '1.5rem' }}>
      {notification && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem', color: 'white', fontWeight: '500', zIndex: 1000,
          background: notification.type === 'success' ? '#22c55e' : '#ef4444',
        }}>
          {notification.message}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={28} /> User Management
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Manage users, roles and permissions</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => setActiveTab('users')} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem',
          background: activeTab === 'users' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'var(--card)',
          border: '1px solid var(--border)', borderRadius: '0.5rem',
          color: activeTab === 'users' ? 'white' : 'var(--muted-foreground)',
          cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem',
        }}><Users size={16} /> Users</button>
        <button onClick={() => setActiveTab('permissions')} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem',
          background: activeTab === 'permissions' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'var(--card)',
          border: '1px solid var(--border)', borderRadius: '0.5rem',
          color: activeTab === 'permissions' ? 'white' : 'var(--muted-foreground)',
          cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem',
        }}><Shield size={16} /> Permissions</button>
      </div>

      {activeTab === 'users' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button onClick={() => setShowModal(true)} className="add-user-btn" style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
              background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem',
              fontWeight: '500', cursor: 'pointer',
            }}><UserPlus size={18} /> Add User</button>
          </div>

          <div className="users-table-wrap table-responsive" style={{ background: 'var(--card)', borderRadius: '0.75rem', overflow: 'auto' }}>
            {users.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No users found</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead>
                  <tr style={{ background: 'var(--background)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.8rem' }}>USER</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.8rem' }}>EMAIL</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.8rem' }}>ROLE</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.8rem' }}>CREATED</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.8rem' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const roleStyle = getRoleColor(u.role);
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: '500' }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--muted-foreground)' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', background: roleStyle.bg, color: roleStyle.text }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => openResetModal(u)} className="reset-pwd-btn" style={{ padding: '0.35rem', background: 'transparent', border: '1px solid #3b82f6', borderRadius: '0.375rem', color: '#3b82f6', cursor: 'pointer' }} title="Reset Password"><Key size={16} /></button>
                            <button onClick={() => handleDeleteUser(u.id)} className="delete-btn" style={{ padding: '0.35rem', background: 'transparent', border: '1px solid #ef4444', borderRadius: '0.375rem', color: '#ef4444', cursor: 'pointer' }} title="Delete User"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'permissions' && (
        <div style={{ background: 'var(--card)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Shield size={20} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>Role Permissions</h2>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {displayRoles.map(role => (
              <button
                key={role.value}
                onClick={() => setPermSelectedRole(role.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem',
                  borderRadius: '0.75rem', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s',
                  textAlign: 'left', flex: '1', minWidth: '180px',
                  background: permSelectedRole === role.value ? `${role.color}15` : 'transparent',
                  borderColor: permSelectedRole === role.value ? role.color : 'var(--border)',
                  position: 'relative',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: role.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '1rem', flexShrink: 0 }}>
                  {role.label.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: 'var(--foreground)', fontSize: '0.9rem' }}>{role.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.1rem' }}>{role.desc}</div>
                </div>
                {permSelectedRole === role.value && <Check size={16} color={role.color} />}
                {!role.builtIn && (
                  <div onClick={(e) => { e.stopPropagation(); setEditingRole(allRoles.find((r: any) => r.name === role.value)); setRoleForm({ name: role.name, description: role.desc === 'Custom role' ? '' : role.desc, color: role.color }); setShowRoleModal(true); }}
                    style={{ position: 'absolute', top: '2px', right: '2px', cursor: 'pointer', padding: '2px', color: '#94a3b8', lineHeight: 1 }} title="Edit role">
                    <Edit size={12} />
                  </div>
                )}
              </button>
            ))}
            <button onClick={() => { setEditingRole(null); setRoleForm({ name: '', description: '', color: '#6b7280' }); setShowRoleModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '2px dashed var(--border)', cursor: 'pointer', textAlign: 'left', flex: '1', minWidth: '120px', justifyContent: 'center', background: 'transparent', color: 'var(--muted-foreground)' }}>
              <Plus size={18} /><span>Add Role</span>
            </button>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.75rem 1rem', background: 'var(--background)', borderBottom: '1px solid var(--border)', fontWeight: '600', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
              <div>Module</div>
              <div style={{ textAlign: 'center' }}>Read</div>
              <div style={{ textAlign: 'center' }}>Write</div>
              <div style={{ textAlign: 'center' }}>Delete</div>
            </div>
            {MODULES.map(module => {
              const perm = getPermission(module.id);
              return (
                <div key={module.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--foreground)', fontSize: '0.9rem' }}>{module.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{module.description}</div>
                  </div>
                  {(['canRead', 'canWrite', 'canDelete'] as const).map(field => (
                    <div key={field} style={{ display: 'flex', justifyContent: 'center' }}>
                      <label style={{ position: 'relative', display: 'inline-block', width: '22px', height: '22px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={perm[field]} onChange={(e) => updatePermission(module.id, field, e.target.checked)}
                          style={{ opacity: 0, width: '22px', height: '22px', cursor: 'pointer', position: 'absolute', margin: 0 }} />
                        <span style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          background: perm[field] ? 'var(--success)' : 'var(--background)',
                          border: `2px solid ${perm[field] ? 'var(--success)' : 'var(--border)'}`,
                          borderRadius: '0.25rem', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {perm[field] && <Check size={14} color="white" />}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button onClick={savePermissions} disabled={permSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer', fontWeight: '600' }}>
              <Save size={18} /> {permSaving ? 'Saving...' : 'Save Permissions'}
            </button>
            <button onClick={resetRolePermissions} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', background: 'var(--card)', border: '1px solid #475569', borderRadius: '0.5rem', color: 'var(--foreground)', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' }}>
              <RotateCcw size={16} /> Reset to Defaults
            </button>
            <button onClick={() => { MODULES.forEach(m => updatePermission(m.id, 'canRead', true)); MODULES.forEach(m => updatePermission(m.id, 'canWrite', true)); MODULES.forEach(m => updatePermission(m.id, 'canDelete', false)); }} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', background: 'var(--card)', border: 'none', borderRadius: '0.5rem', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.8rem' }}>
              <Eye size={16} /> Read & Write
            </button>
            <button onClick={() => { MODULES.forEach(m => updatePermission(m.id, 'canRead', true)); MODULES.forEach(m => updatePermission(m.id, 'canWrite', false)); MODULES.forEach(m => updatePermission(m.id, 'canDelete', false)); }} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', background: 'var(--card)', border: 'none', borderRadius: '0.5rem', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.8rem' }}>
              <Eye size={16} /> Read Only
            </button>
            <button onClick={() => { MODULES.forEach(m => updatePermission(m.id, 'canRead', false)); MODULES.forEach(m => updatePermission(m.id, 'canWrite', false)); MODULES.forEach(m => updatePermission(m.id, 'canDelete', false)); }} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', background: 'var(--card)', border: 'none', borderRadius: '0.5rem', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.8rem' }}>
              <Lock size={16} /> No Access
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '0.75rem', padding: '1.5rem', width: '400px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Add New User</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Name</label>
                <input type="text" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} style={inputStyle} placeholder="Enter name" /></div>
              <div><label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Email</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} style={inputStyle} placeholder="Enter email" /></div>
              <div><label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Password</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} style={inputStyle} placeholder="Enter password" /></div>
              <div><label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Role</label>
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} style={inputStyle}>
                  {roles.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleCreateUser} style={submitBtnStyle}>Create User</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && resetUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowResetModal(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '0.75rem', padding: '1.5rem', width: '400px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Reset Password</h2>
              <button onClick={() => setShowResetModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>Reset password for {resetUser.name}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} placeholder="Enter new password" /></div>
              <div><label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="Confirm password" /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowResetModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleResetPassword} style={submitBtnStyle}>Reset Password</button>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setShowRoleModal(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>{editingRole ? 'Edit Role' : 'Create Custom Role'}</h2>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.25rem' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Role Name *</label>
                <input type="text" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} placeholder="e.g., SUPERVISOR, STOCK_MANAGER" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Description</label>
                <input type="text" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} placeholder="Brief description of this role" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="color" value={roleForm.color} onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })} style={{ width: '48px', height: '48px', borderRadius: '0.5rem', border: '1px solid var(--border)', cursor: 'pointer', padding: 0 }} />
                  <input type="text" value={roleForm.color} onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} placeholder="#6b7280" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={handleSaveRole} style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Save size={16} /> {editingRole ? 'Update Role' : 'Create Role'}
                </button>
                {editingRole && (
                  <button onClick={() => handleDeleteRole(editingRole)} style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Trash2 size={16} /> Delete Role
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '0.5rem 0.75rem', background: 'var(--background)',
  border: '1px solid #334155', borderRadius: '0.375rem', color: 'var(--foreground)', fontSize: '0.9rem',
  boxSizing: 'border-box' as const,
};

const cancelBtnStyle = {
  padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #475569',
  borderRadius: '0.375rem', color: 'var(--muted-foreground)', cursor: 'pointer',
};

const submitBtnStyle = {
  padding: '0.5rem 1rem', background: '#3b82f6', border: 'none',
  borderRadius: '0.375rem', color: 'white', cursor: 'pointer', fontWeight: '500',
};
