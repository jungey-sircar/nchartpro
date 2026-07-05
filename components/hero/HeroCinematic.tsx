'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { type Theme } from '@/components/providers/ThemeProvider';

const HeroParticles = dynamic(() => import('./HeroParticles'), { ssr: false });

const TITLE = 'NChartPro';
const LETTER_STAGGER = 0.085;
const LETTER_DUR = 0.8;
const TITLE_TOTAL = TITLE.length * LETTER_STAGGER + LETTER_DUR;

interface Props { theme: Theme; start: boolean }

export default function HeroCinematic({ start }: Props) {
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.22;
    audio.muted = true;
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
      className={start ? 'hero-play' : ''}
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
      {/* ── RIGHT: hero illustration — slides in from the right ── */}
      <div
        className="hero-img-wrap"
        style={{
          position: 'absolute', top: 0, right: 0,
          width: '55%', height: '100%',
          zIndex: 1, overflow: 'hidden',
        }}
      >
        <img
          className="hero-img"
          src="/images/hero-trader.jpg"
          alt="Trader analyzing NChartPro candlestick charts"
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center center',
            display: 'block',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to right, var(--color-bg, #0d0d0f) 0%, rgba(13,13,15,0.7) 30%, rgba(13,13,15,0.1) 60%, transparent 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top, var(--color-bg, #0d0d0f) 0%, rgba(13,13,15,0.3) 25%, transparent 50%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, var(--color-bg, #0d0d0f) 0%, rgba(13,13,15,0.2) 15%, transparent 35%)',
        }} />
      </div>

      {/* ── Three.js depth particles + floating candlesticks ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        {start && <HeroParticles />}
      </div>

      {/* ── LEFT: letter-by-letter title, then subtitle → description → CTA ── */}
      <div
        style={{
          position: 'relative', zIndex: 3,
          padding: '0 5vw', width: '62%',
          userSelect: 'none',
        }}
      >
        <h1
          data-testid="hero-title"
          aria-label={TITLE}
          style={{
            margin: 0,
            fontSize: 'clamp(3.2rem, 8.5vw, 7.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.02,
            whiteSpace: 'nowrap',
          }}
        >
          {TITLE.split('').map((ch, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="hero-letter"
              style={{ animationDelay: `${(i * LETTER_STAGGER).toFixed(3)}s` }}
            >
              {ch}
            </span>
          ))}
        </h1>

        <p
          className="hero-seq"
          data-testid="hero-subtitle"
          style={{
            margin: '1.6rem 0 0',
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
            fontWeight: 600,
            color: 'var(--text-primary, #ececf1)',
            letterSpacing: '-0.015em',
            animationDelay: `${(TITLE_TOTAL + 0.1).toFixed(2)}s`,
          }}
        >
          Charts that think like a trader.
        </p>

        <p
          className="hero-seq"
          style={{
            margin: '0.9rem 0 0',
            maxWidth: 480,
            fontSize: 'clamp(0.85rem, 1.1vw, 1rem)',
            lineHeight: 1.65,
            color: 'var(--text-secondary, #9b9ba6)',
            animationDelay: `${(TITLE_TOTAL + 0.4).toFixed(2)}s`,
          }}
        >
          Professional charting, AI-powered market analysis, and advanced
          screening tools — everything a modern trader needs to see the market clearly.
        </p>

        <div
          className="hero-seq"
          style={{
            marginTop: '2.2rem',
            display: 'flex', gap: '0.9rem', alignItems: 'center',
            animationDelay: `${(TITLE_TOTAL + 0.7).toFixed(2)}s`,
          }}
        >
          <a
            href="#pricing"
            data-testid="hero-cta-primary"
            className="hero-cta-primary"
          >
            Get Started Free
          </a>
          <a
            href="#story"
            data-testid="hero-cta-secondary"
            className="hero-cta-ghost"
          >
            Explore the Story ↓
          </a>
        </div>
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
      </div>

      <style>{`
        @keyframes scroll-bounce{0%,100%{opacity:.35;transform:translateX(-50%) translateY(0)}50%{opacity:.85;transform:translateX(-50%) translateY(5px)}}

        .hero-letter {
          display: inline-block;
          opacity: 0;
          background: linear-gradient(135deg, #e8c484 0%, #B284BE 55%, #8b7cf6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-play .hero-letter {
          animation: heroLetterIn ${LETTER_DUR}s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes heroLetterIn {
          0%   { opacity: 0; transform: translateX(-46px) translateY(14px); filter: blur(14px); text-shadow: none; }
          55%  { opacity: 1; filter: blur(2px); text-shadow: 0 0 34px rgba(232,196,132,0.85); }
          100% { opacity: 1; transform: translateX(0) translateY(0); filter: blur(0); text-shadow: 0 0 18px rgba(178,132,190,0.25); }
        }

        .hero-seq { opacity: 0; }
        .hero-play .hero-seq {
          animation: heroSeqIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes heroSeqIn {
          from { opacity: 0; transform: translateY(22px); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        .hero-img-wrap { opacity: 0; transform: translateX(10%); filter: blur(18px); }
        .hero-play .hero-img-wrap {
          animation: heroImgIn 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.25s forwards;
        }
        @keyframes heroImgIn {
          from { opacity: 0; transform: translateX(10%) scale(1.06); filter: blur(18px); }
          to   { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
        }
        .hero-img { opacity: 0.55; }
        .hero-play .hero-img {
          animation: heroImgFloat 7s ease-in-out 1.8s infinite;
        }
        @keyframes heroImgFloat {
          0%, 100% { transform: translateY(0) scale(1.02); }
          50%      { transform: translateY(-12px) scale(1.035); }
        }

        .hero-cta-primary {
          display: inline-flex; align-items: center;
          padding: 0.72rem 1.6rem; border-radius: 999px;
          background: linear-gradient(135deg, #8b7cf6, #B284BE);
          color: #fff; font-weight: 700; font-size: 0.9rem;
          text-decoration: none; letter-spacing: -0.01em;
          box-shadow: 0 4px 24px rgba(139,124,246,0.35);
          transition: transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s;
        }
        .hero-cta-primary:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 8px 34px rgba(139,124,246,0.5); }
        .hero-cta-ghost {
          display: inline-flex; align-items: center;
          padding: 0.72rem 1.4rem; border-radius: 999px;
          border: 1px solid var(--border, rgba(255,255,255,0.14));
          color: var(--text-secondary, #9b9ba6); font-weight: 600; font-size: 0.9rem;
          text-decoration: none; background: var(--glass-bg, rgba(255,255,255,0.04));
          backdrop-filter: blur(8px);
          transition: color 0.2s, border-color 0.2s, transform 0.2s;
        }
        .hero-cta-ghost:hover { color: var(--text-primary, #ececf1); border-color: rgba(232,196,132,0.45); transform: translateY(-2px); }
      `}</style>
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
