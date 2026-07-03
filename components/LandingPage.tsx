'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from './ThemeProvider';
import Header from './Header';
import HeroSection from './HeroSection';
import GlassCardsSection from './GlassCardsSection';
import PricingSection from './PricingSection';
import Footer from './Footer';
import AuthModal, { type AuthUser } from './AuthModal';
import MatrixCanvas from './MatrixCanvas';
import LightTrails from './LightTrails';

export default function LandingPage() {
  const { theme } = useTheme();
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showTrails, setShowTrails] = useState(true);

  // Check current session on mount
  useEffect(() => {
    fetch('/api/v1/user/me', { credentials: 'include' })
      .then(async res => {
        if (!res.ok) return null;
        const data = await res.json();
        return data;
      })
      .then(data => { if (data?.user) setUser(data.user); })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  // Periodic session check — detect if another device logged in (every 30s)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/v1/user/me', { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.error === 'session_replaced') {
            clearInterval(interval);
            alert('You are trying to login from another device, press OK');
            setUser(null);
          }
        }
      } catch {
        // Network error — ignore, will retry next interval
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [user]);

  const handleLoginClick  = useCallback(() => setShowAuth(true), []);
  const handleAuthSuccess = useCallback((u: AuthUser) => { setUser(u); setShowAuth(false); }, []);
  const handleLogout      = useCallback(async () => {
    try { await fetch('/api/v1/user/logout', { method: 'POST', credentials: 'include' }); }
    catch { /* best-effort */ }
    setUser(null);
  }, []);

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
      {/* Layer 1: velvet image, blurred (filter: blur on the div itself) */}
      <div className="page-bg" />
      {/* Layer 2: sharp gradient overlay for readability/depth, no blur */}
      <div className="page-overlay" />

      {/* Layer 3: Falling candlestick rain — fixed, full-page */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <MatrixCanvas theme={theme} />
      </div>

      {/* Fixed header — 48px height */}
      <Header user={user} onLoginClick={handleLoginClick} onLogout={handleLogout} />

      {/* Main content — padded top for header, padded bottom for sticky footer */}
      <main style={{ paddingTop: 48, paddingBottom: 38 }}>
        <HeroSection theme={theme} />
        <GlassCardsSection />
        <PricingSection />
      </main>

      {/* Fixed single-line footer — 38px height */}
      <Footer />

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />
      )}

      {/* Cinematic light-trail intro — plays once, then unmounts */}
      {showTrails && <LightTrails onComplete={() => setShowTrails(false)} />}
    </>
  );
}
