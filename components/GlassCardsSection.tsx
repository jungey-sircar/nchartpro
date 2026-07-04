'use client';


interface CardData {
  slogan: string;
  description: string;
  emoji: string;
  side: 'left' | 'right';
}

const CARDS: CardData[] = [
  {
    slogan: 'Track Every Move',
    description:
      'Real-time candlestick charts with advanced indicators — MACD, RSI, Bollinger Bands, and more — keep you precisely ahead of the market at every moment.',
    emoji: '📈',
    side: 'left',
  },
  {
    slogan: 'Filter the Noise',
    description:
      'Powerful multi-factor screening tools let you cut through thousands of instruments instantly and surface exactly what matters to your strategy.',
    emoji: '🔍',
    side: 'right',
  },
  {
    slogan: 'AI-Powered Insights',
    description:
      "NChartPro's MCP module calls frontier AI to analyze your charts, flag patterns, and generate human-readable market commentary — in real time.",
    emoji: '🤖',
    side: 'left',
  },
  {
    slogan: 'Portfolio at a Glance',
    description:
      'Monitor every position, P&L, and exposure across all your holdings in a single compact dashboard that updates live with every tick.',
    emoji: '💼',
    side: 'right',
  },
];



function GlassCard({ data }: { data: CardData }) {
  const isLeft = data.side === 'left';

  // Card element
  const cardEl = (
    <div
      style={{
        display: 'flex',
        justifyContent: isLeft ? 'flex-end' : 'flex-start',
        paddingRight: isLeft ? '3rem' : 0,
        paddingLeft: isLeft ? 0 : '3rem',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: 'clamp(180px, 22vw, 280px)',
          aspectRatio: '1 / 1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.75rem',
          textAlign: 'center',
          gap: '0.875rem',
        }}
      >
        <span style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1 }}>{data.emoji}</span>
        <h3 style={{
          margin: 0,
          fontSize: 'var(--fs-xl)',
          fontWeight: 700,
          color: 'var(--accent)',
          letterSpacing: '-0.02em',
        }}>
          {data.slogan}
        </h3>
      </div>
    </div>
  );

  // Description element
  const descEl = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isLeft ? 'flex-start' : 'flex-end',
        paddingLeft: isLeft ? '3rem' : 0,
        paddingRight: isLeft ? 0 : '3rem',
      }}
    >
      <p style={{
        margin: 0,
        fontSize: 'var(--fs-md)',
        lineHeight: 1.75,
        color: 'var(--text-secondary)',
        maxWidth: 420,
      }}>
        {data.description}
      </p>
    </div>
  );

  return (
    <div
      data-scroll-3d={isLeft ? 'card-depth-left' : 'card-depth-right'}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        width: '100%',
        position: 'relative',
        zIndex: 1,
        transformOrigin: isLeft ? 'left center' : 'right center',
        willChange: 'transform, opacity',
      }}
    >
      {isLeft ? cardEl : descEl}
      {isLeft ? descEl : cardEl}
    </div>
  );
}

export default function GlassCardsSection() {
  return (
    <section
      id="features"
      style={{
        position: 'relative',
        padding: '5rem 4rem 6rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '4.5rem',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Dashed vertical spine connecting all cards — timeline style */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: '10rem',        // starts below heading
          bottom: '4rem',
          width: 0,
          borderLeft: '2px dashed var(--border-dash)',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div data-scroll-3d="fade-up" style={{ textAlign: 'center', position: 'relative', zIndex: 1, willChange: 'transform, opacity' }}>
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
      </div>

      {CARDS.map(card => (
        <GlassCard key={card.slogan} data={card} />
      ))}
    </section>
  );
}
