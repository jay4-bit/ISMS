'use client';

import { useEffect, useState } from 'react';
import { Shield, Save, RotateCcw, Check, X, Eye, Edit, Trash2, Lock } from 'lucide-react';

interface Module {
  id: string;
  name: string;
  description: string;
}

interface Permission {
  id?: string;
  role: string;
  module: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

const ROLES = [
  { value: 'ADMIN', label: 'Administrator', desc: 'Full access to all features', color: '#ef4444' },
  { value: 'MANAGER', label: 'Manager', desc: 'Can manage inventory and reports', color: '#f59e0b' },
  { value: 'CASHIER', label: 'Cashier', desc: 'Can process sales and returns', color: '#3b82f6' },
  { value: 'ACCOUNTANT', label: 'Accountant', desc: 'Can view reports and expenses', color: '#8b5cf6' },
  { value: 'WINGER', label: 'Winger', desc: 'Can assist sales and inventory', color: '#22c55e' },
  { value: 'SHOP_ASSISTANT', label: 'Shop Assistant', desc: 'Can process sales and manage stock', color: '#ec4899' },
];

export default function PermissionsPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState('CASHIER');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  async function fetchPermissions() {
    try {
      const res = await fetch('/api/permissions');
      const data = await res.json();
      setModules(data.modules || []);
      
      const perms = data.permissions || [];
      if (perms.length === 0) {
        await resetToDefaults();
      } else {
        setPermissions(perms);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function resetToDefaults() {
    try {
      const res = await fetch('/api/permissions', { method: 'PUT' });
      if (res.ok) {
        await fetchPermissions();
        showNotification('Permissions reset to defaults', 'success');
      }
    } catch (error) {
      console.error('Failed to reset permissions:', error);
    }
  }

  function getPermission(moduleId: string): Permission {
    return permissions.find(p => p.role === selectedRole && p.module === moduleId) || {
      role: selectedRole,
      module: moduleId,
      canRead: false,
      canWrite: false,
      canDelete: false,
    };
  }

  function updatePermission(moduleId: string, field: keyof Permission, value: boolean) {
    setPermissions(prev => {
      const existing = prev.findIndex(p => p.role === selectedRole && p.module === moduleId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], [field]: value };
        return updated;
      } else {
        return [...prev, { role: selectedRole, module: moduleId, canRead: false, canWrite: false, canDelete: false, [field]: value }];
      }
    });
  }

  async function savePermissions() {
    setSaving(true);
    try {
      const rolePermissions = permissions.filter(p => p.role === selectedRole);
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, permissions: rolePermissions }),
      });
      if (res.ok) {
        showNotification('Permissions saved successfully!', 'success');
      }
    } catch (error) {
      showNotification('Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  }

  function showNotification(message: string, type: 'success' | 'error') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  if (loading) return <div style={styles.loading}>Loading...</div>;

  const currentRole = ROLES.find(r => r.value === selectedRole);

  return (
    <div style={styles.container}>
      {notification && (
        <div style={{ ...styles.notification, background: notification.type === 'success' ? '#22c55e' : '#ef4444' }}>
          {notification.message}
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}><Shield size={28} /> Role Permissions</h1>
          <p style={styles.subtitle}>Configure what each role can access in the system</p>
        </div>
        <button onClick={resetToDefaults} style={styles.resetBtn}>
          <RotateCcw size={18} /> Reset to Defaults
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.roleSelector}>
          <h3 style={styles.sectionTitle}>Select Role</h3>
          <div style={styles.roleGrid}>
            {ROLES.map(role => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                style={{
                  ...styles.roleCard,
                  borderColor: selectedRole === role.value ? role.color : 'transparent',
                  background: selectedRole === role.value ? `${role.color}15` : '#0f172a',
                }}
              >
                <div style={{ ...styles.roleBadge, background: role.color }}>{role.label.charAt(0)}</div>
                <div style={styles.roleInfo}>
                  <div style={styles.roleName}>{role.label}</div>
                  <div style={styles.roleDesc}>{role.desc}</div>
                </div>
                {selectedRole === role.value && <Check size={20} color={role.color} />}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.permissionsSection}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              Permissions for <span style={{ color: currentRole?.color }}>{currentRole?.label}</span>
            </h3>
            <button onClick={savePermissions} disabled={saving} style={styles.saveBtn}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div style={styles.permissionsTable}>
            <div style={styles.tableHeader}>
              <div style={styles.moduleCol}>Module</div>
              <div style={styles.actionCol}>
                <Eye size={16} />
                <span>Read</span>
              </div>
              <div style={styles.actionCol}>
                <Edit size={16} />
                <span>Write</span>
              </div>
              <div style={styles.actionCol}>
                <Trash2 size={16} />
                <span>Delete</span>
              </div>
            </div>

            {modules.map(module => {
              const perm = getPermission(module.id);
              return (
                <div key={module.id} style={styles.tableRow}>
                  <div style={styles.moduleCol}>
                    <div style={styles.moduleName}>{module.name}</div>
                    <div style={styles.moduleDesc}>{module.description}</div>
                  </div>
                  <div style={styles.actionCol}>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={perm.canRead}
                        onChange={(e) => updatePermission(module.id, 'canRead', e.target.checked)}
                      />
                      <span style={styles.checkboxMark} />
                    </label>
                  </div>
                  <div style={styles.actionCol}>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={perm.canWrite}
                        onChange={(e) => updatePermission(module.id, 'canWrite', e.target.checked)}
                      />
                      <span style={styles.checkboxMark} />
                    </label>
                  </div>
                  <div style={styles.actionCol}>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={perm.canDelete}
                        onChange={(e) => updatePermission(module.id, 'canDelete', e.target.checked)}
                      />
                      <span style={styles.checkboxMark} />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.quickActions}>
            <button 
              onClick={() => {
                modules.forEach(m => {
                  updatePermission(m.id, 'canRead', true);
                  updatePermission(m.id, 'canWrite', true);
                  updatePermission(m.id, 'canDelete', false);
                });
              }}
              style={styles.quickBtn}
            >
              <Eye size={16} /> Read & Write Only
            </button>
            <button 
              onClick={() => {
                modules.forEach(m => {
                  updatePermission(m.id, 'canRead', true);
                  updatePermission(m.id, 'canWrite', false);
                  updatePermission(m.id, 'canDelete', false);
                });
              }}
              style={styles.quickBtn}
            >
              <Eye size={16} /> Read Only
            </button>
            <button 
              onClick={() => {
                modules.forEach(m => {
                  updatePermission(m.id, 'canRead', false);
                  updatePermission(m.id, 'canWrite', false);
                  updatePermission(m.id, 'canDelete', false);
                });
              }}
              style={styles.quickBtn}
            >
              <X size={16} /> No Access
            </button>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  subtitle: { color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' },
  resetBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: '#334155', border: '1px solid #475569', borderRadius: '0.5rem', color: '#f1f5f9', cursor: 'pointer', fontWeight: '500' },
  content: { background: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '1.5rem' },
  roleSelector: { marginBottom: '2rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: '#f1f5f9', marginBottom: '1rem' },
  roleGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' },
  roleCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '0.75rem', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' },
  roleBadge: { width: '40px', height: '40px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '1.25rem', flexShrink: 0 },
  roleInfo: { flex: 1 },
  roleName: { fontWeight: '600', color: '#f1f5f9', fontSize: '0.95rem' },
  roleDesc: { fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' },
  permissionsSection: {},
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer', fontWeight: '600' },
  permissionsTable: { border: '1px solid #334155', borderRadius: '0.75rem', overflow: 'hidden' },
  tableHeader: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.75rem 1rem', background: '#0f172a', borderBottom: '1px solid #334155' },
  tableRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid #334155', alignItems: 'center' },
  moduleCol: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  moduleName: { fontWeight: '600', color: '#f1f5f9', fontSize: '0.9rem' },
  moduleDesc: { fontSize: '0.75rem', color: '#64748b' },
  actionCol: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', color: '#94a3b8', fontSize: '0.8rem' },
  checkbox: { position: 'relative', display: 'inline-block', width: '22px', height: '22px', cursor: 'pointer' },
  checkboxInput: { opacity: 0, width: 0, height: 0 },
  checkboxMark: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#0f172a', border: '2px solid #475569', borderRadius: '0.25rem', transition: 'all 0.2s' },
  quickActions: { display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' },
  quickBtn: { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', background: '#334155', border: 'none', borderRadius: '0.5rem', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' },
};
