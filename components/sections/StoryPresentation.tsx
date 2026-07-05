'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';
import CandleChart, { SCENARIO_META } from '@/components/charts/CandleChart';

// ═══════════════════════════════════════════════════════════════════
// PINNED SCROLL-DRIVEN STORYTELLING PRESENTATION
// One scroll = one slide. Left: morphing candlestick chart.
// Right: keynote-style slide. No buttons — scroll controls everything.
// ═══════════════════════════════════════════════════════════════════
const SLIDES = [
  { title: 'Built by Traders. For Traders.', sub: 'Every feature was created to solve real trading challenges.' },
  { title: 'Trust Yourself.', sub: 'Build confidence through knowledge, not tips.' },
  { title: 'Think Before the Market Moves.', sub: 'Prepare your decisions before everyone else reacts.' },
  { title: 'See Beyond the Chart.', sub: "Discover insights that ordinary charts don't reveal." },
  { title: 'Every Chart Has a Story.', sub: 'Discover the story behind every chart.' },
  { title: 'See the Story Behind the Data.', sub: 'Because numbers tell more than prices.' },
  { title: 'Turn Data Into Confidence.', sub: 'Make informed decisions with clarity and conviction.' },
  { title: 'Find the Signals That Matter.', sub: 'Focus on what moves the market—not the noise.' },
  { title: 'Discover the Bigger Picture.', sub: 'Connect market trends, data, and insights in one place.' },
  { title: 'Master the Market. Master Yourself.', sub: 'The greatest edge in trading is discipline.' },
];
const LAST = SLIDES.length - 1;

const TONE_COLORS: Record<string, string> = {
  up: '#34d399',
  down: '#f87171',
  flat: '#e8c484',
};

export default function StoryPresentation() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);           // scroll-driven index (chart follows this)
  const [displayIdx, setDisplayIdx] = useState(0); // text shown (lags during transition)
  const [active, setActive] = useState(false);
  const idxRef = useRef(0);
  const displayRef = useRef(0);
  const dirRef = useRef(1);
  const lastYRef = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // Animate slide text on index change: out (blur/slide/scale) → in
  const transitionTo = useCallback((next: number) => {
    if (next === displayRef.current) return;
    const el = textRef.current;
    if (!el) { displayRef.current = next; setDisplayIdx(next); return; }
    const dir = next > displayRef.current ? 1 : -1;
    displayRef.current = next;
    tlRef.current?.kill();
    tlRef.current = gsap.timeline()
      .to(el, { opacity: 0, y: -36 * dir, scale: 0.97, filter: 'blur(10px)', duration: 0.22, ease: 'power2.in' })
      .call(() => setDisplayIdx(next))
      .fromTo(el,
        { opacity: 0, y: 46 * dir, scale: 0.985, filter: 'blur(12px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.55, ease: 'power3.out' });
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    function metrics() {
      const rect = section!.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const vh = window.innerHeight;
      return { top, vh };
    }

    function onScroll() {
      const { top, vh } = metrics();
      const y = window.scrollY;
      const raw = (y - top) / vh;

      const delta = y - lastYRef.current;
      if (Math.abs(delta) > 1) dirRef.current = delta > 0 ? 1 : -1;
      lastYRef.current = y;

      const inRange = raw > -1 && raw < LAST + 1;
      setActive(inRange);

      const clamped = Math.max(0, Math.min(LAST, raw));
      const newIdx = Math.round(clamped);
      if (newIdx !== idxRef.current) {
        idxRef.current = newIdx;
        setIdx(newIdx);
        transitionTo(newIdx);
      }

      // Snap: after scrolling settles, glide to the next slide boundary (directional)
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (raw > -0.3 && raw < LAST + 0.3) {
        idleTimer.current = setTimeout(() => {
          const y2 = window.scrollY;
          const raw2 = (y2 - top) / vh;
          if (raw2 < -0.05 || raw2 > LAST + 0.05) return;
          const target = dirRef.current > 0
            ? Math.min(LAST, Math.ceil(raw2 - 0.12))
            : Math.max(0, Math.floor(raw2 + 0.12));
          const targetY = top + target * vh;
          if (Math.abs(targetY - y2) > 6) {
            const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o?: object) => void } }).__lenis;
            if (lenis) lenis.scrollTo(targetY, { duration: 0.75, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
            else window.scrollTo({ top: targetY, behavior: 'smooth' });
          }
        }, 160);
      }
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      tlRef.current?.kill();
    };
  }, [transitionTo]);

  const meta = SCENARIO_META[idx];
  const tone = TONE_COLORS[meta.tone];

  return (
    <section
      id="story"
      ref={sectionRef}
      data-testid="story-section"
      style={{ position: 'relative', height: `${(SLIDES.length + 1) * 100}vh` }}
    >
      <div
        style={{
          position: 'sticky', top: 0,
          height: '100vh', width: '100%',
          overflow: 'hidden',
          display: 'flex', alignItems: 'stretch',
          padding: 'clamp(56px, 8vh, 84px) clamp(16px, 3vw, 48px) clamp(24px, 5vh, 48px)',
          gap: 'clamp(16px, 2.5vw, 40px)',
          boxSizing: 'border-box',
        }}
      >
        {/* ── LEFT: morphing TradingView-style chart ── */}
        <div
          style={{
            flex: '1 1 58%',
            minWidth: 0,
            display: 'flex', flexDirection: 'column',
            borderRadius: 18,
            background: 'rgba(10, 12, 18, 0.72)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(14px)',
            overflow: 'hidden',
          }}
        >
          {/* Chart toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontFamily: 'monospace', fontSize: 11,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: '0.04em' }}>
              NEPSE:NCHART
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>1D</span>
            <span style={{ flex: 1 }} />
            <span
              data-testid="story-scenario-label"
              style={{
                padding: '3px 10px', borderRadius: 999,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                color: tone,
                background: `${tone}18`,
                border: `1px solid ${tone}40`,
                transition: 'color 0.5s, background 0.5s, border-color 0.5s',
                whiteSpace: 'nowrap',
              }}
            >
              {meta.label.toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <CandleChart scenario={idx} active={active} />
          </div>
        </div>

        {/* ── RIGHT: keynote slide ── */}
        <div
          style={{
            flex: '1 1 42%',
            minWidth: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '0 clamp(8px, 2vw, 32px)',
            position: 'relative',
          }}
        >
          <div ref={textRef} style={{ willChange: 'transform, opacity, filter' }}>
            <div style={{
              fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.35em', color: '#e8c484',
              marginBottom: '1.6rem',
            }}>
              {String(displayIdx + 1).padStart(2, '0')} — {String(SLIDES.length).padStart(2, '0')}
            </div>
            <h2
              data-testid="story-slide-title"
              style={{
                margin: 0,
                fontSize: 'clamp(1.9rem, 3.6vw, 3.4rem)',
                fontWeight: 800,
                letterSpacing: '-0.035em',
                lineHeight: 1.08,
                color: 'var(--text-primary, #ececf1)',
              }}
            >
              {SLIDES[displayIdx].title}
            </h2>
            <div style={{
              width: 54, height: 3, borderRadius: 2,
              background: 'linear-gradient(90deg, #e8c484, #B284BE)',
              margin: '1.8rem 0',
            }} />
            <p style={{
              margin: 0,
              fontSize: 'clamp(0.95rem, 1.3vw, 1.2rem)',
              lineHeight: 1.7,
              color: 'var(--text-secondary, #9b9ba6)',
              maxWidth: 420,
            }}>
              {SLIDES[displayIdx].sub}
            </p>
          </div>

          {/* Slide progress dots — indicator only, not buttons */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', right: 0, top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex', flexDirection: 'column', gap: 8,
              pointerEvents: 'none',
            }}
          >
            {SLIDES.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 4,
                  height: i === idx ? 22 : 8,
                  borderRadius: 3,
                  background: i === idx ? '#e8c484' : 'rgba(255,255,255,0.18)',
                  transition: 'height 0.35s cubic-bezier(0.22,1,0.36,1), background 0.35s',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
