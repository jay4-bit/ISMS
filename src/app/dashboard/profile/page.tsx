'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Save, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function ProfilePage() {
  const { user: authUser, shop } = useAuth();
  const [saving, setSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({ name: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (authUser) {
      setProfileForm({ name: authUser.name || '' });
    }
  }, [authUser]);

  function showNotification(message: string, type: 'success' | 'error') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  async function handleSaveProfile() {
    if (!profileForm.name.trim()) { showNotification('Name is required', 'error'); return; }
    setSaving(true);
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
        const data = await res.json();
        showNotification(data.error || 'Failed to update profile', 'error');
      }
    } catch {
      showNotification('Failed to update profile', 'error');
    }
    setSaving(false);
  }

  async function handleChangePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ newPassword: passwordForm.newPassword, id: authUser?.id }),
      });
      if (res.ok) {
        showNotification('Password changed successfully!', 'success');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to change password', 'error');
      }
    } catch {
      showNotification('Failed to change password', 'error');
    }
  }

  return (
    <div className="profile-page" style={styles.container}>
      {notification && (
        <div style={{ ...styles.notification, background: notification.type === 'success' ? '#22c55e' : '#ef4444' }}>
          {notification.message}
        </div>
      )}

      <div style={styles.header}>
        <h1 style={styles.title}><User size={28} /> My Profile</h1>
        <p style={styles.subtitle}>Manage your personal information and security</p>
      </div>

      <div style={styles.sections}>
        <div style={styles.section}>
          <div style={styles.profileCard}>
            <div style={styles.avatarLarge}>
              {authUser?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div style={styles.userNameLarge}>{authUser?.name || 'User'}</div>
              <div style={styles.userEmailLarge}>{authUser?.email || ''}</div>
              <span style={styles.roleBadge}>
                <Shield size={12} /> {authUser?.role || ''}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <User size={20} />
            <h2>Edit Information</h2>
          </div>
          <div style={styles.grid}>
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
          <button onClick={handleSaveProfile} disabled={saving} style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <Lock size={20} />
            <h2>Change Password</h2>
          </div>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Update your password regularly to keep your account secure.
          </p>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Current Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })} style={styles.eyeBtn}>
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>New Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Enter new password"
                />
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })} style={styles.eyeBtn}>
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Confirm New Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Confirm new password"
                />
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })} style={styles.eyeBtn}>
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <button onClick={handleChangePassword} style={styles.passwordBtn}>
            <Lock size={18} /> Change Password
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', padding: '1.5rem', color: 'var(--foreground)', maxWidth: '800px', margin: '0 auto' },
  notification: { position: 'fixed', top: '1rem', right: '1rem', padding: '1rem 1.5rem', borderRadius: '0.5rem', color: 'white', fontWeight: '600', zIndex: 1000 },
  header: { marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  subtitle: { color: 'var(--muted-foreground)', fontSize: '0.875rem', marginTop: '0.25rem' },
  sections: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  section: { background: 'var(--card)', borderRadius: '1rem', border: '1px solid var(--border)', padding: '1.5rem' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--foreground)' },
  profileCard: { display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'linear-gradient(145deg, #1e293b, #334155)', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid var(--border)' },
  avatarLarge: { width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: '700', flexShrink: 0 },
  userNameLarge: { fontSize: '1.25rem', fontWeight: '700', color: 'var(--foreground)' },
  userEmailLarge: { fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.1rem' },
  roleBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', marginTop: '0.5rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.875rem', fontWeight: '500', color: 'var(--muted-foreground)' },
  input: { width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '0.95rem', boxSizing: 'border-box' },
  passwordWrapper: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' },
  saveBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' },
  passwordBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' },
};
