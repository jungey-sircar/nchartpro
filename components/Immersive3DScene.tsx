'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════
// FEATURE DATA
// ═══════════════════════════════════════════════════════════════════
interface FeatureCard {
  slogan: string;
  description: string;
  emoji: string;
}

const FEATURES: FeatureCard[] = [
  { slogan: 'Track Every Move', description: 'Real-time candlestick charts with advanced indicators — MACD, RSI, Bollinger Bands, and more — keep you precisely ahead of the market at every moment.', emoji: '📈' },
  { slogan: 'Filter the Noise', description: 'Powerful multi-factor screening tools let you cut through thousands of instruments instantly and surface exactly what matters to your strategy.', emoji: '🔍' },
  { slogan: 'AI-Powered Insights', description: "NChartPro's MCP module calls frontier AI to analyze your charts, flag patterns, and generate human-readable market commentary — in real time.", emoji: '🤖' },
  { slogan: 'Portfolio at a Glance', description: 'Monitor every position, P&L, and exposure across all your holdings in a single compact dashboard that updates live with every tick.', emoji: '💼' },
];

// ═══════════════════════════════════════════════════════════════════
// CYLINDER CONFIG
// ═══════════════════════════════════════════════════════════════════
const CYL_PANELS     = 16;
const CYL_RADIUS     = 140;
const CANDLES_PER    = 4;
const ORBIT_RADIUS   = 480;
const AUTO_SPEED     = 0.12;

interface MiniCandle { bodyH: number; wickTop: number; wickBot: number; up: boolean; }

function randomMiniCandle(): MiniCandle {
  return { bodyH: 10 + Math.random() * 24, wickTop: 3 + Math.random() * 10, wickBot: 3 + Math.random() * 10, up: Math.random() > 0.5 };
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function Immersive3DScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRef  = useRef(0);
  const mouseRef     = useRef({ x: 0, y: 0 });
  const sceneRef     = useRef<HTMLDivElement>(null);
  const cardRefs     = useRef<(HTMLDivElement | null)[]>([]);

  const [cylPanels] = useState(() => {
    const panels: MiniCandle[][] = [];
    for (let i = 0; i < CYL_PANELS; i++) {
      const candles: MiniCandle[] = [];
      for (let j = 0; j < CANDLES_PER; j++) candles.push(randomMiniCandle());
      panels.push(candles);
    }
    return panels;
  });

  const [glowIdx, setGlowIdx] = useState(-1);
  const [focusedCard, setFocusedCard] = useState<number | null>(null);

  useEffect(() => {
    const iv = setInterval(() => setGlowIdx(Math.floor(Math.random() * CYL_PANELS)), 1500);
    return () => clearInterval(iv);
  }, []);

  // Animation loop — updates scene AND card counter-rotations every frame
  useEffect(() => {
    const container = containerRef.current;
    const scene = sceneRef.current;
    if (!container || !scene) return;

    let animId: number;

    function handleMouse(e: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mouseRef.current = {
        x: ((e.clientX - cx) / (rect.width / 2)) * 8,
        y: ((e.clientY - cy) / (rect.height / 2)) * -6,
      };
    }

    function handleLeave() { mouseRef.current = { x: 0, y: 0 }; }

    function animate() {
      animId = requestAnimationFrame(animate);
      rotationRef.current += AUTO_SPEED;
      const sceneRotY = rotationRef.current;
      const my = mouseRef.current.y;

      scene!.style.transform = `rotateX(${my.toFixed(1)}deg) rotateY(${sceneRotY.toFixed(1)}deg)`;

      // Dynamically counter-rotate each feature card so text always faces the viewer
      for (let i = 0; i < FEATURES.length; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        const cardBaseAngle = (i / FEATURES.length) * 360 + 45;
        // The card's world rotation = sceneRotY + cardBaseAngle
        // To face the camera, counter-rotate by -(sceneRotY + cardBaseAngle)
        const counterRotY = -(sceneRotY + cardBaseAngle);
        card.style.transform =
          `translate(-50%, -50%) rotateY(${cardBaseAngle}deg) translateZ(${ORBIT_RADIUS}px) rotateY(${counterRotY.toFixed(1)}deg)`;
      }
    }

    container.addEventListener('mousemove', handleMouse);
    container.addEventListener('mouseleave', handleLeave);
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousemove', handleMouse);
      container.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  const handleCardClick = useCallback((index: number) => {
    setFocusedCard(index);
  }, []);

  const dismissCard = useCallback(() => {
    setFocusedCard(null);
  }, []);

  return (
    <section
      id="features"
      style={{
        position: 'relative',
        padding: '4rem 2rem 3rem',
        minHeight: '90vh',
      }}
    >
      {/* Section heading */}
      <div data-scroll-3d="fade-up" style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative', zIndex: 10, willChange: 'transform, opacity' }}>
        <h2 className="gradient-text" style={{ fontSize: 'var(--fs-4xl)', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
          Why NChartPro?
        </h2>
        <p style={{ marginTop: '0.5rem', fontSize: 'var(--fs-md)', color: 'var(--text-secondary)' }}>
          Click any feature to learn more.
        </p>
      </div>

      {/* 3D Scene Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: 1200,
          height: 700,
          margin: '0 auto',
          perspective: '1200px',
          perspectiveOrigin: '50% 45%',
          cursor: 'grab',
          position: 'relative',
        }}
      >
        <div
          ref={sceneRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* ══════ CENTRAL CYLINDER ══════ */}
          {cylPanels.map((candles, i) => {
            const angle = (i / CYL_PANELS) * 360;
            return (
              <div
                key={`cyl-${i}`}
                style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  transform: `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${CYL_RADIUS}px)`,
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '6px 3px',
                  background: 'rgba(13, 13, 15, 0.5)',
                  borderRadius: 4,
                  border: '1px solid rgba(99, 102, 241, 0.1)',
                  pointerEvents: 'none',
                }}
              >
                {candles.map((c, j) => {
                  const totalH = c.wickTop + c.bodyH + c.wickBot;
                  const color = c.up ? '#34d399' : '#f87171';
                  const isGlow = glowIdx === i;
                  return (
                    <div key={j} style={{ position: 'relative', width: 12, height: totalH, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 1.5, height: c.wickTop, background: 'rgba(167,139,250,0.5)' }} />
                      <div style={{
                        width: 8, height: c.bodyH, background: color, borderRadius: 1,
                        boxShadow: isGlow ? `0 0 10px ${c.up ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)'}` : 'none',
                      }} />
                      <div style={{ width: 1.5, height: c.wickBot, background: 'rgba(167,139,250,0.5)' }} />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ══════ FEATURE CARDS ══════ */}
          {FEATURES.map((feat, i) => {
            const cardBaseAngle = (i / FEATURES.length) * 360 + 45;
            return (
              <div
                key={`feat-${i}`}
                ref={el => { cardRefs.current[i] = el; }}
                onClick={(e) => { e.stopPropagation(); handleCardClick(i); }}
                style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: 230,
                  // Initial transform — will be overridden each frame by the animation loop
                  transform: `translate(-50%, -50%) rotateY(${cardBaseAngle}deg) translateZ(${ORBIT_RADIUS}px) rotateY(-${cardBaseAngle}deg)`,
                  transformStyle: 'preserve-3d',
                  padding: '1.25rem 1rem',
                  borderRadius: 18,
                  background: 'rgba(20, 20, 24, 0.80)',
                  border: '1px solid var(--border)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                } as React.CSSProperties}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(99,102,241,0.25), 0 12px 40px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
              >
                <span style={{ fontSize: '2rem', lineHeight: 1 }}>{feat.emoji}</span>
                <h3 style={{ margin: '0.5rem 0 0.35rem', fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.01em' }}>
                  {feat.slogan}
                </h3>
                <p style={{ margin: 0, fontSize: 'var(--fs-xs)', lineHeight: 1.6, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                  {feat.description}
                </p>
                <div style={{ marginTop: '0.6rem', fontSize: '10px', color: 'var(--accent)', opacity: 0.6, textAlign: 'center' }}>
                  Click to explore →
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floor reflection */}
      <div style={{
        width: 600, height: 40, margin: '-10px auto 0',
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
        filter: 'blur(14px)', pointerEvents: 'none',
      }} />

      {/* ══════ FOCUSED CARD OVERLAY ══════ */}
      {focusedCard !== null && (
        <>
          <div
            onClick={dismissCard}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              animation: 'fadeIn 0.3s ease',
            } as React.CSSProperties}
          />
          <div
            onClick={dismissCard}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 500, maxWidth: '90vw',
                padding: '2.5rem 2rem',
                borderRadius: 24,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(13,13,15,0.95) 100%)',
                border: '1px solid rgba(99,102,241,0.4)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 0 80px rgba(99,102,241,0.2), 0 40px 100px rgba(0,0,0,0.6)',
                animation: 'cardZoomIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                textAlign: 'center',
                position: 'relative',
              } as React.CSSProperties}
            >
              <span style={{ fontSize: '4rem', lineHeight: 1, display: 'block', marginBottom: '1rem' }}>
                {FEATURES[focusedCard].emoji}
              </span>
              <h3 style={{ margin: '0 0 1rem', fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                {FEATURES[focusedCard].slogan}
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--fs-md)', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                {FEATURES[focusedCard].description}
              </p>
              <button
                onClick={dismissCard}
                style={{
                  marginTop: '1.5rem', padding: '0.6rem 2rem', borderRadius: 12,
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', cursor: 'pointer',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                Close
              </button>
              <div style={{
                position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2,
                background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.5,
              }} />
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes cardZoomIn { from { opacity: 0; transform: scale(0.7) translateY(40px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          `}</style>
        </>
      )}
    </section>
  );
}
