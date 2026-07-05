'use client';

import { useState, useEffect, useRef } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  contact: string;
}

interface Props {
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  initialTab?: 'login' | 'register';
}

type Tab = 'login' | 'register';

export default function AuthModal({ onClose, onSuccess, initialTab = 'login' }: Props) {
  const [tab, setTab]                       = useState<Tab>(initialTab);
  const [email, setEmail]                   = useState('');
  const [username, setUsername]             = useState('');
  const [contact, setContact]               = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function switchTab(t: Tab) { setTab(t); setError(''); }

  function validateLogin(): string {
    if (!email.trim()) return 'Email is required.';
    if (!password)     return 'Password is required.';
    return '';
  }

  function validateRegister(): string {
    if (!email.trim())              return 'Email is required.';
    if (!username.trim())           return 'Username is required.';
    if (username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!contact.trim())            return 'Contact number is required.';
    if (!/^[0-9+\-\s()]{7,20}$/.test(contact.trim())) return 'Enter a valid contact number.';
    if (!password)                  return 'Password is required.';
    if (password.length < 8)        return 'Password must be at least 8 characters.';
    if (!/\d/.test(password))       return 'Password must contain at least one number.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const err = validateLogin();
    if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/v1/user/login', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed. Please try again.'); return; }
      onSuccess(data.user);
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally  { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const err = validateRegister();
    if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/v1/user/register', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), username: username.trim(), contact: contact.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed. Please try again.'); return; }
      onSuccess(data.user);
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally  { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.875rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: 'var(--fs-sm)',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.3rem',
    fontSize: 'var(--fs-xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-muted)',
  };

  return (
    <>
      {/* Dimmed backdrop — click outside to close */}
      <div
        ref={overlayRef}
        onClick={e => { if (e.target === overlayRef.current) onClose(); }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 199,
          background: 'rgba(0,0,0,0.40)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      />

      {/* Dialog — centered on screen */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tab === 'login' ? 'Sign in' : 'Create account'}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 200,
          width: '100%',
          maxWidth: 400,
          /* Fixed height so login↔register switching never shifts position */
          minHeight: 520,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
          padding: '1.375rem',
          animation: 'auth-slide-in 0.18s ease',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: '0.75rem', right: '0.75rem',
            width: 28, height: 28, borderRadius: '50%',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', lineHeight: 1,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          ×
        </button>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          padding: '3px',
          marginBottom: '1.25rem',
          flexShrink: 0,
        }}>
          {(['login', 'register'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{
                flex: 1, padding: '0.45rem',
                borderRadius: 6, cursor: 'pointer',
                fontSize: 'var(--fs-sm)', fontWeight: 600,
                background: tab === t ? 'var(--accent)'      : 'transparent',
                color:      tab === t ? 'var(--color-on-dark)'               : 'var(--text-muted)',
                border:     tab === t ? '1px solid transparent' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Forms — both always mounted, visibility toggled to keep height stable */}
        <div style={{ display: tab === 'login' ? 'flex' : 'none', flexDirection: 'column', gap: '0.875rem', flex: 1 }}>
          <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1 }}>
            <Field label="Email" labelStyle={labelStyle}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
            </Field>
            <Field label="Password" labelStyle={labelStyle}>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
            </Field>

            {error && <ErrorBox msg={error} />}

            <div style={{ flex: 1 }} />

            <SubmitBtn loading={loading} label="Sign In" loadingLabel="Signing in…" />

            <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
              No account?{' '}
              <button type="button" onClick={() => switchTab('register')}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 'inherit', fontWeight: 600, padding: 0 }}>
                Register
              </button>
            </p>
          </form>
        </div>

        <div style={{ display: tab === 'register' ? 'flex' : 'none', flexDirection: 'column', gap: '0.875rem', flex: 1 }}>
          <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            <Field label="Email" labelStyle={labelStyle}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
            </Field>
            <Field label="Username" labelStyle={labelStyle}>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="your_username" autoComplete="username" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
            </Field>
            <Field label="Contact Number" labelStyle={labelStyle}>
              <input type="tel" value={contact} onChange={e => setContact(e.target.value)}
                placeholder="+977-9800000000" autoComplete="tel" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
            </Field>
            <Field label="Password" labelStyle={labelStyle}>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 chars, at least 1 number" autoComplete="new-password" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
            </Field>
            <Field label="Confirm Password" labelStyle={labelStyle}>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password" autoComplete="new-password" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
            </Field>

            {error && <ErrorBox msg={error} />}

            <div style={{ flex: 1 }} />

            <SubmitBtn loading={loading} label="Create Account" loadingLabel="Creating account…" />

            <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
              Have an account?{' '}
              <button type="button" onClick={() => switchTab('login')}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 'inherit', fontWeight: 600, padding: 0 }}>
                Sign In
              </button>
            </p>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes auth-slide-in {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}

function Field({ label, labelStyle, children }: { label: string; labelStyle: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: '0.5rem 0.75rem', borderRadius: 7,
      background: 'rgba(248,113,113,0.10)',
      border: '1px solid rgba(248,113,113,0.25)',
      color: '#f87171', fontSize: 'var(--fs-xs)',
    }}>
      {msg}
    </div>
  );
}

function SubmitBtn({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%', padding: '0.75rem',
        borderRadius: 10, border: 'none',
        background: 'var(--accent)', color: 'var(--color-on-dark)',
        fontSize: 'var(--fs-base)', fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
