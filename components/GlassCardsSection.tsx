'use client';

import { useRef, useCallback } from 'react';

interface CardData {
  slogan: string;
  description: string;
  emoji: string;
}

const CARDS: CardData[] = [
  {
    slogan: 'Track Every Move',
    description:
      'Real-time candlestick charts with advanced indicators — MACD, RSI, Bollinger Bands, and more — keep you precisely ahead of the market at every moment.',
    emoji: '📈',
  },
  {
    slogan: 'Filter the Noise',
    description:
      'Powerful multi-factor screening tools let you cut through thousands of instruments instantly and surface exactly what matters to your strategy.',
    emoji: '🔍',
  },
  {
    slogan: 'AI-Powered Insights',
    description:
      "NChartPro's MCP module calls frontier AI to analyze your charts, flag patterns, and generate human-readable market commentary — in real time.",
    emoji: '🤖',
  },
  {
    slogan: 'Portfolio at a Glance',
    description:
      'Monitor every position, P&L, and exposure across all your holdings in a single compact dashboard that updates live with every tick.',
    emoji: '💼',
  },
];

const TILT_MAX = 18; // max tilt degrees on hover

function Feature3DCard({ data, index }: { data: CardData; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * TILT_MAX;
    const rotateX = (0.5 - y) * TILT_MAX;

    card.style.transform = `perspective(600px) rotateX(${rotateX.toFixed(1)}deg) rotateY(${rotateY.toFixed(1)}deg) scale(1.04)`;
    glow.style.background = `radial-gradient(circle at ${(x * 100).toFixed(0)}% ${(y * 100).toFixed(0)}%, rgba(99, 102, 241, 0.18) 0%, transparent 60%)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (card) card.style.transform = 'perspective(600px) rotateX(0) rotateY(0) scale(1)';
    if (glow) glow.style.background = 'transparent';
  }, []);

  // Stagger animation delay per card
  const isLeftCol = index % 2 === 0;
  const row = Math.floor(index / 2);

  return (
    <div
      data-scroll-3d={isLeftCol ? 'card-depth-left' : 'card-depth-right'}
      style={{
        transformOrigin: isLeftCol ? 'left center' : 'right center',
        willChange: 'transform, opacity',
        // Stagger: offset right-column cards down
        marginTop: !isLeftCol && row === 0 ? '3rem' : 0,
      }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="glass-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '2.25rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          cursor: 'default',
          transition: 'transform 0.2s ease-out, box-shadow 0.3s ease',
          transformStyle: 'preserve-3d',
          minHeight: 240,
        }}
      >
        {/* Hover glow overlay */}
        <div
          ref={glowRef}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            transition: 'background 0.15s ease',
            zIndex: 0,
          }}
        />

        {/* Content */}
        <span style={{
          fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
          lineHeight: 1,
          position: 'relative',
          zIndex: 1,
        }}>
          {data.emoji}
        </span>

        <h3 style={{
          margin: 0,
          fontSize: 'var(--fs-xl)',
          fontWeight: 700,
          color: 'var(--accent)',
          letterSpacing: '-0.02em',
          position: 'relative',
          zIndex: 1,
        }}>
          {data.slogan}
        </h3>

        <p style={{
          margin: 0,
          fontSize: 'var(--fs-sm)',
          lineHeight: 1.75,
          color: 'var(--text-secondary)',
          position: 'relative',
          zIndex: 1,
        }}>
          {data.description}
        </p>

        {/* Bottom accent line */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '10%',
          right: '10%',
          height: 2,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          opacity: 0.4,
        }} />
      </div>
    </div>
  );
}

export default function GlassCardsSection() {
  return (
    <section
      id="features"
      style={{
        position: 'relative',
        padding: '5rem 4rem 3rem',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Section heading */}
      <div
        data-scroll-3d="fade-up"
        style={{
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          willChange: 'transform, opacity',
          marginBottom: '3.5rem',
        }}
      >
        <h2
          className="gradient-text"
          style={{
            fontSize: 'var(--fs-4xl)',
            fontWeight: 800,
            margin: 0,
            letterSpacing: '-0.03em',
          }}
        >
          Why NChartPro?
        </h2>
        <p style={{
          marginTop: '0.875rem',
          fontSize: 'var(--fs-md)',
          color: 'var(--text-secondary)',
        }}>
          Premium tools for the Nepali market.
        </p>
      </div>

      {/* 2-column staggered card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        {CARDS.map((card, i) => (
          <Feature3DCard key={card.slogan} data={card} index={i} />
        ))}
      </div>
    </section>
  );
}
