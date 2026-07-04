'use client';

import { useRef, useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════
const PANEL_COUNT     = 20;       // candlestick panels around the cylinder
const RADIUS          = 220;      // cylinder radius (px)
const AUTO_SPEED      = 0.15;     // degrees per frame (auto-rotation)
const MOUSE_TILT      = 12;       // max tilt degrees from mouse
const CANDLES_PER_PANEL = 4;      // mini candlesticks per panel

// ═══════════════════════════════════════════════════════════════════
// Random candlestick shape
// ═══════════════════════════════════════════════════════════════════
interface MiniCandle {
  bodyH:   number;
  wickTop: number;
  wickBot: number;
  up:      boolean;
}

function randomMiniCandle(): MiniCandle {
  return {
    bodyH:   12 + Math.random() * 28,
    wickTop: 4 + Math.random() * 12,
    wickBot: 4 + Math.random() * 12,
    up:      Math.random() > 0.5,
  };
}

// Pre-generate panels
interface Panel {
  candles: MiniCandle[];
  angle: number;
}

function buildPanels(): Panel[] {
  const panels: Panel[] = [];
  const step = 360 / PANEL_COUNT;
  for (let i = 0; i < PANEL_COUNT; i++) {
    const candles: MiniCandle[] = [];
    for (let j = 0; j < CANDLES_PER_PANEL; j++) {
      candles.push(randomMiniCandle());
    }
    panels.push({ candles, angle: i * step });
  }
  return panels;
}

// ═══════════════════════════════════════════════════════════════════
// Single candlestick rendered as divs
// ═══════════════════════════════════════════════════════════════════
function CandlestickDiv({ candle, glow }: { candle: MiniCandle; glow: boolean }) {
  const totalH = candle.wickTop + candle.bodyH + candle.wickBot;
  const color = candle.up ? '#34d399' : '#f87171';
  const glowColor = candle.up ? 'rgba(52, 211, 153, 0.6)' : 'rgba(248, 113, 113, 0.6)';

  return (
    <div style={{
      position: 'relative',
      width: 14,
      height: totalH,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Upper wick */}
      <div style={{
        width: 1.5,
        height: candle.wickTop,
        background: `rgba(167, 139, 250, 0.5)`,
      }} />
      {/* Body */}
      <div style={{
        width: 10,
        height: candle.bodyH,
        background: color,
        borderRadius: 1,
        boxShadow: glow ? `0 0 12px ${glowColor}, 0 0 24px ${glowColor}` : 'none',
        transition: 'box-shadow 0.3s ease',
      }} />
      {/* Lower wick */}
      <div style={{
        width: 1.5,
        height: candle.wickBot,
        background: `rgba(167, 139, 250, 0.5)`,
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════
export default function CandleCylinder() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRef  = useRef(0);
  const mouseRef     = useRef({ x: 0, y: 0 });
  const [panels]     = useState(() => buildPanels());
  const [glowIndex, setGlowIndex] = useState(-1);

  // Random glow cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setGlowIndex(Math.floor(Math.random() * PANEL_COUNT));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotation + mouse tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleMouse(e: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mouseRef.current = {
        x: ((e.clientX - cx) / (rect.width / 2)) * MOUSE_TILT,
        y: ((e.clientY - cy) / (rect.height / 2)) * -MOUSE_TILT,
      };
    }

    function handleMouseLeave() {
      mouseRef.current = { x: 0, y: 0 };
    }

    let animId: number;
    const cylinderEl = container.querySelector('.cylinder-inner') as HTMLElement;

    function animate() {
      animId = requestAnimationFrame(animate);
      rotationRef.current += AUTO_SPEED;

      if (cylinderEl) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        cylinderEl.style.transform =
          `rotateX(${my.toFixed(1)}deg) rotateY(${rotationRef.current.toFixed(1)}deg)`;
      }
    }

    container.addEventListener('mousemove', handleMouse);
    container.addEventListener('mouseleave', handleMouseLeave);
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousemove', handleMouse);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <section
      data-scroll-3d="cylinder-spin"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6rem 2rem',
        minHeight: '70vh',
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
      }}
    >
      {/* Section heading */}
      <h2
        className="gradient-text"
        style={{
          fontSize: 'var(--fs-3xl)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          margin: '0 0 1rem',
          textAlign: 'center',
        }}
      >
        Built for the Markets
      </h2>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: 'var(--fs-md)',
        marginBottom: '3.5rem',
        textAlign: 'center',
      }}>
        Every candle tells a story. See them come alive.
      </p>

      {/* 3D cylinder container */}
      <div
        ref={containerRef}
        style={{
          width: RADIUS * 2 + 120,
          height: 320,
          perspective: '900px',
          perspectiveOrigin: '50% 50%',
          cursor: 'grab',
        }}
      >
        <div
          className="cylinder-inner"
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'none',
          }}
        >
          {panels.map((panel, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `
                  translate(-50%, -50%)
                  rotateY(${panel.angle}deg)
                  translateZ(${RADIUS}px)
                `,
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '8px 4px',
                background: 'rgba(13, 13, 15, 0.4)',
                borderRadius: 4,
                border: '1px solid rgba(99, 102, 241, 0.12)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {panel.candles.map((c, j) => (
                <CandlestickDiv
                  key={j}
                  candle={c}
                  glow={glowIndex === i}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Reflection glow beneath */}
      <div style={{
        width: RADIUS * 1.6,
        height: 40,
        marginTop: '-10px',
        background: 'radial-gradient(ellipse, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        filter: 'blur(12px)',
        pointerEvents: 'none',
      }} />
    </section>
  );
}
