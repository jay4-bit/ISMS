'use client';

import React, { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon, Building2, Phone, Mail, MapPin, DollarSign, 
  Users, UserPlus, Edit, Trash2, X, Save, Bell, Shield, Palette,
  Check, AlertTriangle, Key, User, Sun, Moon, RotateCcw,
  Eye, Lock, Plus, Clock, CalendarDays, Upload, Image as ImageIcon, Database, Download
} from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';
import { CURRENCIES, useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/context/ThemeContext';
import { MODULES } from '@/lib/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Settings {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  lowStockAlert: boolean;
  expiryAlert: boolean;
  expiryAlertDays: number;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'business' | 'users' | 'alerts' | 'permissions' | 'types' | 'profile' | 'theme' | 'reminders' | 'data'>('business');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { refreshSettings } = useSettings();
  const { logo } = useSettings();
  const { user: authUser, shop } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  
  const [settings, setSettings] = useState<Settings>({
    businessName: 'ISMS Pro Shop',
    businessPhone: '+255 700 000 000',
    businessEmail: 'info@ismspro.co.tz',
    businessAddress: 'Mwanza, Tanzania',
    currency: 'TZS',
    currencySymbol: 'TSh',
    taxRate: 0,
    lowStockAlert: true,
    expiryAlert: true,
    expiryAlertDays: 7,
  });

  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'CASHIER',
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState<{id: string; name: string; email: string} | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [permSelectedRole, setPermSelectedRole] = useState('CASHIER');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [permSaving, setPermSaving] = useState(false);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', color: '#6b7280' });

  const [reminders, setReminders] = useState<any[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any>(null);
  const [reminderForm, setReminderForm] = useState({ title: '', description: '', dueDate: '' });

  const [deleteStep, setDeleteStep] = useState<'idle' | 'code-sent' | 'verifying' | 'done'>('idle');
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { if (shop?.id) { fetchData(); fetchRoles(); fetchReminders(); } }, [shop?.id]);

  async function fetchData() {
    try {
      const headers = { 'x-shop-id': shop?.id || '' };
      const [usersRes, settingsRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/settings', { headers })
      ]);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.settings) {
          setSettings(prev => ({ ...prev, ...settingsData.settings }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  function showNotification(message: string, type: 'success' | 'error') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  async function handleSaveSettings() {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
        showNotification('Settings saved successfully!', 'success');
        refreshSettings();
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          showNotification(data.error || 'Failed to save settings', 'error');
        } catch {
          showNotification('Failed to save settings', 'error');
        }
      }
    } catch (error) {
      showNotification('Failed to save settings', 'error');
    }
  }

  async function handleCreateUser() {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify(userForm),
      });
      if (res.ok) {
        showNotification('User created successfully!', 'success');
        setShowUserModal(false);
        setUserForm({ name: '', username: '', email: '', password: '', role: 'CASHIER' });
        fetchData();
      } else {
        const data = await res.json();
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

  useEffect(() => {
    if (authUser) {
      setProfileForm({ name: authUser.name || '', phone: '' });
    }
  }, [authUser]);

  async function handleSaveProfile() {
    if (!profileForm.name.trim()) { showNotification('Name is required', 'error'); return; }
    setProfileSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ name: profileForm.name, id: authUser?.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        showNotification('Profile updated successfully!', 'success');
      } else {
        showNotification('Failed to update profile', 'error');
      }
    } catch (error) {
      showNotification('Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showNotification('Please fill in all password fields', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 4) {
      showNotification('Password must be at least 4 characters', 'error');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({
          id: authUser?.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (res.ok) {
        showNotification('Password changed successfully!', 'success');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to change password', 'error');
      }
    } catch (error) {
      showNotification('Failed to change password', 'error');
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE', headers: { 'x-shop-id': shop?.id || '' } });
      if (res.ok) {
        showNotification('User deleted successfully!', 'success');
        fetchData();
      }
    } catch (error) {
      showNotification('Failed to delete user', 'error');
    }
  }

  async function fetchRoles() {
    try {
      const res = await fetch('/api/roles', { headers: { 'x-shop-id': shop?.id || '' } });
      const data = await res.json();
      setAllRoles(data.roles || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }

  function openRoleModal(role?: any) {
    if (role && !role.builtIn) {
      setEditingRole(role);
      setRoleForm({ name: role.name, description: role.description || '', color: role.color || '#6b7280' });
    } else {
      setEditingRole(null);
      setRoleForm({ name: '', description: '', color: '#6b7280' });
    }
    setShowRoleModal(true);
  }

  async function handleSaveRole() {
    if (!roleForm.name.trim()) { showNotification('Role name is required', 'error'); return; }
    try {
      const url = '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';
      const body = editingRole
        ? { id: editingRole.id, name: roleForm.name, description: roleForm.description, color: roleForm.color }
        : { name: roleForm.name, description: roleForm.description, color: roleForm.color };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showNotification(editingRole ? 'Role updated!' : 'Role created!', 'success');
        setShowRoleModal(false);
        fetchRoles();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to save role', 'error');
      }
    } catch (error) {
      showNotification('Failed to save role', 'error');
    }
  }

  async function handleDeleteRole(role: any) {
    if (!confirm(`Delete role "${role.label}"? Users with this role will be reassigned to CASHIER.`)) return;
    try {
      const res = await fetch(`/api/roles?id=${role.id}`, { method: 'DELETE', headers: { 'x-shop-id': shop?.id || '' } });
      if (res.ok) {
        showNotification('Role deleted', 'success');
        if (permSelectedRole === role.name) setPermSelectedRole('CASHIER');
        fetchRoles();
        fetchData();
      }
    } catch (error) {
      showNotification('Failed to delete role', 'error');
    }
  }

  async function handleUpdateUserRole(userId: string, newRole: string) {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (res.ok) {
        showNotification('User role updated', 'success');
        fetchData();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to update role', 'error');
      }
    } catch (error) {
      showNotification('Failed to update role', 'error');
    }
  }

  async function fetchReminders() {
    try {
      const res = await fetch('/api/reminders', { headers: { 'x-shop-id': shop?.id || '' } });
      const data = await res.json();
      setReminders(data.reminders || []);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    }
  }

  function openReminderModal(reminder?: any) {
    if (reminder) {
      setEditingReminder(reminder);
      setReminderForm({
        title: reminder.title,
        description: reminder.description || '',
        dueDate: reminder.dueDate ? new Date(reminder.dueDate).toISOString().slice(0, 16) : '',
      });
    } else {
      setEditingReminder(null);
      setReminderForm({ title: '', description: '', dueDate: '' });
    }
    setShowReminderModal(true);
  }

  async function handleSaveReminder() {
    if (!reminderForm.title.trim()) { showNotification('Title is required', 'error'); return; }
    try {
      const url = '/api/reminders';
      const method = editingReminder ? 'PUT' : 'POST';
      const body = editingReminder
        ? { id: editingReminder.id, title: reminderForm.title, description: reminderForm.description, dueDate: reminderForm.dueDate || null }
        : { title: reminderForm.title, description: reminderForm.description, dueDate: reminderForm.dueDate || null };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showNotification(editingReminder ? 'Reminder updated!' : 'Reminder created!', 'success');
        setShowReminderModal(false);
        fetchReminders();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to save reminder', 'error');
      }
    } catch (error) {
      showNotification('Failed to save reminder', 'error');
    }
  }

  async function handleDeleteReminder(id: string) {
    if (!confirm('Delete this reminder?')) return;
    try {
      const res = await fetch(`/api/reminders?id=${id}`, { method: 'DELETE', headers: { 'x-shop-id': shop?.id || '' } });
      if (res.ok) {
        showNotification('Reminder deleted', 'success');
        fetchReminders();
      }
    } catch (error) {
      showNotification('Failed to delete reminder', 'error');
    }
  }

  async function handleToggleReminder(reminder: any) {
    try {
      const res = await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ id: reminder.id, isActive: !reminder.isActive }),
      });
      if (res.ok) fetchReminders();
    } catch (error) {
      console.error('Toggle reminder error:', error);
    }
  }

  const tabs = [
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'types', label: 'Business Types', icon: Palette },
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'reminders', label: 'Reminders', icon: Clock },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'theme', label: 'Theme', icon: Sun },
    ...(authUser?.role === 'OWNER' ? [{ id: 'data' as const, label: 'Data', icon: Database }] : []),
  ];

  const roles = [
    { value: 'OWNER', label: 'Owner', desc: 'Full control of the shop', color: '#ef4444', builtIn: true },
    { value: 'MANAGER', label: 'Manager', desc: 'Can manage inventory and reports', color: '#f59e0b', builtIn: true },
    { value: 'CASHIER', label: 'Cashier', desc: 'Can process sales and returns', color: '#3b82f6', builtIn: true },
    { value: 'PHARMACIST', label: 'Pharmacist', desc: 'For pharmacy shop type', color: '#8b5cf6', builtIn: true },
    { value: 'WINGER', label: 'Winger', desc: 'Can assist sales and inventory', color: '#22c55e', builtIn: true },
    { value: 'ASSISTANT', label: 'Assistant', desc: 'Can process sales and manage stock', color: '#ec4899', builtIn: true },
  ];

  const displayRoles = React.useMemo(() => {
    const builtIn = roles.map(r => ({ ...r, id: r.value }));
    const custom = allRoles.filter(r => !r.builtIn).map(r => ({
      value: r.name,
      label: r.label || r.name,
      desc: r.description || 'Custom role',
      color: r.color || '#6b7280',
      id: r.id,
      builtIn: false,
    }));
    return [...builtIn, ...custom];
  }, [allRoles]);

  useEffect(() => {
    if (shop?.id && permSelectedRole) fetchPermissions();
  }, [shop?.id, permSelectedRole]);

  async function fetchPermissions() {
    try {
      const res = await fetch(`/api/permissions?role=${permSelectedRole}`, {
        headers: { 'x-shop-id': shop?.id || '' },
      });
      const data = await res.json();
      if (data.permissions?.length > 0) {
        setPermissions(data.permissions);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  }

  function getPermission(moduleId: string): any {
    return permissions.find((p: any) => p.role === permSelectedRole && p.module === moduleId) || {
      role: permSelectedRole,
      module: moduleId,
      canRead: false,
      canWrite: false,
      canDelete: false,
    };
  }

  function updatePermission(moduleId: string, field: string, value: boolean) {
    setPermissions((prev: any[]) => {
      const existing = prev.findIndex((p: any) => p.role === permSelectedRole && p.module === moduleId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], [field]: value };
        return updated;
      } else {
        return [...prev, { role: permSelectedRole, module: moduleId, canRead: false, canWrite: false, canDelete: false, [field]: value }];
      }
    });
  }

  async function savePermissions() {
    setPermSaving(true);
    try {
      const rolePermissions = permissions.filter((p: any) => p.role === permSelectedRole);
      console.log('Saving permissions:', { role: permSelectedRole, count: rolePermissions.length, data: rolePermissions });
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ role: permSelectedRole, permissions: rolePermissions }),
      });
      let errorMsg = 'Failed to save permissions';
      try {
        const data = await res.json();
        if (data.error) errorMsg = data.error;
      } catch {
        const text = await res.text();
        errorMsg = `Server error (${res.status}): ${text.substring(0, 200)}`;
      }
      if (res.ok) {
        showNotification('Permissions saved successfully!', 'success');
      } else {
        showNotification(errorMsg, 'error');
      }
    } catch (error) {
      showNotification('Failed to save permissions', 'error');
    } finally {
      setPermSaving(false);
    }
  }

  async function resetRolePermissions() {
    if (!confirm(`Reset permissions for ${displayRoles.find(r => r.value === permSelectedRole)?.label} to defaults?`)) return;
    try {
      const res = await fetch(`/api/permissions?role=${permSelectedRole}`, {
        method: 'PUT',
        headers: { 'x-shop-id': shop?.id || '' },
      });
      if (res.ok) {
        showNotification('Permissions reset to defaults', 'success');
        setPermissions([]);
      }
    } catch (error) {
      showNotification('Failed to reset permissions', 'error');
    }
  }

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container} className="settings-container">
      {notification && (
        <div style={{ ...styles.notification, background: notification.type === 'success' ? 'var(--success)' : 'var(--destructive)' }}>
          {notification.message}
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}><SettingsIcon size={28} /> Settings</h1>
          <p style={styles.subtitle}>Manage your business settings and user accounts</p>
        </div>
      </div>

      <div style={styles.tabs} className="settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className="settings-tab"
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.content} className="settings-content">
        {activeTab === 'business' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader} className="settings-section-header">
              <Building2 size={20} />
              <h2>Business Information</h2>
            </div>

            <div style={styles.logoSection}>
              <div style={styles.logoPreview}>
                {logo ? (
                  <img src={logo} alt="Shop logo" style={styles.logoImg} />
                ) : (
                  <div style={styles.logoPlaceholder}>
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>
              <div style={styles.logoActions}>
                <label style={styles.logoUploadLabel}>
                  <Upload size={16} /> Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const base64 = reader.result as string;
                        const res = await fetch('/api/upload', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
                          body: JSON.stringify({ image: base64 }),
                        });
                        if (res.ok) {
                          refreshSettings();
                          showNotification('Logo uploaded successfully!', 'success');
                        } else {
                          showNotification('Failed to upload logo', 'error');
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {logo && (
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/upload', {
                        method: 'DELETE',
                        headers: { 'x-shop-id': shop?.id || '' },
                      });
                      if (res.ok) {
                        refreshSettings();
                        showNotification('Logo removed', 'success');
                      }
                    }}
                    style={styles.logoRemoveBtn}
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                )}
              </div>
            </div>

            <div style={styles.grid} className="settings-grid">
              <div style={styles.field}>
                <label style={styles.label}>Business Name</label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Phone Number</label>
                  <input
                    type="text"
                    value={settings.businessPhone ?? ''}
                    onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={settings.businessEmail ?? ''}
                    onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Address</label>
                  <input
                    type="text"
                    value={settings.businessAddress ?? ''}
                    onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                    style={styles.input}
                  />
              </div>
            </div>

            <div style={{ ...styles.sectionHeader, marginTop: '2rem' }}>
              <DollarSign size={20} />
              <h2>Currency & Tax</h2>
            </div>
              <div style={styles.grid} className="settings-grid">
              <div style={styles.field}>
                <label style={styles.label}>Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => {
                    const selected = CURRENCIES.find(c => c.code === e.target.value);
                    setSettings({ 
                      ...settings, 
                      currency: e.target.value,
                      currencySymbol: selected?.symbol || 'TSh'
                    });
                  }}
                  style={styles.select}
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.name} ({currency.symbol}) - {currency.code}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Tax Rate (%)</label>
                <input
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
                  style={styles.input}
                />
              </div>
            </div>

            <button onClick={handleSaveSettings} style={styles.saveBtn}>
              <Save size={18} /> Save Settings
            </button>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader} className="settings-section-header">
              <Users size={20} />
              <h2>User Management</h2>
              <button onClick={() => setShowUserModal(true)} style={styles.addBtn}>
                <UserPlus size={18} /> Add User
              </button>
            </div>

            <div style={styles.usersList}>
              {users.map(user => {
                const userRole = displayRoles.find(r => r.value === user.role) || { label: user.role, color: '#6b7280' };
                return (
                <div key={user.id} style={styles.userCard} className="settings-user-card">
                  <div style={styles.userAvatar}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.userInfo}>
                    <div style={styles.userName}>{user.name}</div>
                    <div style={styles.userEmail}>{user.email}</div>
                  </div>
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                    style={{
                      ...styles.userRoleSelect,
                      background: `${userRole.color}20`,
                      color: userRole.color,
                      border: `1px solid ${userRole.color}40`,
                    }}
                  >
                    {displayRoles.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => openResetModal(user)}
                    style={{ ...styles.deleteBtn, color: 'var(--primary)', border: '1px solid #3b82f6' }}
                    title="Reset Password"
                  >
                    <Key size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    style={styles.deleteBtn}
                    title="Delete User"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                );
              })}
            </div>

            <div style={styles.rolesInfo}>
              <h3><Shield size={18} /> Role Permissions</h3>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Configure module access for each role. Go to Settings → Permissions for full configuration.
              </p>
              <div style={styles.rolesGrid}>
                {displayRoles.map(role => (
                  <div key={role.value} style={styles.roleCard}>
                    <div style={styles.roleName}>{role.label}</div>
                    <div style={styles.roleDesc}>{role.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader} className="settings-section-header">
              <Shield size={20} />
              <h2>Role Permissions</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', margin: 0 }}>
                Configure what each role can access
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {displayRoles.map(role => (
                <button
                  key={role.value}
                  onClick={() => setPermSelectedRole(role.value)}
                  style={{
                    ...permStyles.roleBtn,
                    borderColor: permSelectedRole === role.value ? role.color : 'var(--border)',
                    background: permSelectedRole === role.value ? `${role.color}15` : 'transparent',
                    position: 'relative',
                  }}
                >
                  <div style={{ ...permStyles.roleBadge, background: role.color }}>{role.label.charAt(0)}</div>
                  <div style={permStyles.roleInfo}>
                    <div style={permStyles.roleName}>{role.label}</div>
                    <div style={permStyles.roleDesc}>{role.desc}</div>
                  </div>
                  {permSelectedRole === role.value && <Check size={16} color={role.color} />}
                  {!role.builtIn && (
                    <div
                      onClick={(e) => { e.stopPropagation(); openRoleModal(allRoles.find(r => r.name === role.value)); }}
                      style={{ position: 'absolute', top: '2px', right: '2px', cursor: 'pointer', padding: '2px', color: '#94a3b8', lineHeight: 1 }}
                      title="Edit role"
                    >
                      <Edit size={12} />
                    </div>
                  )}
                </button>
              ))}
              <button
                onClick={() => { setEditingRole(null); setRoleForm({ name: '', description: '', color: '#6b7280' }); setShowRoleModal(true); }}
                style={{
                  ...permStyles.roleBtn,
                  borderColor: 'var(--border)',
                  borderStyle: 'dashed',
                  minWidth: '120px',
                  justifyContent: 'center',
                }}
              >
                <Plus size={18} />
                <span>Add Role</span>
              </button>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem',
                padding: '0.75rem 1rem', background: 'var(--background)',
                borderBottom: '1px solid var(--border)', fontWeight: '600',
                color: 'var(--muted-foreground)', fontSize: '0.8rem'
              }}>
                <div>Module</div>
                <div style={{ textAlign: 'center' }}>Read</div>
                <div style={{ textAlign: 'center' }}>Write</div>
                <div style={{ textAlign: 'center' }}>Delete</div>
              </div>
              {MODULES.map(module => {
                const perm = getPermission(module.id);
                return (
                  <div key={module.id} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem',
                    padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--foreground)', fontSize: '0.9rem' }}>{module.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{module.description}</div>
                    </div>
                    {(['canRead', 'canWrite', 'canDelete'] as const).map(field => (
                      <div key={field} style={{ display: 'flex', justifyContent: 'center' }}>
                        <label style={permStyles.checkbox}>
                          <input
                            type="checkbox"
                            checked={perm[field]}
                            onChange={(e) => updatePermission(module.id, field, e.target.checked)}
                            style={permStyles.checkboxInput}
                          />
                          <span style={{
                            ...permStyles.checkboxMark,
                            ...(perm[field] ? permStyles.checkboxChecked : {}),
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
              <button onClick={savePermissions} disabled={permSaving} style={permStyles.saveBtn}>
                <Save size={18} /> {permSaving ? 'Saving...' : 'Save Permissions'}
              </button>
              <button onClick={resetRolePermissions} style={permStyles.resetBtn}>
                <RotateCcw size={16} /> Reset to Defaults
              </button>
              <button onClick={() => {
                MODULES.forEach(m => updatePermission(m.id, 'canRead', true));
                MODULES.forEach(m => updatePermission(m.id, 'canWrite', true));
                MODULES.forEach(m => updatePermission(m.id, 'canDelete', false));
              }} style={permStyles.quickBtn}>
                <Eye size={16} /> Read & Write
              </button>
              <button onClick={() => {
                MODULES.forEach(m => updatePermission(m.id, 'canRead', true));
                MODULES.forEach(m => updatePermission(m.id, 'canWrite', false));
                MODULES.forEach(m => updatePermission(m.id, 'canDelete', false));
              }} style={permStyles.quickBtn}>
                <Eye size={16} /> Read Only
              </button>
              <button onClick={() => {
                MODULES.forEach(m => updatePermission(m.id, 'canRead', false));
                MODULES.forEach(m => updatePermission(m.id, 'canWrite', false));
                MODULES.forEach(m => updatePermission(m.id, 'canDelete', false));
              }} style={permStyles.quickBtn}>
                <Lock size={16} /> No Access
              </button>
            </div>
          </div>
        )}

        {activeTab === 'types' && (
          <BusinessTypesSection />
        )}

        {activeTab === 'alerts' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader} className="settings-section-header">
              <Bell size={20} />
              <h2>Alert Settings</h2>
            </div>

            <div style={styles.alertCard} className="settings-alert-card">
              <div style={styles.alertInfo}>
                <div style={styles.alertTitle}>Low Stock Alert</div>
                <div style={styles.alertDesc}>Get notified when products are running low</div>
              </div>
              <label style={{ ...styles.toggle }}>
                <input
                  type="checkbox"
                  checked={settings.lowStockAlert}
                  onChange={(e) => setSettings({ ...settings, lowStockAlert: e.target.checked })}
                  style={styles.toggleInput}
                />
                <span style={{ ...styles.toggleSlider, background: settings.lowStockAlert ? '#3b82f6' : 'var(--border)' }} />
                <span style={{ ...styles.toggleKnob, transform: settings.lowStockAlert ? 'translateX(24px)' : 'translateX(0)' }} />
              </label>
            </div>

            <div style={styles.alertCard} className="settings-alert-card">
              <div style={styles.alertInfo}>
                <div style={styles.alertTitle}>Expiry Alert</div>
                <div style={styles.alertDesc}>Get notified before products expire</div>
              </div>
              <label style={{ ...styles.toggle }}>
                <input
                  type="checkbox"
                  checked={settings.expiryAlert}
                  onChange={(e) => setSettings({ ...settings, expiryAlert: e.target.checked })}
                  style={styles.toggleInput}
                />
                <span style={{ ...styles.toggleSlider, background: settings.expiryAlert ? '#3b82f6' : 'var(--border)' }} />
                <span style={{ ...styles.toggleKnob, transform: settings.expiryAlert ? 'translateX(24px)' : 'translateX(0)' }} />
              </label>
            </div>

            {settings.expiryAlert && (
              <div style={styles.field}>
                <label style={styles.label}>Alert Days Before Expiry</label>
                <input
                  type="number"
                  value={settings.expiryAlertDays}
                  onChange={(e) => setSettings({ ...settings, expiryAlertDays: parseInt(e.target.value) || 7 })}
                  style={styles.input}
                />
              </div>
            )}

            <button onClick={handleSaveSettings} style={styles.saveBtn}>
              <Save size={18} /> Save Alert Settings
            </button>
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader} className="settings-section-header">
              <User size={20} />
              <h2>My Profile</h2>
            </div>

            <div style={styles.profileCard} className="settings-profile-card">
              <div style={styles.avatarLarge}>
                {authUser?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div style={styles.userNameLarge}>{authUser?.name || 'User'}</div>
                <div style={styles.userEmailLarge}>{authUser?.email || ''}</div>
              </div>
            </div>

            <div style={styles.sectionDivider} />

            <div style={styles.sectionHeader} className="settings-section-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Edit Information</h3>
            </div>
            <div style={styles.grid} className="settings-grid">
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  style={styles.input}
                  placeholder="Enter your name"
                />
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              style={{ ...styles.saveBtn, opacity: profileSaving ? 0.6 : 1 }}
            >
              <Save size={18} /> {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>

            <div style={styles.sectionDivider} />

            <div style={styles.sectionHeader} className="settings-section-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Change Password</h3>
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Update your password regularly to keep your account secure.
            </p>
            <div style={styles.grid} className="settings-grid">
              <div style={styles.field}>
                <label style={styles.label}>Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Enter current password"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Enter new password"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <button onClick={handleChangePassword} style={styles.saveBtn}>
              <Key size={18} /> Change Password
            </button>
          </div>
        )}

        {activeTab === 'theme' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader} className="settings-section-header">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              <h2>Appearance</h2>
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Switch between dark and light mode for the application interface.
            </p>

            <div style={{
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={() => theme !== 'dark' && toggleTheme()}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  border: '2px solid',
                  borderColor: theme === 'dark' ? '#3b82f6' : 'var(--border)',
                  background: theme === 'dark' ? 'var(--card)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Moon size={32} style={{ color: theme === 'dark' ? '#3b82f6' : '#94a3b8', marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: '600', color: theme === 'dark' ? '#f1f5f9' : '#1e293b', marginBottom: '0.25rem' }}>Dark Mode</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Easy on the eyes, great for low light</div>
              </button>
              <button
                onClick={() => theme !== 'light' && toggleTheme()}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  border: '2px solid',
                  borderColor: theme === 'light' ? '#3b82f6' : 'var(--border)',
                  background: theme === 'light' ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Sun size={32} style={{ color: theme === 'light' ? '#3b82f6' : '#94a3b8', marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: '600', color: theme === 'light' ? '#1e293b' : '#f1f5f9', marginBottom: '0.25rem' }}>Light Mode</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Bright and clean, great for daytime</div>
              </button>
            </div>

            <div style={{
              marginTop: '2rem',
              padding: '1rem',
              background: 'var(--muted)',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                  Theme preference is saved locally and persists across sessions.
                </span>
              </div>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <Database size={20} />
            <h2>Data Management</h2>
          </div>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Export or delete all your shop data. These actions are irreversible.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Download size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Export All Data</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                Download a JSON file containing all your products, sales, expenses, customers, and more.
              </p>
              <button
                onClick={async () => {
                  setDownloading(true);
                  try {
                    const res = await fetch('/api/shop/export-data', {
                      headers: { 'x-shop-id': shop?.id || '', 'x-user-id': authUser?.id || '' },
                    });
                    if (!res.ok) throw new Error('Export failed');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || 'shop-data.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    showNotification('Failed to export data', 'error');
                  } finally {
                    setDownloading(false);
                  }
                }}
                disabled={downloading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer', opacity: downloading ? 0.6 : 1 }}
              >
                <Download size={16} /> {downloading ? 'Exporting...' : 'Download Data (JSON)'}
              </button>
            </div>

            <div style={{ padding: '1.25rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: '#ef4444' }}>Danger Zone - Delete All Data</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                Permanently delete all products, sales, expenses, users (except yourself), and other data. 
                The shop will be reset to an empty state. This action cannot be undone.
              </p>

              {!settings.businessEmail ? (
                <div style={{ padding: '1rem', background: '#f59e0b20', borderRadius: '0.5rem', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--foreground)', flex: 1 }}>
                    You must configure a <strong>business email</strong> in the Business settings first. The verification code will be sent there.
                  </span>
                  <button onClick={() => setActiveTab('business')} style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}>
                    Go to Business Settings
                  </button>
                </div>
              ) : deleteStep === 'idle' && (
                <div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={async () => {
                        setDeleteLoading(true);
                        setDeleteError('');
                        try {
                          const res = await fetch('/api/shop/delete-code', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '', 'x-user-id': authUser?.id || '' },
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Failed to send code');
                          setDeleteStep('code-sent');
                          showNotification('Verification code sent to business email', 'success');
                        } catch (e: any) {
                          setDeleteError(e.message);
                        } finally {
                          setDeleteLoading(false);
                        }
                      }}
                      disabled={deleteLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: '#ef4444', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer', opacity: deleteLoading ? 0.6 : 1 }}
                    >
                      <Trash2 size={16} /> {deleteLoading ? 'Sending Code...' : 'Delete All Shop Data'}
                    </button>
                  </div>
                  {deleteError && <p style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '0.75rem' }}>{deleteError}</p>}
                </div>
              )}

              {deleteStep === 'code-sent' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                    A 6-digit verification code has been sent to <strong>{settings.businessEmail}</strong>.
                    Please open your email, copy the code, and enter it below to confirm deletion.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      maxLength={6}
                      value={deleteCode}
                      onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      style={{ padding: '0.75rem', width: '140px', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.5rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', outline: 'none' }}
                    />
                    <button
                      onClick={async () => {
                        if (deleteCode.length !== 6) return;
                        setDeleteLoading(true);
                        setDeleteError('');
                        try {
                          const res = await fetch('/api/shop/verify-delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '', 'x-user-id': authUser?.id || '' },
                            body: JSON.stringify({ code: deleteCode }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Verification failed');
                          setDeleteStep('done');
                          showNotification('All shop data has been deleted', 'success');
                        } catch (e: any) {
                          setDeleteError(e.message);
                        } finally {
                          setDeleteLoading(false);
                        }
                      }}
                      disabled={deleteLoading || deleteCode.length !== 6}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: '#ef4444', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: deleteLoading || deleteCode.length !== 6 ? 'not-allowed' : 'pointer', opacity: deleteLoading || deleteCode.length !== 6 ? 0.6 : 1 }}
                    >
                      {deleteLoading ? 'Verifying...' : 'Confirm Deletion'}
                    </button>
                    <button
                      onClick={() => { setDeleteStep('idle'); setDeleteCode(''); setDeleteError(''); }}
                      style={{ padding: '0.75rem 1rem', background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--muted-foreground)', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                  {deleteError && <p style={{ fontSize: '0.85rem', color: '#ef4444' }}>{deleteError}</p>}
                </div>
              )}

              {deleteStep === 'done' && (
                <div style={{ padding: '1rem', background: '#22c55e20', borderRadius: '0.5rem', border: '1px solid #22c55e' }}>
                  <p style={{ color: '#22c55e', fontWeight: '600', margin: 0 }}>
                    All shop data has been successfully deleted. The shop has been reset.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reminders' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader} className="settings-section-header">
            <Clock size={20} />
            <h2>Custom Reminders</h2>
            <button onClick={() => openReminderModal()} style={styles.addBtn}>
              <Plus size={18} /> Add Reminder
            </button>
          </div>

          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Create reminders for inventory checks, payment follow-ups, maintenance, or anything else.
          </p>

          {reminders.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)',
              background: 'var(--background)', borderRadius: '0.75rem', border: '1px dashed var(--border)',
            }}>
              <Clock size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>No reminders yet. Click "Add Reminder" to create one.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reminders.map(reminder => (
                <div key={reminder.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem', background: 'var(--background)',
                  borderRadius: '0.75rem', border: '1px solid var(--border)',
                  opacity: reminder.isActive ? 1 : 0.5,
                }}>
                  <div
                    onClick={() => handleToggleReminder(reminder)}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
                      background: reminder.isActive ? '#22c55e' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', flexShrink: 0,
                    }}
                    title={reminder.isActive ? 'Active (click to pause)' : 'Paused (click to activate)'}
                  >
                    {reminder.isActive && <Check size={14} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: '600', color: 'var(--foreground)',
                      textDecoration: reminder.isActive ? 'none' : 'line-through',
                    }}>
                      {reminder.title}
                    </div>
                    {reminder.description && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                        {reminder.description}
                      </div>
                    )}
                    {reminder.dueDate && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        fontSize: '0.75rem', color: new Date(reminder.dueDate) < new Date() ? '#ef4444' : '#f59e0b',
                        marginTop: '0.25rem',
                      }}>
                        <CalendarDays size={12} />
                        {new Date(reminder.dueDate).toLocaleDateString('en-US', {
                          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {new Date(reminder.dueDate) < new Date() && <span>(overdue)</span>}
                      </div>
                    )}
                  </div>
                  <button onClick={() => openReminderModal(reminder)} style={{ ...styles.deleteBtn, color: 'var(--primary)' }} title="Edit">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDeleteReminder(reminder.id)} style={styles.deleteBtn} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showRoleModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRoleModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>{editingRole ? 'Edit Role' : 'Create Custom Role'}</h2>
              <button onClick={() => setShowRoleModal(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.field}>
                <label style={styles.label}>Role Name *</label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  style={styles.input}
                  placeholder="e.g., SUPERVISOR, STOCK_MANAGER"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <input
                  type="text"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  style={styles.input}
                  placeholder="Brief description of this role"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={roleForm.color}
                    onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                    style={{ width: '48px', height: '48px', borderRadius: '0.5rem', border: '1px solid var(--border)', cursor: 'pointer', padding: 0 }}
                  />
                  <input
                    type="text"
                    value={roleForm.color}
                    onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                    style={{ ...styles.input, flex: 1, fontFamily: 'monospace' }}
                    placeholder="#6b7280"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={handleSaveRole} style={styles.submitBtn}>
                  <Save size={18} /> {editingRole ? 'Update Role' : 'Create Role'}
                </button>
                {editingRole && (
                  <button
                    onClick={() => handleDeleteRole(editingRole)}
                    style={{ ...styles.deleteBtn, marginLeft: 'auto', background: 'var(--destructive)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '600' }}
                  >
                    <Trash2 size={16} /> Delete Role
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {showReminderModal && (
        <div style={styles.modalOverlay} onClick={() => setShowReminderModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2><Clock size={20} /> {editingReminder ? 'Edit Reminder' : 'New Reminder'}</h2>
              <button onClick={() => setShowReminderModal(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.field}>
                <label style={styles.label}>Title *</label>
                <input
                  type="text"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  style={styles.input}
                  placeholder="e.g., Monthly stock count, Pay supplier invoice..."
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={reminderForm.description}
                  onChange={(e) => setReminderForm({ ...reminderForm, description: e.target.value })}
                  style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                  placeholder="Optional details about this reminder"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Due Date (optional)</label>
                <input
                  type="datetime-local"
                  value={reminderForm.dueDate}
                  onChange={(e) => setReminderForm({ ...reminderForm, dueDate: e.target.value })}
                  style={styles.input}
                />
              </div>
              <button onClick={handleSaveReminder} style={styles.submitBtn}>
                <Save size={18} /> {editingReminder ? 'Update Reminder' : 'Create Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div style={styles.modalOverlay} onClick={() => setShowUserModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2><UserPlus size={20} /> Add New User</h2>
              <button onClick={() => setShowUserModal(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.field}>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  style={styles.input}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Username *</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  style={styles.input}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  style={styles.input}
                  placeholder="Enter email address"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  style={styles.input}
                  placeholder="Enter password"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  style={styles.select}
                >
                  {displayRoles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleCreateUser} style={styles.submitBtn}>
                <Save size={18} /> Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div style={styles.modalOverlay} onClick={() => setShowResetModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2><Key size={20} /> Reset Password</h2>
              <button onClick={() => setShowResetModal(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                Reset password for: <strong style={{ color: 'var(--foreground)' }}>{resetUser?.name}</strong> ({resetUser?.email})
              </p>
              <div style={styles.field}>
                <label style={styles.label}>New Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Enter new password"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Confirm new password"
                />
              </div>
              <button onClick={handleResetPassword} style={styles.submitBtn}>
                <Key size={18} /> Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', padding: '1.5rem', color: 'var(--foreground)' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: '1.25rem', color: 'var(--muted-foreground)' },
  notification: { position: 'fixed', top: '1rem', right: '1rem', padding: '1rem 1.5rem', borderRadius: '0.5rem', color: 'white', fontWeight: '600', zIndex: 1000 },
  header: { marginBottom: '1.5rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  subtitle: { color: 'var(--muted-foreground)', fontSize: '0.875rem', marginTop: '0.25rem' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--card)', padding: '0.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' },
  tab: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderRadius: '0.5rem', color: 'var(--muted-foreground)', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' },
  tabActive: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' },
  content: { background: 'var(--card)', borderRadius: '1rem', border: '1px solid var(--border)', padding: '1.5rem' },
  section: {},
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--foreground)' },
  sectionDivider: { height: '1px', background: 'var(--border)', margin: '1.5rem 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.875rem', fontWeight: '500', color: 'var(--muted-foreground)' },
  input: { padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '0.95rem' },
  select: { padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '0.95rem' },
  saveBtn: { marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer' },
  addBtn: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer' },
  usersList: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' },
  userCard: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)' },
  userAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontWeight: '600', color: 'var(--foreground)' },
  userEmail: { fontSize: '0.875rem', color: 'var(--muted-foreground)' },
  userRole: { padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600' },
  userRoleSelect: { padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', outline: 'none', minWidth: '100px' },
  deleteBtn: { background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '0.5rem' },
  rolesInfo: { padding: '1rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)' },
  rolesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem' },
  roleCard: { padding: '0.75rem', background: 'var(--card)', borderRadius: '0.5rem' },
  roleName: { fontWeight: '600', color: 'var(--foreground)', fontSize: '0.875rem' },
  roleDesc: { fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' },
  alertCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)', marginBottom: '1rem' },
  alertInfo: { flex: 1 },
  alertTitle: { fontWeight: '600', color: 'var(--foreground)' },
  alertDesc: { fontSize: '0.875rem', color: 'var(--muted-foreground)' },
  toggle: { position: 'relative', display: 'inline-block', width: '50px', height: '26px' },
  toggleInput: { opacity: 0, width: 0, height: 0 },
  toggleSlider: { position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '26px', transition: '0.3s' },
  toggleKnob: { position: 'absolute', top: '3px', left: '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: '0.3s' },
  profileCard: { display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)', marginBottom: '1rem' },
  avatarLarge: { width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '1.5rem' },
  userNameLarge: { fontWeight: '700', fontSize: '1.25rem', color: 'var(--foreground)' },
  userEmailLarge: { fontSize: '0.9rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--background) 85%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--card)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '450px', width: '90%', border: '1px solid var(--border)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', color: 'var(--foreground)' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' },
  modalBody: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  submitBtn: { marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer' },
  logoSection: { display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.25rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)', marginBottom: '1.5rem' },
  logoPreview: { width: '80px', height: '80px', borderRadius: '0.75rem', overflow: 'hidden', flexShrink: 0, background: 'var(--card)' },
  logoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  logoPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' },
  logoActions: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  logoUploadLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '0.5rem', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' },
  logoRemoveBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--destructive)', borderRadius: '0.5rem', color: 'var(--destructive)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' },
};

const permStyles: Record<string, React.CSSProperties> = {
  roleBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', flex: '1', minWidth: '180px', background: 'transparent' },
  roleBadge: { width: '32px', height: '32px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '1rem', flexShrink: 0 },
  roleInfo: { flex: 1 },
  roleName: { fontWeight: '600', color: 'var(--foreground)', fontSize: '0.9rem' },
  roleDesc: { fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.1rem' },
  checkbox: { position: 'relative', display: 'inline-block', width: '22px', height: '22px', cursor: 'pointer' },
  checkboxInput: { opacity: 0, width: '22px', height: '22px', cursor: 'pointer', position: 'absolute', margin: 0 },
  checkboxMark: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--background)', border: '2px solid var(--border)', borderRadius: '0.25rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { background: 'var(--success)', border: '2px solid var(--success)' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer', fontWeight: '600' },
  resetBtn: { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', background: 'var(--secondary)', border: '1px solid #475569', borderRadius: '0.5rem', color: 'var(--foreground)', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' },
  quickBtn: { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', background: 'var(--secondary)', border: 'none', borderRadius: '0.5rem', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.8rem' },
};

function BusinessTypesSection() {
  const [businessTypes, setBusinessTypes] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetch('/api/business-types')
      .then(res => res.ok ? res.json() : [])
      .then(data => setBusinessTypes(data.businessTypes || []))
      .catch(console.error);
  }, []);

  function openModal(type?: any) {
    if (type) {
      setEditingType(type);
      setFormData({ name: type.name, description: type.description || '' });
    } else {
      setEditingType(null);
      setFormData({ name: '', description: '' });
    }
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!formData.name.trim()) return;
    
    const url = editingType ? '/api/business-types' : '/api/business-types';
    const method = editingType ? 'PUT' : 'POST';
    const body = editingType 
      ? { id: editingType.id, name: formData.name, description: formData.description }
      : { name: formData.name, description: formData.description };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        const data = await res.json();
        if (editingType) {
          setBusinessTypes(prev => prev.map(t => t.id === data.businessType.id ? data.businessType : t));
        } else {
          setBusinessTypes(prev => [...prev, data.businessType]);
        }
        setShowModal(false);
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this business type?')) return;
    try {
      await fetch(`/api/business-types?id=${id}`, { method: 'DELETE' });
      setBusinessTypes(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader} className="settings-section-header">
        <Palette size={20} />
        <h2>Business Types</h2>
      </div>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
        Define business types (Electronics, Pharmacy, Clothing, etc.) with custom product fields
      </p>

      <button onClick={() => openModal()} style={styles.submitBtn}>
        <Plus size={18} /> Add Business Type
      </button>

      <div style={{ marginTop: '1rem' }}>
        {businessTypes.map(type => (
          <div key={type.id} style={{ ...styles.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--foreground)' }}>{type.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{type.description}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => openModal(type)} style={{ padding: '0.4rem', background: '#3b82f6', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' }}>
                <Edit size={14} />
              </button>
              <button onClick={() => handleDelete(type.id)} style={{ padding: '0.4rem', background: '#ef4444', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>{editingType ? 'Edit' : 'Add'} Business Type</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div>
                <label style={styles.label}>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Electronics, Pharmacy, Clothing"
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description"
                  style={styles.input}
                />
              </div>
              <button onClick={handleSubmit} style={styles.submitBtn}>
                <Save size={18} /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
