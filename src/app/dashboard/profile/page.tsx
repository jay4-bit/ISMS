'use client';

import { useState } from 'react';
import { 
  User, Mail, Phone, Lock, Save, Eye, EyeOff, Shield,
  Check, Camera
} from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState({
    name: 'Admin User',
    email: 'admin@isms.com',
    phone: '+255 700 000 000',
    role: 'ADMIN',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showNotification(message: string, type: 'success' | 'error') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  async function handleUpdateProfile() {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name, phone: user.phone }),
      });
      if (res.ok) {
        showNotification('Profile updated successfully!', 'success');
      }
    } catch (error) {
      showNotification('Failed to update profile', 'error');
    }
  }

  async function handleChangePassword() {
    if (passwords.new !== passwords.confirm) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    if (passwords.new.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new }),
      });
      if (res.ok) {
        showNotification('Password changed successfully!', 'success');
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        showNotification('Current password is incorrect', 'error');
      }
    } catch (error) {
      showNotification('Failed to change password', 'error');
    }
  }

  const roleColors: Record<string, { bg: string; text: string }> = {
    ADMIN: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
    MANAGER: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
    CASHIER: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
    ACCOUNTANT: { bg: 'rgba(139, 92, 246, 0.2)', text: '#8b5cf6' },
  };

  return (
    <div style={styles.container}>
      {notification && (
        <div style={{ ...styles.notification, background: notification.type === 'success' ? '#22c55e' : '#ef4444' }}>
          {notification.message}
        </div>
      )}

      <div style={styles.header}>
        <h1 style={styles.title}><User size={28} /> My Profile</h1>
        <p style={styles.subtitle}>Manage your personal information and security</p>
      </div>

      <div style={styles.grid}>
        <div style={styles.profileCard}>
          <div style={styles.avatarSection}>
            <div style={styles.avatar}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button style={styles.avatarBtn}>
              <Camera size={16} />
            </button>
          </div>
          <div style={styles.profileInfo}>
            <h2 style={styles.profileName}>{user.name}</h2>
            <p style={styles.profileEmail}>{user.email}</p>
            <span style={{
              ...styles.roleBadge,
              background: roleColors[user.role]?.bg,
              color: roleColors[user.role]?.text,
            }}>
              <Shield size={12} /> {user.role}
            </span>
          </div>
        </div>

        <div style={styles.sections}>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <User size={20} />
              <h2>Personal Information</h2>
            </div>
            <div style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}><User size={14} /> Full Name</label>
                <input
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}><Mail size={14} /> Email Address</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  style={{ ...styles.input, opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}><Phone size={14} /> Phone Number</label>
                <input
                  type="text"
                  value={user.phone}
                  onChange={(e) => setUser({ ...user, phone: e.target.value })}
                  style={styles.input}
                />
              </div>
              <button onClick={handleUpdateProfile} style={styles.saveBtn}>
                <Save size={18} /> Save Changes
              </button>
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <Lock size={20} />
              <h2>Change Password</h2>
            </div>
            <div style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}><Lock size={14} /> Current Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    style={styles.input}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    style={styles.eyeBtn}
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}><Lock size={14} /> New Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    style={styles.input}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    style={styles.eyeBtn}
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}><Lock size={14} /> Confirm New Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    style={styles.input}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    style={styles.eyeBtn}
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button onClick={handleChangePassword} style={styles.passwordBtn}>
                <Lock size={18} /> Change Password
              </button>
            </div>
          </div>

          <div style={styles.infoSection}>
            <h3>Account Information</h3>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Member Since</span>
                <span style={styles.infoValue}>January 2024</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Last Login</span>
                <span style={styles.infoValue}>Today</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Account Status</span>
                <span style={{ ...styles.infoValue, color: '#22c55e' }}><Check size={14} /> Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', padding: '1.5rem', color: '#e2e8f0' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: '1.25rem', color: '#64748b' },
  notification: { position: 'fixed', top: '1rem', right: '1rem', padding: '1rem 1.5rem', borderRadius: '0.5rem', color: 'white', fontWeight: '600', zIndex: 1000 },
  header: { marginBottom: '1.5rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  subtitle: { color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' },
  grid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' },
  profileCard: { background: 'linear-gradient(145deg, #1e293b, #334155)', borderRadius: '1rem', border: '1px solid #334155', padding: '2rem', textAlign: 'center' },
  avatarSection: { position: 'relative', display: 'inline-block', marginBottom: '1rem' },
  avatar: { width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2.5rem', fontWeight: '700' },
  avatarBtn: { position: 'absolute', bottom: '0', right: '0', width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  profileInfo: {},
  profileName: { fontSize: '1.25rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.25rem' },
  profileEmail: { fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.75rem' },
  roleBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600' },
  sections: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  section: { background: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '1.5rem' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#f1f5f9' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.875rem', fontWeight: '500', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  input: { padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '0.95rem' },
  passwordWrapper: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' },
  saveBtn: { marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer' },
  passwordBtn: { marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer' },
  infoSection: { background: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '1.5rem' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  infoLabel: { fontSize: '0.75rem', color: '#64748b' },
  infoValue: { fontSize: '0.875rem', fontWeight: '600', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.25rem' },
};
