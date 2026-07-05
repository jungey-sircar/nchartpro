'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import Header from '@/components/layout/Header';
import HeroCinematic from '@/components/hero/HeroCinematic';
import Footer from '@/components/layout/Footer';
import AuthModal, { type AuthUser } from '@/components/modals/AuthModal';
import MatrixCanvas from '@/components/effects/MatrixCanvas';
import LightTrails from '@/components/effects/LightTrails';
import ScrollPerspective from '@/components/effects/ScrollPerspective';
import CanvasCursor from '@/components/effects/CanvasCursor';
import Immersive3DScene from '@/components/sections/Immersive3DScene';
import PricingSection from '@/components/sections/PricingSection';
import CandleLoader from '@/components/effects/CandleLoader';
import StoryPresentation from '@/components/sections/StoryPresentation';
import SmoothScroll from '@/components/effects/SmoothScroll';

export default function LandingPage() {
  const { theme } = useTheme();
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const [showTrails, setShowTrails] = useState(false);

  // Check current session on mount
  useEffect(() => {
    fetch('/api/v1/user/me', { credentials: 'include' })
      .then(async res => {
        if (!res.ok) return null;
        const data = await res.json();
        return data;
      })
      .then(data => { if (data?.user) setUser(data.user); })
      .catch(() => {});
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
        <ScrollPerspective>
          <HeroCinematic theme={theme} start={loaderDone} />
          <StoryPresentation />
          <Immersive3DScene />
          <PricingSection />
        </ScrollPerspective>
      </main>

      {/* Fixed single-line footer — 38px height */}
      <Footer />

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />
      )}

      {/* Candlestick-matrix loading scene — plays once, reveals hero */}
      {!loaderDone && (
        <CandleLoader onComplete={() => { setLoaderDone(true); setShowTrails(true); }} />
      )}

      {/* Cinematic light-trail intro — plays once, then unmounts */}
      {showTrails && <LightTrails onComplete={() => setShowTrails(false)} />}

      {/* Lenis smooth scrolling */}
      <SmoothScroll />

      {/* Canvas cursor trail effect */}
      <CanvasCursor />
    </>
  );
}
