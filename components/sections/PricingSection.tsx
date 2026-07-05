'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Feature {
  name: string;
  description: string;
}

interface Tier {
  id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: Feature[];
  highlighted?: boolean;
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'NPR 0',
    period: 'forever',
    tagline: 'Start exploring the market.',
    features: [
      { name: '5 charts/day',    description: 'Access up to 5 live candlestick chart views per day across all instruments.' },
      { name: 'Basic indicators', description: 'Moving Average (MA) and Exponential Moving Average (EMA) included.' },
      { name: '1 watchlist',      description: 'Track up to 10 instruments in a single saved watchlist.' },
      { name: 'Delayed data',     description: 'Data is delayed by 15 minutes (no real-time stream).' },
    ],
  },
  {
    id: 'beginner',
    name: 'Beginner',
    price: 'NPR 299',
    period: '/month',
    tagline: 'Level up your analysis.',
    features: [
      { name: '20 charts/day',    description: 'Access up to 20 live candlestick chart views per day.' },
      { name: 'Standard indicators', description: 'MACD, RSI, Bollinger Bands, Stochastic, and more.' },
      { name: '5 watchlists',     description: 'Maintain up to 5 watchlists with unlimited instruments each.' },
      { name: 'Basic portfolio',  description: 'Track your positions and total P&L in real time.' },
      { name: 'Real-time data',   description: 'Live data feed with no delay.' },
    ],
  },
  {
    id: 'normal',
    name: 'Normal',
    price: 'NPR 599',
    period: '/month',
    tagline: 'Pro tools for active traders.',
    features: [
      { name: '50 charts/day',        description: 'Up to 50 simultaneous chart sessions per day.' },
      { name: 'Advanced indicators',  description: 'Full suite: Ichimoku, Fibonacci, Pivot Points, Volume Profile, and more.' },
      { name: '15 watchlists',        description: 'Organize instruments into 15 themed watchlists.' },
      { name: 'Full portfolio',       description: 'Detailed portfolio analytics with sector breakdown and risk metrics.' },
      { name: 'Filter feature',       description: 'Multi-factor screener to find instruments matching your criteria instantly.' },
    ],
  },
  {
    id: 'advance',
    name: 'Advance',
    price: 'NPR 999',
    period: '/month',
    tagline: 'Institutional-grade edge.',
    highlighted: true,
    features: [
      { name: '150 charts/day',       description: '150 chart sessions per day for deep multi-instrument analysis.' },
      { name: 'All indicators',       description: 'Every indicator in the platform, plus custom formula editor.' },
      { name: 'Unlimited watchlists', description: 'No limit on watchlists or instruments per list.' },
      { name: 'Kundali analysis',     description: 'Astrological market timing analysis — unique NChartPro feature.' },
      { name: 'MCP AI analysis',      description: 'AI-powered chart commentary and signal generation via the MCP module.' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'NPR 1,999',
    period: '/month',
    tagline: 'The complete platform.',
    features: [
      { name: 'Unlimited charts',   description: 'Unlimited chart sessions with no daily cap.' },
      { name: 'Priority API access', description: 'Dedicated low-latency data feed with higher rate limits.' },
      { name: 'Custom themes',      description: 'Create and share your own color themes with the NChartPro community.' },
      { name: 'Early access',       description: 'First access to new features before public release.' },
      { name: 'All Advance features', description: 'Everything in Advance, plus all Pro-exclusive benefits.' },
    ],
  },
];

const BOOK_PAGES = [
  { tier: TIERS[TIERS.length - 1], isGhost: true },
  ...TIERS.map((tier) => ({ tier, isGhost: false })),
  { tier: TIERS[0], isGhost: true },
];

const FIRST_REAL_PAGE_INDEX = 1;
const LAST_REAL_PAGE_INDEX = TIERS.length;
const LAST_BOOK_PAGE_INDEX = BOOK_PAGES.length - 1;

// Integration point — wire to eSewa payment flow when ready
export function handleSubscribeClick(tierId: string) {
  console.log(`Subscribe clicked for tier: ${tierId}`);
  alert(`Coming soon! eSewa payment for "${tierId}" tier will be wired here.`);
}

export default function PricingSection() {
  const bookRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState<Feature | null>(null);
  const [isFlipReady, setIsFlipReady] = useState(false);
  const isResettingPageRef = useRef(false);

  const normalizePageIndex = useCallback((pageIndex: number) => {
    if (pageIndex <= 0) return TIERS.length - 1;
    if (pageIndex >= LAST_BOOK_PAGE_INDEX) return 0;
    return pageIndex - 1;
  }, []);

  const snapToRealPage = useCallback((pageIndex: number) => {
    const pf = pageFlipRef.current;
    if (!pf || isResettingPageRef.current) return;

    isResettingPageRef.current = true;
    setCurrentPage(normalizePageIndex(pageIndex));

    if (typeof pf.turnToPage === 'function') {
      pf.turnToPage(pageIndex);
    }

    requestAnimationFrame(() => {
      isResettingPageRef.current = false;
    });
  }, [normalizePageIndex]);

  const handleFlip = useCallback((pageIndex: number) => {
    if (isResettingPageRef.current) return;

    if (pageIndex === 0) {
      snapToRealPage(LAST_REAL_PAGE_INDEX);
      return;
    }

    if (pageIndex === LAST_BOOK_PAGE_INDEX) {
      snapToRealPage(FIRST_REAL_PAGE_INDEX);
      return;
    }

    setCurrentPage(pageIndex - 1);
  }, [snapToRealPage]);

  // Initialize page-flip
  useEffect(() => {
    if (!bookRef.current) return;

    let pf: any = null;

    // Load page-flip only on the client because it touches window/document.
    const { PageFlip } = require('page-flip') as typeof import('page-flip');

    Promise.resolve().then(() => {
      if (!bookRef.current) return;

      pf = new PageFlip(bookRef.current, {
        width: 420,
        height: 560,
        size: 'fixed',
        drawShadow: true,
        flippingTime: 700,
        usePortrait: true,
        startZIndex: 0,
        autoSize: false,
        maxShadowOpacity: 0.5,
        showCover: false,
        mobileScrollSupport: true,
        showPageCorners: true,
        useMouseEvents: true,
        clickEventForward: true,
        disableFlipByClick: false,
      });

      const pages = bookRef.current!.querySelectorAll('.pricing-page');
      pf.loadFromHTML(pages);

      pf.on('flip', (e: any) => {
        handleFlip(e.data);
      });

      pageFlipRef.current = pf;
      setIsFlipReady(true);
      setCurrentPage(0);

      if (typeof pf.turnToPage === 'function') {
        pf.turnToPage(FIRST_REAL_PAGE_INDEX);
      }
    });

    return () => {
      if (pf) {
        try { pf.destroy(); } catch (_) {}
      }
      pageFlipRef.current = null;
      setIsFlipReady(false);
    };
  }, []);

  const goToPage = useCallback((pageIndex: number) => {
    if (pageFlipRef.current && isFlipReady) {
      pageFlipRef.current.flip(pageIndex + 1, 'top');
    }
  }, [isFlipReady]);

  const flipNext = useCallback(() => {
    const pf = pageFlipRef.current;
    if (!pf || !isFlipReady) return;
    const current = pf.getCurrentPageIndex();
    if (current >= LAST_REAL_PAGE_INDEX) {
      pf.flip(LAST_BOOK_PAGE_INDEX, 'top');
    } else {
      pf.flipNext('top');
    }
  }, [isFlipReady]);

  const flipPrev = useCallback(() => {
    const pf = pageFlipRef.current;
    if (!pf || !isFlipReady) return;
    const current = pf.getCurrentPageIndex();
    if (current <= FIRST_REAL_PAGE_INDEX) {
      // On the first real page, flip to the ghost Pro page and snap back after the animation.
      pf.flip(0, 'top');
    } else {
      pf.flipPrev('top');
    }
  }, [isFlipReady]);

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 38, height: 38,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%',
    border: '1px solid var(--border)',
    background: 'rgba(13, 13, 15, 0.5)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: 'var(--text-secondary)',
    fontSize: 20, lineHeight: 1,
    cursor: 'pointer', zIndex: 20,
    transition: 'all 0.25s ease',
  };

  return (
    <section
      id="pricing"
      style={{
        padding: '5.5rem 4rem 6rem',
        minHeight: '80vh',
      }}
    >
      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <h2
          className="gradient-text"
          style={{
            fontSize: 'var(--fs-4xl)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          Choose Your Plan
        </h2>
        <p style={{ marginTop: '0.875rem', fontSize: 'var(--fs-md)', color: 'var(--text-secondary)' }}>
          Start free. Scale as you grow.
        </p>
      </div>

      {/* Main layout */}
      <div style={{
        display: 'flex',
        gap: '3rem',
        alignItems: 'flex-start',
        maxWidth: 1100,
        margin: '0 auto',
      }}>

        {/* Card column */}
        <div style={{ flex: '0 0 auto', width: 480 }}>

          {/* Card + arrows */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>

            {/* Left arrow */}
            <button
              onClick={flipPrev}
              aria-label="Previous tier"
              style={{ ...arrowStyle, left: -12 }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--accent)';
                (e.currentTarget as HTMLElement).style.color      = 'var(--color-on-dark)';
                (e.currentTarget as HTMLElement).style.boxShadow  = '0 0 20px rgba(99, 102, 241, 0.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(13, 13, 15, 0.5)';
                (e.currentTarget as HTMLElement).style.color      = 'var(--text-secondary)';
                (e.currentTarget as HTMLElement).style.boxShadow  = 'none';
              }}
            >
              ‹
            </button>

            {/* Right arrow */}
            <button
              onClick={flipNext}
              aria-label="Next tier"
              style={{ ...arrowStyle, right: -12 }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--accent)';
                (e.currentTarget as HTMLElement).style.color      = 'var(--color-on-dark)';
                (e.currentTarget as HTMLElement).style.boxShadow  = '0 0 20px rgba(99, 102, 241, 0.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(13, 13, 15, 0.5)';
                (e.currentTarget as HTMLElement).style.color      = 'var(--text-secondary)';
                (e.currentTarget as HTMLElement).style.boxShadow  = 'none';
              }}
            >
              ›
            </button>

            {/* ═══ Page-flip book container ═══ */}
            <div
              ref={bookRef}
              className="pricing-book"
            >
              {/* Render all real tier pages */}
              {BOOK_PAGES.map(({ tier: t, isGhost }, _i) => (
                <div
                  key={`${isGhost ? 'ghost' : 'tier'}-${t.id}-${_i}`}
                  className="pricing-page"
                  data-density="soft"
                  aria-hidden={isGhost}
                >
                  <div className="pricing-page-inner">
                    <div className="glass-shimmer" />
                    <div className="glass-edge-glow" />

                    <div style={{ minHeight: 30, marginBottom: '0.5rem', position: 'relative', zIndex: 2 }}>
                      {t.highlighted && (
                        <div style={{
                          display: 'inline-block',
                          padding: '0.18rem 0.7rem',
                          borderRadius: 999,
                          background: 'var(--accent-glow)',
                          border: '1px solid var(--accent)',
                          color: 'var(--accent)',
                          fontSize: 'var(--fs-xs)', fontWeight: 700,
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>
                          Most Popular
                        </div>
                      )}
                    </div>

                    <h3 style={{
                      margin: '0 0 0.25rem',
                      fontSize: 'var(--fs-3xl)', fontWeight: 800,
                      color: 'var(--text-primary)', letterSpacing: '-0.02em',
                      position: 'relative', zIndex: 2,
                    }}>
                      {t.name}
                    </h3>
                    <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', position: 'relative', zIndex: 2 }}>
                      {t.tagline}
                    </p>

                    <div style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 2 }}>
                      <span style={{ fontSize: 'var(--fs-3xl)', fontWeight: 800, color: 'var(--accent)' }}>
                        {t.price}
                      </span>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                        {t.period}
                      </span>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', flex: 1, position: 'relative', zIndex: 2 }}>
                      {t.features.map(f => (
                        <li
                          key={f.name}
                          onMouseEnter={() => setHoveredFeature(f)}
                          onMouseLeave={() => setHoveredFeature(null)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            fontSize: 'var(--fs-sm)',
                            color: hoveredFeature?.name === f.name ? 'var(--accent)' : 'var(--text-primary)',
                            cursor: 'default', transition: 'color 0.15s',
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {f.name}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubscribeClick(t.id);
                      }}
                      style={{
                        width: '100%', padding: '0.875rem',
                        borderRadius: 12,
                        background: t.highlighted ? 'var(--accent)' : 'transparent',
                        color: t.highlighted ? 'var(--color-on-dark)' : 'var(--accent)',
                        fontSize: 'var(--fs-md)', fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid var(--accent)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        marginTop: 'auto',
                        position: 'relative', zIndex: 2,
                      } as React.CSSProperties}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.transform  = 'translateY(-1px)';
                        (e.currentTarget as HTMLElement).style.boxShadow  = '0 0 24px rgba(99, 102, 241, 0.4)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.transform  = '';
                        (e.currentTarget as HTMLElement).style.boxShadow  = '';
                      }}
                    >
                      Subscribe — {t.price}
                    </button>
                  </div>
                </div>
              ))}

            </div>
          </div>

          {/* Pagination dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.45rem', marginTop: '1.25rem' }}>
            {TIERS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => goToPage(i)}
                aria-label={`${t.name} plan`}
                style={{
                  width: i === currentPage ? 22 : 7,
                  height: 7, borderRadius: 999, border: 'none',
                  background: i === currentPage ? 'var(--accent)' : 'var(--border)',
                  cursor: 'pointer', padding: 0,
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          {/* Flip hint */}
          <p style={{
            textAlign: 'center',
            marginTop: '0.75rem',
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-muted)',
            opacity: 0.7,
          }}>
            Drag corners to flip • Click edges or use arrows
          </p>
        </div>

        {/* Feature description panel — right side */}
        <div style={{
          flex: 1, minHeight: 260,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '100%', maxWidth: 400,
            opacity: hoveredFeature ? 1 : 0,
            transform: hoveredFeature ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.22s ease, transform 0.22s ease',
            pointerEvents: hoveredFeature ? 'auto' : 'none',
          }}>
            {hoveredFeature && (
              <div className="glass-card" style={{ padding: '1.75rem' }}>
                <h4 style={{
                  margin: '0 0 0.875rem',
                  fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--accent)',
                }}>
                  {hoveredFeature.name}
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: 'var(--fs-md)', lineHeight: 1.75, color: 'var(--text-secondary)',
                }}>
                  {hoveredFeature.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
