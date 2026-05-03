'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Store, Eye, EyeOff, AlertCircle, LogIn, UserPlus, ArrowLeft } from 'lucide-react';
import { SHOP_TYPE_CONFIG } from '@/lib/auth';

const SHOP_TYPES = [
  { type: 'PHARMACY', icon: '💊', name: 'Pharmacy', color: '#22c55e' },
  { type: 'GENERAL', icon: '🏪', name: 'General Store', color: '#f59e0b' },
  { type: 'LIQUOR', icon: '🍷', name: 'Liquor Store', color: '#8b5cf6' },
  { type: 'ELECTRONICS', icon: '📱', name: 'Electronics', color: '#3b82f6' },
  { type: 'CLOTHING', icon: '👕', name: 'Clothing Store', color: '#ec4899' },
];

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'select' | 'login' | 'register'>('select');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [registerData, setRegisterData] = useState({
    shopName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (selectedType && mode === 'login') {
      fetchShops(selectedType);
    }
  }, [selectedType, mode]);

  const handleLogin = async (e: React.FormEvent, shopId?: string) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, shopId }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('shop', JSON.stringify(data.shop));
        localStorage.setItem('token', data.token);
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: registerData.shopName,
          shopType: selectedType,
          phone: registerData.phone,
          email: registerData.ownerEmail,
          address: registerData.address,
          ownerName: registerData.ownerName,
          ownerEmail: registerData.ownerEmail,
          ownerPassword: registerData.ownerPassword
        }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('shop', JSON.stringify(data.shop));
        localStorage.setItem('token', data.token);
        router.push('/dashboard');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const fetchShops = async (type: string) => {
    const res = await fetch(`/api/shops?type=${type}`);
    const data = await res.json();
    if (data.shops) {
      setShops(data.shops);
    }
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setMode('login');
    setError('');
    fetchShops(type);
  };

  const handleBack = () => {
    setSelectedType(null);
    setMode('select');
    setError('');
    setEmail('');
    setPassword('');
    setRegisterData({
      shopName: '',
      ownerName: '',
      ownerEmail: '',
      ownerPassword: '',
      phone: '',
      address: ''
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundPattern}></div>

      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.logoIcon}>
            <Package size={32} color="white" />
          </div>
          <h1 style={styles.title}>ISMS Pro</h1>
          <p style={styles.subtitle}>Inventory & Sales Management System</p>
        </div>

        {mode === 'select' ? (
          <div style={styles.typeSelector}>
            <h2 style={styles.sectionTitle}>Select Your Business Type</h2>
            <p style={styles.sectionSubtitle}>Choose the type of shop you want to manage</p>
            
            <div style={styles.typeGrid}>
              {SHOP_TYPES.map((st) => (
                <button
                  key={st.type}
                  onClick={() => handleTypeSelect(st.type)}
                  style={{ ...styles.typeCard, borderColor: st.color }}
                >
                  <span style={styles.typeIcon}>{st.icon}</span>
                  <span style={styles.typeName}>{st.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={styles.authContainer}>
            <button onClick={handleBack} style={styles.backButton}>
              <ArrowLeft size={18} /> Back to shop types
            </button>

            <div style={styles.selectedShop}>
              <span style={styles.selectedIcon}>
                {SHOP_TYPES.find(t => t.type === selectedType)?.icon}
              </span>
              <span style={styles.selectedName}>{SHOP_TYPE_CONFIG[selectedType!].name}</span>
            </div>

            <div style={styles.tabContainer}>
              <button
                onClick={() => setMode('login')}
                style={{
                  ...styles.tab,
                  ...(mode === 'login' ? styles.tabActive : {})
                }}
              >
                <LogIn size={18} /> Sign In
              </button>
              <button
                onClick={() => setMode('register')}
                style={{
                  ...styles.tab,
                  ...(mode === 'register' ? styles.tabActive : {})
                }}
              >
                <UserPlus size={18} /> Register
              </button>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={(e) => handleLogin(e, shops[0]?.id)} style={styles.form}>
                {shops.length > 0 && (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Select Shop</label>
                    <select style={styles.select}>
                      {shops.map(shop => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Password</label>
                  <div style={styles.inputWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{...styles.input, paddingRight: '2.5rem'}}
                      placeholder="Enter your password"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} style={styles.button}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <p style={styles.switchText}>
                  Don&apos;t have an account?{' '}
                  <button onClick={() => setMode('register')} style={styles.switchLink}>
                    Register here
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Shop Name</label>
                  <input
                    type="text"
                    value={registerData.shopName}
                    onChange={(e) => setRegisterData({ ...registerData, shopName: e.target.value })}
                    style={styles.input}
                    placeholder="Enter your shop name"
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Your Name</label>
                  <input
                    type="text"
                    value={registerData.ownerName}
                    onChange={(e) => setRegisterData({ ...registerData, ownerName: e.target.value })}
                    style={styles.input}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={registerData.ownerEmail}
                    onChange={(e) => setRegisterData({ ...registerData, ownerEmail: e.target.value })}
                    style={styles.input}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Password</label>
                  <div style={styles.inputWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerData.ownerPassword}
                      onChange={(e) => setRegisterData({ ...registerData, ownerPassword: e.target.value })}
                      style={{...styles.input, paddingRight: '2.5rem'}}
                      placeholder="Create a password (min 6 chars)"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    style={styles.input}
                    placeholder="+255..."
                  />
                </div>

                <button type="submit" disabled={loading} style={styles.button}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <p style={styles.switchText}>
                  Already have an account?{' '}
                  <button onClick={() => setMode('login')} style={styles.switchLink}>
                    Sign in here
                  </button>
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    padding: '2rem',
    position: 'relative',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
    pointerEvents: 'none',
  },
  content: {
    width: '100%',
    maxWidth: '500px',
    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
    borderRadius: '1rem',
    padding: '2rem',
    border: '1px solid #334155',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  logoIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '1rem',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#f1f5f9',
    margin: 0,
  },
  subtitle: {
    color: '#64748b',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  },
  typeSelector: {
    textAlign: 'center' as const,
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '0.5rem',
  },
  sectionSubtitle: {
    color: '#64748b',
    fontSize: '0.8rem',
    marginBottom: '1.5rem',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  typeCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.25rem 1rem',
    background: '#0f172a',
    border: '2px solid',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  typeIcon: {
    fontSize: '2rem',
  },
  typeName: {
    fontWeight: '600',
    fontSize: '0.9rem',
    color: '#f1f5f9',
  },
  authContainer: {
    marginTop: '0.5rem',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    padding: 0,
  },
  selectedShop: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '0.75rem',
    marginBottom: '1rem',
  },
  selectedIcon: {
    fontSize: '1.5rem',
  },
  selectedName: {
    fontWeight: '600',
    fontSize: '1rem',
    color: '#f1f5f9',
  },
  tabContainer: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: '1px solid #3b82f6',
    color: 'white',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '0.5rem',
    color: '#ef4444',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#94a3b8',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    color: '#f1f5f9',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputWrapper: {
    position: 'relative' as const,
  },
  eyeButton: {
    position: 'absolute' as const,
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    color: '#f1f5f9',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    padding: '0.875rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none',
    borderRadius: '0.5rem',
    color: 'white',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  switchText: {
    textAlign: 'center' as const,
    color: '#64748b',
    fontSize: '0.85rem',
    marginTop: '0.5rem',
  },
  switchLink: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontWeight: '500',
    textDecoration: 'underline',
  },
};