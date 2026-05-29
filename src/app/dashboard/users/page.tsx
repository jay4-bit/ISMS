'use client';

import { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Key, Edit, X, Shield, Check } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const { shop } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CASHIER',
  });
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => { fetchUsers(); }, [shop]);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users', {
        headers: { 'x-shop-id': shop?.id || '' }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
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
        body: JSON.stringify(userForm),
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
    } catch (error) {
      showNotification('Failed to create user', 'error');
    }
  }

  function openResetModal(user: User) {
    setResetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowResetModal(true);
  }

  async function handleResetPassword() {
    if (!newPassword || !confirmPassword) {
      showNotification('Please fill in both password fields', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 4) {
      showNotification('Password must be at least 4 characters', 'error');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ 
          id: resetUser?.id, 
          newPassword,
          name: resetUser?.name 
        })
      });
      if (res.ok) {
        showNotification('Password reset successfully!', 'success');
        setShowResetModal(false);
        setResetUser(null);
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to reset password', 'error');
      }
    } catch (error) {
      showNotification('Failed to reset password', 'error');
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { 
        method: 'DELETE',
        headers: { 'x-shop-id': shop?.id || '' }
      });
      if (res.ok) {
        showNotification('User deleted successfully!', 'success');
        fetchUsers();
      }
    } catch (error) {
      showNotification('Failed to delete user', 'error');
    }
  }

  const roles = [
    { value: 'OWNER', label: 'Owner', desc: 'Full control of the shop' },
    { value: 'MANAGER', label: 'Manager', desc: 'Can manage inventory and reports' },
    { value: 'CASHIER', label: 'Cashier', desc: 'Can process sales and returns' },
    { value: 'PHARMACIST', label: 'Pharmacist', desc: 'For pharmacy shop type' },
    { value: 'WINGER', label: 'Winger', desc: 'Can assist sales and inventory' },
    { value: 'ASSISTANT', label: 'Assistant', desc: 'Can process sales and manage stock' },
  ];

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

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '1.5rem' }}>
      {notification && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          color: 'white',
          fontWeight: '500',
          zIndex: 1000,
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
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>Manage users and roles for this shop</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          <UserPlus size={18} /> Add User
        </button>
      </div>

      <div className="table-responsive" style={{
        background: '#1e293b',
        borderRadius: '0.75rem',
        overflow: 'auto',
      }}>
        {users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No users found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#94a3b8', fontWeight: '600', fontSize: '0.8rem' }}>USER</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#94a3b8', fontWeight: '600', fontSize: '0.8rem' }}>EMAIL</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#94a3b8', fontWeight: '600', fontSize: '0.8rem' }}>ROLE</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#94a3b8', fontWeight: '600', fontSize: '0.8rem' }}>CREATED</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#94a3b8', fontWeight: '600', fontSize: '0.8rem' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const roleStyle = getRoleColor(user.role);
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                        }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '500' }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>{user.email}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: roleStyle.bg,
                        color: roleStyle.text,
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openResetModal(user)}
                          style={{
                            padding: '0.35rem',
                            background: 'transparent',
                            border: '1px solid #3b82f6',
                            borderRadius: '0.375rem',
                            color: '#3b82f6',
                            cursor: 'pointer',
                          }}
                          title="Reset Password"
                        >
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          style={{
                            padding: '0.35rem',
                            background: 'transparent',
                            border: '1px solid #ef4444',
                            borderRadius: '0.375rem',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#1e293b',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            width: '400px',
            maxWidth: '90vw',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Add New User</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Name</label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  style={inputStyle}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  style={inputStyle}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Password</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  style={inputStyle}
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Role</label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  style={inputStyle}
                >
                  {roles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleCreateUser} style={submitBtnStyle}>Create User</button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && resetUser && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }} onClick={() => setShowResetModal(false)}>
          <div style={{
            background: '#1e293b',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            width: '400px',
            maxWidth: '90vw',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Reset Password</h2>
              <button onClick={() => setShowResetModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Reset password for {resetUser.name}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowResetModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleResetPassword} style={submitBtnStyle}>Reset Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '0.375rem',
  color: '#f1f5f9',
  fontSize: '0.9rem',
};

const cancelBtnStyle = {
  padding: '0.5rem 1rem',
  background: 'transparent',
  border: '1px solid #475569',
  borderRadius: '0.375rem',
  color: '#94a3b8',
  cursor: 'pointer',
};

const submitBtnStyle = {
  padding: '0.5rem 1rem',
  background: '#3b82f6',
  border: 'none',
  borderRadius: '0.375rem',
  color: 'white',
  cursor: 'pointer',
  fontWeight: '500',
};