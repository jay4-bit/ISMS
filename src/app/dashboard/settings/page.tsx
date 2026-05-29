'use client';

import { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon, Building2, Phone, Mail, MapPin, DollarSign, 
  Users, UserPlus, Edit, Trash2, X, Save, Bell, Shield, Palette,
  Check, AlertTriangle, Key, Plus, User, Sun, Moon
} from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';
import { CURRENCIES, useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/context/ThemeContext';

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
  const [activeTab, setActiveTab] = useState<'business' | 'users' | 'alerts' | 'permissions' | 'types' | 'profile' | 'theme'>('business');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { refreshSettings } = useSettings();
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

  useEffect(() => { if (shop?.id) fetchData(); }, [shop?.id]);

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
        body: JSON.stringify({ name: profileForm.name, phone: profileForm.phone, id: authUser?.id }),
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

  const tabs = [
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'types', label: 'Business Types', icon: Palette },
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'theme', label: 'Theme', icon: Sun },
  ];

  const roles = [
    { value: 'ADMIN', label: 'Administrator', desc: 'Full access to all features' },
    { value: 'MANAGER', label: 'Manager', desc: 'Can manage inventory and reports' },
    { value: 'CASHIER', label: 'Cashier', desc: 'Can process sales and returns' },
    { value: 'ACCOUNTANT', label: 'Accountant', desc: 'Can view reports and expenses' },
    { value: 'WINGER', label: 'Winger', desc: 'Can assist sales and inventory' },
    { value: 'SHOP_ASSISTANT', label: 'Shop Assistant', desc: 'Can process sales and manage stock' },
  ];

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container} className="settings-container">
      {notification && (
        <div style={{ ...styles.notification, background: notification.type === 'success' ? '#22c55e' : '#ef4444' }}>
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
              {users.map(user => (
                <div key={user.id} style={styles.userCard} className="settings-user-card">
                  <div style={styles.userAvatar}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.userInfo}>
                    <div style={styles.userName}>{user.name}</div>
                    <div style={styles.userEmail}>{user.email}</div>
                  </div>
                  <div style={{
                    ...styles.userRole,
                    background: user.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.2)' :
                               user.role === 'MANAGER' ? 'rgba(245, 158, 11, 0.2)' :
                               user.role === 'ACCOUNTANT' ? 'rgba(139, 92, 246, 0.2)' :
                               'rgba(59, 130, 246, 0.2)',
                    color: user.role === 'ADMIN' ? '#ef4444' :
                           user.role === 'MANAGER' ? '#f59e0b' :
                           user.role === 'ACCOUNTANT' ? '#8b5cf6' :
                           '#3b82f6',
                  }}>
                    {user.role}
                  </div>
                  <button 
                    onClick={() => openResetModal(user)}
                    style={{ ...styles.deleteBtn, color: '#3b82f6', border: '1px solid #3b82f6' }}
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
              ))}
            </div>

            <div style={styles.rolesInfo}>
              <h3><Shield size={18} /> Role Permissions</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Configure module access for each role. Go to Settings → Permissions for full configuration.
              </p>
              <div style={styles.rolesGrid}>
                {roles.map(role => (
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
              <button 
                onClick={() => window.location.href = '/dashboard/permissions'}
                style={styles.addBtn}
              >
                <SettingsIcon size={18} /> Open Full Permissions
              </button>
            </div>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Configure what each role can access in the system. Click "Open Full Permissions" to access the full permissions management interface.
            </p>
            <div style={styles.rolesGrid}>
              {roles.map(role => (
                <div key={role.value} style={{ ...styles.roleCard, border: '1px solid #475569' }}>
                  <div style={{ ...styles.roleName, color: role.value === 'ADMIN' ? '#ef4444' : role.value === 'MANAGER' ? '#f59e0b' : '#3b82f6' }}>
                    {role.label}
                  </div>
                  <div style={{ ...styles.roleDesc, marginTop: '0.5rem' }}>{role.desc}</div>
                </div>
              ))}
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
              <div style={styles.field}>
                <label style={styles.label}>Phone Number</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  style={styles.input}
                  placeholder="Enter phone number"
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
                  background: theme === 'dark' ? '#1e293b' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Moon size={32} style={{ color: theme === 'dark' ? '#3b82f6' : '#94a3b8', marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: '600', color: theme === 'dark' ? '#f1f5f9' : '#1e293b', marginBottom: '0.25rem' }}>Dark Mode</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Easy on the eyes, great for low light</div>
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
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Bright and clean, great for daytime</div>
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
                <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                  Theme preference is saved locally and persists across sessions.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

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
                  {roles.map(role => (
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
              <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
                Reset password for: <strong style={{ color: '#f1f5f9' }}>{resetUser?.name}</strong> ({resetUser?.email})
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
  deleteBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' },
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
