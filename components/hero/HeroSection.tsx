'use client';

import { useState, useEffect, useRef } from 'react';
import { type Theme } from '@/components/providers/ThemeProvider';
import WordmarkCanvas from '@/components/hero/WordmarkCanvas';
import { useAdaptiveFontSize } from '@/app/hooks/useAdaptiveFontSize';

// CandleBackground intentionally removed — candles now appear exclusively
// inside the NChartPro letterforms via WordmarkCanvas (source-in masking).
// The hero background is the blurred velvet image from .page-bg.

interface Props { theme: Theme; }

export default function HeroSection({ theme }: Props) {
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wordmarkFontSize = useAdaptiveFontSize();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.22;
    audio.muted  = true;
    const p = audio.play();
    if (p !== undefined) p.catch(() => setAudioBlocked(true));
  }, []);

  function toggleSound() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioBlocked) {
      setAudioBlocked(false);
      setMuted(false);
      audio.muted = false;
      audio.play().catch(() => setAudioBlocked(true));
    } else {
      const next = !muted;
      setMuted(next);
      audio.muted = next;
    }
  }

  return (
    <section
      id="hero"
      data-scroll-3d="hero-tilt"
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: 560,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
      }}
    >
      {/* ── Hero trader image — large, blended into right side ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '55%',
          height: '100%',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <img
          src="/images/hero-trader.jpg"
          alt="Nepali trader analyzing NChartPro candlestick charts"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            display: 'block',
            opacity: 0.45,
          }}
        />
        {/* Left gradient fade — blends image into the dark background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, var(--color-bg, #0d0d0f) 0%, rgba(13, 13, 15, 0.7) 30%, rgba(13, 13, 15, 0.1) 60%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
        {/* Bottom gradient fade */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, var(--color-bg, #0d0d0f) 0%, rgba(13, 13, 15, 0.3) 25%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />
        {/* Top gradient fade */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, var(--color-bg, #0d0d0f) 0%, rgba(13, 13, 15, 0.2) 15%, transparent 35%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── NChartPro wordmark — positioned on the left ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          padding: '0 4vw',
          width: '65%',
          userSelect: 'none',
          overflow: 'visible',
        }}
      >
        <WordmarkCanvas fontSize={wordmarkFontSize} theme={theme} />
      </div>


      {/* Audio */}
      <audio ref={audioRef} src="/audio/background.mp3" loop />
      <button
        onClick={toggleSound}
        aria-label={audioBlocked ? 'Enable sound' : muted ? 'Unmute' : 'Mute'}
        style={{
          position: 'absolute', bottom: '1.25rem', left: '1.25rem', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.3rem 0.75rem', borderRadius: 999,
          background: 'var(--glass-bg)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)', fontSize: 'var(--fs-xs)', fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {muted || audioBlocked ? <SoundOffIcon /> : <SoundOnIcon />}
        {audioBlocked ? 'Tap to enable sound' : muted ? 'Sound off' : 'Sound on'}
      </button>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute', bottom: '1.25rem', left: '50%',
        transform: 'translateX(-50%)', zIndex: 10,
        color: 'var(--text-muted)', fontSize: 'var(--fs-xs)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        animation: 'scroll-bounce 2.2s ease-in-out infinite',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
        <style>{`@keyframes scroll-bounce{0%,100%{opacity:.35;transform:translateX(-50%) translateY(0)}50%{opacity:.85;transform:translateX(-50%) translateY(5px)}}`}</style>
      </div>
    </section>
  );
}

function SoundOnIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}
function SoundOffIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
