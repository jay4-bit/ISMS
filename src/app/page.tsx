'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Eye, EyeOff, AlertCircle, LogIn, UserPlus, Mail, CheckCircle, RefreshCw, KeyRound, ArrowLeft } from 'lucide-react';

const SHOP_TYPES = [
  { type: 'PHARMACY', icon: '💊', name: 'Pharmacy', color: '#22c55e' },
  { type: 'GENERAL', icon: '🏪', name: 'General Store', color: '#f59e0b' },
  { type: 'LIQUOR', icon: '🍷', name: 'Liquor Store', color: '#8b5cf6' },
  { type: 'ELECTRONICS', icon: '📱', name: 'Electronics', color: '#3b82f6' },
  { type: 'CLOTHING', icon: '👕', name: 'Clothing Store', color: '#ec4899' },
];

export default function HomePage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedType, setSelectedType] = useState<string>('GENERAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Verification state
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resent, setResent] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'code'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [registerData, setRegisterData] = useState({
    shopName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    phone: '',
    address: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      if (result.error?.includes('verify your email')) {
        setVerifyEmail(email);
        setVerified(false);
      }
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register({
      name: registerData.shopName,
      shopType: selectedType,
      phone: registerData.phone,
      email: registerData.ownerEmail,
      address: registerData.address,
      ownerName: registerData.ownerName,
      ownerEmail: registerData.ownerEmail,
      ownerPassword: registerData.ownerPassword
    });

    if (result.success) {
      setVerifyEmail(registerData.ownerEmail);
      setVerified(false);
      setMode('login');
    } else {
      setError(result.error || 'Registration failed');
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail, code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setVerified(true);
      // Auto-login after verification
      const loginResult = await login(verifyEmail, registerData.ownerPassword || '');
      if (loginResult.success) {
        router.push('/dashboard');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setResent(false);
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend');
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset code');
      setForgotStep('code');
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (resetNewPassword !== resetConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (resetNewPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword: resetNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setResetDone(true);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundPattern}></div>

      <div className="responsive-container" style={styles.content}>
        <div style={styles.header}>
          <div style={styles.logoIcon}>
            <img src="/logo.png?v=2" alt="Inshop" style={{ width: 140, height: 40 }} />
          </div>
          <p style={styles.subtitle}>Inventory & Sales Management System</p>
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

        {verifyEmail && !verified ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button onClick={() => { setVerifyEmail(''); setVerifyCode(''); setError(''); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>
                ← Back to login
              </button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ ...styles.logoIcon, background: 'linear-gradient(135deg, #22c55e, #16a34a)', width: '56px', height: '56px', margin: '0 auto 1rem' }}>
                <Mail size={28} color="white" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f1f5f9', margin: '0 0 0.5rem' }}>Verify Your Email</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                We sent a 6-digit code to <strong style={{ color: '#f1f5f9' }}>{verifyEmail}</strong>.<br />
                Enter it below to activate your account.
              </p>
            </div>
            <form onSubmit={handleVerify} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ ...styles.input, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                  placeholder="000000"
                  required
                />
              </div>
              <button type="submit" disabled={verifying || verifyCode.length !== 6} style={{ ...styles.button, opacity: verifying || verifyCode.length !== 6 ? 0.6 : 1 }}>
                {verifying ? 'Verifying...' : <><CheckCircle size={18} /> Verify & Activate</>}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button onClick={handleResendCode} style={{ background: 'none', border: 'none', color: resent ? '#22c55e' : '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <RefreshCw size={14} /> {resent ? 'Code resent!' : 'Resend code'}
              </button>
              <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.75rem' }}>
                Didn&apos;t receive the email? Check your spam folder.
              </p>
            </div>
          </div>
        ) : mode === 'login' && !showForgot && !resetDone ? (
          <form onSubmit={handleLogin} style={styles.form}>
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

            <div style={{ textAlign: 'center', marginTop: '-0.5rem' }}>
              <button type="button" onClick={() => { setShowForgot(true); setResetEmail(email); setError(''); setForgotStep('email'); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                Forgot Password?
              </button>
            </div>

            <p style={styles.switchText}>
              Don&apos;t have an account?{' '}
              <button onClick={() => setMode('register')} style={styles.switchLink}>
                Register here
              </button>
            </p>
          </form>
        ) : mode === 'login' && showForgot && !resetDone ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.5rem' }}>
              <button onClick={() => { setShowForgot(false); setResetEmail(''); setResetCode(''); setResetNewPassword(''); setResetConfirmPassword(''); setError(''); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <ArrowLeft size={14} /> Back to login
              </button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ ...styles.logoIcon, background: 'linear-gradient(135deg, #f59e0b, #d97706)', width: '56px', height: '56px', margin: '0 auto 1rem' }}>
                <KeyRound size={28} color="white" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f1f5f9', margin: '0 0 0.5rem' }}>Reset Password</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                {forgotStep === 'email' ? 'Enter your email and we\'ll send a reset code.' : `A 6-digit code was sent to ${resetEmail}. Enter it below with your new password.`}
              </p>
            </div>
            {forgotStep === 'email' ? (
              <form onSubmit={handleForgotPassword} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} style={styles.input} placeholder="Enter your email" required />
                </div>
                <button type="submit" disabled={resetLoading || !resetEmail} style={{ ...styles.button, opacity: resetLoading || !resetEmail ? 0.6 : 1 }}>
                  {resetLoading ? 'Sending...' : 'Send Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Reset Code</label>
                  <input type="text" maxLength={6} value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={{ ...styles.input, textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.5rem' }} placeholder="000000" required />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>New Password</label>
                  <input type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} style={styles.input} placeholder="Min 6 characters" required minLength={6} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Confirm Password</label>
                  <input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} style={styles.input} placeholder="Confirm new password" required />
                </div>
                <button type="submit" disabled={resetLoading || resetCode.length !== 6 || !resetNewPassword || !resetConfirmPassword} style={{ ...styles.button, opacity: resetLoading || resetCode.length !== 6 || !resetNewPassword || !resetConfirmPassword ? 0.6 : 1 }}>
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        ) : mode === 'login' && resetDone ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ ...styles.logoIcon, background: 'linear-gradient(135deg, #22c55e, #16a34a)', width: '56px', height: '56px', margin: '0 auto 1rem' }}>
              <CheckCircle size={28} color="white" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f1f5f9', margin: '0 0 0.5rem' }}>Password Reset!</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
              Your password has been updated. You can now log in.
            </p>
            <button onClick={() => { setResetDone(false); setShowForgot(false); setResetEmail(''); setResetCode(''); setResetNewPassword(''); setResetConfirmPassword(''); setError(''); }} style={styles.button}>
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Business Type</label>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={styles.select}>
                {SHOP_TYPES.map(st => (
                  <option key={st.type} value={st.type}>{st.name} {st.icon}</option>
                ))}
              </select>
            </div>

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
    width: '160px',
    height: '70px',
    borderRadius: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    boxShadow: '0 10px 25px -10px rgba(147, 159, 178, 0.4)',
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