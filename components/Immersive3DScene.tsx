'use client';

/**
 * Immersive3DScene — Active Theory–style layout:
 *   • Central 3D candle-ladder cylinder that rotates on scroll
 *   • Feature cards appear ONE AT A TIME, alternating left/right
 *   • Smooth scroll-driven transitions between cards
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// FEATURE DATA
// ═══════════════════════════════════════════════════════════════════
const FEATURES = [
  {
    slogan: 'Track Every Move',
    description:
      'Real-time candlestick charts with advanced indicators — MACD, RSI, Bollinger Bands, and more.',
    emoji: '📈',
    tag: 'REAL-TIME CHARTS',
    year: '2025',
  },
  {
    slogan: 'Filter the Noise',
    description:
      'Powerful multi-factor screening tools to surface exactly what matters to your strategy.',
    emoji: '🔍',
    tag: 'MULTI-FACTOR SCREENER',
    year: '2025',
  },
  {
    slogan: 'AI-Powered Insights',
    description:
      'Frontier AI analyzes charts, flags patterns, and generates market commentary in real time.',
    emoji: '🤖',
    tag: 'MCP AI MODULE',
    year: '2025',
  },
  {
    slogan: 'Portfolio at a Glance',
    description:
      'Monitor every position, P&L, and exposure across all holdings in one live dashboard.',
    emoji: '💼',
    tag: 'LIVE PORTFOLIO',
    year: '2025',
  },
];

// ═══════════════════════════════════════════════════════════════════
// HELIX CONFIG
// ═══════════════════════════════════════════════════════════════════
const HELIX_COUNT = 14;
const HELIX_RADIUS = 1.8;
const HELIX_HEIGHT = 8;
const HELIX_TURNS = 1.5;
const SCROLL_ROTATION = Math.PI * 4;

interface CandleDef {
  bodyH: number;
  radius: number;
  up: boolean;
  hue: number;
}

function buildCandles(): CandleDef[] {
  const hues = [145, 340, 145, 340, 80, 145, 340, 160, 340, 145, 40, 145, 300, 145];
  const candles: CandleDef[] = [];
  for (let i = 0; i < HELIX_COUNT; i++) {
    candles.push({
      bodyH: 0.5 + Math.sin(i * 1.7) * 0.3 + Math.cos(i * 0.9) * 0.15,
      radius: 0.2 + Math.sin(i * 2.1) * 0.08 + Math.cos(i * 1.3) * 0.06,
      up: i % 3 !== 1,
      hue: hues[i % hues.length],
    });
  }
  return candles;
}

const CANDLE_DEFS = buildCandles();

// ═══════════════════════════════════════════════════════════════════
// THREE.JS SCENE — pure imperative
// ═══════════════════════════════════════════════════════════════════
function createHelixScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.3, 7);
  camera.lookAt(0, 0, 0);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
  fillLight.position.set(-3, -2, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffccaa, 0.5);
  rimLight.position.set(0, 3, -5);
  scene.add(rimLight);

  const pointLight = new THREE.PointLight(0xffffff, 0.7, 18);
  pointLight.position.set(0, 0, 6);
  scene.add(pointLight);

  // Helix group
  const helixGroup = new THREE.Group();
  scene.add(helixGroup);

  // Build candles
  for (let i = 0; i < HELIX_COUNT; i++) {
    const def = CANDLE_DEFS[i];
    const t = i / (HELIX_COUNT - 1);
    const angle = t * HELIX_TURNS * Math.PI * 2;
    const x = HELIX_RADIUS * Math.sin(angle);
    const z = HELIX_RADIUS * Math.cos(angle);
    const y = (t - 0.5) * HELIX_HEIGHT;

    const cg = new THREE.Group();
    cg.position.set(x, y, z);

    const s = def.up ? 0.65 : 0.75;
    const l = def.up ? 0.5 : 0.55;
    const bodyColor = new THREE.Color().setHSL(def.hue / 360, s, l);
    const capColor = new THREE.Color().setHSL(def.hue / 360, def.up ? 0.55 : 0.65, def.up ? 0.7 : 0.75);
    const darkColor = new THREE.Color().setHSL(def.hue / 360, def.up ? 0.6 : 0.7, def.up ? 0.3 : 0.28);
    const wickColor = new THREE.Color(0xc2a569);

    // Body
    const bodyMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(def.radius, def.radius, def.bodyH, 32, 1),
      new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.15, roughness: 0.5 }),
    );
    cg.add(bodyMesh);

    // Top cap
    const topCap = new THREE.Mesh(
      new THREE.CircleGeometry(def.radius, 32),
      new THREE.MeshStandardMaterial({ color: capColor, metalness: 0.1, roughness: 0.4, side: THREE.DoubleSide }),
    );
    topCap.position.y = def.bodyH / 2;
    topCap.rotation.x = -Math.PI / 2;
    cg.add(topCap);

    // Bottom cap
    const botCap = new THREE.Mesh(
      new THREE.CircleGeometry(def.radius, 32),
      new THREE.MeshStandardMaterial({ color: darkColor, metalness: 0.2, roughness: 0.6, side: THREE.DoubleSide }),
    );
    botCap.position.y = -def.bodyH / 2;
    botCap.rotation.x = Math.PI / 2;
    cg.add(botCap);

    // Wicks (gold rods)
    const wickH = 0.15 + def.radius * 0.35;
    const wickMat = new THREE.MeshStandardMaterial({ color: wickColor, metalness: 0.85, roughness: 0.25 });
    const wickGeo = new THREE.CylinderGeometry(0.018, 0.018, wickH, 8);

    const upperWick = new THREE.Mesh(wickGeo, wickMat);
    upperWick.position.y = def.bodyH / 2 + wickH / 2;
    cg.add(upperWick);

    const lowerWick = new THREE.Mesh(wickGeo.clone(), wickMat.clone());
    lowerWick.position.y = -def.bodyH / 2 - wickH / 2;
    cg.add(lowerWick);

    helixGroup.add(cg);
  }

  // Helical rails
  for (let side = 0; side < 2; side++) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const a = t * HELIX_TURNS * Math.PI * 2 + side * Math.PI;
      pts.push(new THREE.Vector3(
        HELIX_RADIUS * Math.sin(a),
        (t - 0.5) * HELIX_HEIGHT,
        HELIX_RADIUS * Math.cos(a),
      ));
    }
    const rail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xc2a569, transparent: true, opacity: 0.3 }),
    );
    helixGroup.add(rail);
  }

  helixGroup.rotation.x = -0.1;

  // Animation state
  let targetAngle = 0;
  let smoothAngle = 0;
  let animId = 0;
  let disposed = false;

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = renderer.getPixelRatio();
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function animate() {
    if (disposed) return;
    animId = requestAnimationFrame(animate);
    smoothAngle += (targetAngle - smoothAngle) * 0.06;
    helixGroup.rotation.y = smoothAngle;
    resize();
    renderer.render(scene, camera);
  }

  animate();

  return {
    setTargetAngle(a: number) { targetAngle = a; },
    dispose() {
      disposed = true;
      cancelAnimationFrame(animId);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// CARD TRANSITION HELPERS
// ═══════════════════════════════════════════════════════════════════
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Returns smooth transform for a card based on its distance from active index */
function cardStyle(
  cardIdx: number,
  activeProgress: number,
  side: number,
  isFocused: boolean,
): React.CSSProperties {
  // When focused: card flies to center and scales up
  if (isFocused) {
    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%) scale(1.25)',
      opacity: 1,
      pointerEvents: 'auto',
      transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 100,
      willChange: 'transform, opacity',
    } as React.CSSProperties;
  }

  const dist = cardIdx - activeProgress;

  const visible = Math.abs(dist) < 1.3;
  if (!visible) {
    return {
      position: 'absolute',
      opacity: 0,
      pointerEvents: 'none',
      transform: 'translate(-50%, -50%) scale(0.5)',
      visibility: 'hidden',
    };
  }

  const t = clamp(dist, -1.2, 1.2);
  const baseX = side === -1 ? 22 : 78;
  const yShift = t * 35;
  const scale = 1 - Math.abs(t) * 0.35;
  const opacity = 1 - Math.abs(t) * 0.9;
  const zShift = -Math.abs(t) * 200;
  const rotateY = t * (side === -1 ? 8 : -8);
  const rotateX = t * -3;
  const isClickable = opacity > 0.25;

  return {
    position: 'absolute',
    left: `${baseX}%`,
    top: `${50 + yShift}%`,
    transform: `translate(-50%, -50%) perspective(1200px) translateZ(${zShift}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(${scale})`,
    opacity: clamp(opacity, 0, 1),
    pointerEvents: isClickable ? 'auto' : 'none',
    cursor: isClickable ? 'pointer' : 'default',
    transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'transform, opacity',
  } as React.CSSProperties;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function Immersive3DScene() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const helixRef = useRef<ReturnType<typeof createHelixScene> | null>(null);
  const [activeProgress, setActiveProgress] = useState(0);
  const [focusedCard, setFocusedCard] = useState<number | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;
    const helix = createHelixScene(canvasRef.current);
    helixRef.current = helix;
    return () => {
      helix.dispose();
      helixRef.current = null;
    };
  }, []);

  // Scroll handler — also dismisses focused card on scroll
  const scrollYRef = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const scrolled = -rect.top;
      const scrollRange = rect.height - window.innerHeight;
      const progress = clamp(scrolled / scrollRange, 0, 1);

      const cardProgress = progress * (FEATURES.length - 1);
      setActiveProgress(cardProgress);

      if (helixRef.current) {
        helixRef.current.setTargetAngle(progress * SCROLL_ROTATION);
      }

      // Dismiss focused card when user scrolls
      if (focusedCard !== null) {
        const delta = Math.abs(window.scrollY - scrollYRef.current);
        if (delta > 30) {
          setFocusedCard(null);
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [focusedCard]);

  const activeIdx = Math.round(activeProgress);
  const handleCardClick = useCallback((i: number) => {
    scrollYRef.current = window.scrollY;
    setFocusedCard((prev) => (prev === i ? null : i));
  }, []);
  const dismissCard = useCallback(() => setFocusedCard(null), []);

  return (
    <section
      id="features"
      ref={sectionRef}
      style={{
        position: 'relative',
        height: `${(FEATURES.length + 1) * 100}vh`,
      }}
    >
      {/* Sticky viewport — everything stays fixed while scrolling */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* ── Section label — top left ── */}
        <div style={{ position: 'absolute', top: 60, left: 40, zIndex: 20, pointerEvents: 'none' }}>
          <h2
            className="gradient-text"
            style={{
              fontSize: 'var(--fs-3xl)',
              fontWeight: 800,
              margin: 0,
              letterSpacing: '-0.03em',
              opacity: 0.9,
            }}
          >
            Why NChartPro?
          </h2>
        </div>

        {/* ── Card counter — bottom right ── */}
        <div
          style={{
            position: 'absolute', bottom: 40, right: 40, zIndex: 20,
            fontFamily: 'var(--ff-mono, monospace)',
            fontSize: 'var(--fs-sm)', color: 'var(--text-muted)',
            letterSpacing: '0.05em',
          }}
        >
          {String(activeIdx + 1).padStart(2, '0')} / {String(FEATURES.length).padStart(2, '0')}
        </div>

        {/* ── Scroll hint ── */}
        <div
          style={{
            position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
            zIndex: 20, textAlign: 'center',
            opacity: activeIdx === 0 ? 0.6 : 0, transition: 'opacity 0.4s',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            fontSize: 'var(--fs-xs)', color: 'var(--text-muted)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
          }}>
            Scroll to explore
          </div>
          <div style={{
            width: 1, height: 30, background: 'var(--text-muted)',
            margin: '0 auto', animation: 'scrollPulse 1.5s ease-in-out infinite',
          }} />
        </div>

        {/* ══════ THREE.JS CANVAS — centered helix ══════ */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            width: '40%',
            height: '100%',
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>

        {/* ══════ FEATURE CARDS — one at a time, alternating sides ══════ */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
          }}
        >
          {FEATURES.map((feat, i) => {
            const side = i % 2 === 0 ? -1 : 1;
            const isFocused = focusedCard === i;
            const style = cardStyle(i, activeProgress, side, isFocused);

            return (
              <div
                key={i}
                style={{
                  ...style,
                  width: 'clamp(260px, 24vw, 400px)',
                  aspectRatio: '16 / 10',
                  borderRadius: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: 'clamp(1rem, 2vw, 1.6rem)',
                  overflow: 'hidden',
                  /* Blue glassmorphism — matching pricing cards */
                  background: `linear-gradient(
                    160deg,
                    rgba(99, 102, 241, 0.15) 0%,
                    rgba(30, 30, 50, 0.55) 25%,
                    rgba(15, 15, 25, 0.50) 50%,
                    rgba(30, 30, 55, 0.55) 75%,
                    rgba(99, 102, 241, 0.10) 100%
                  )`,
                  backdropFilter: 'blur(28px) saturate(1.6) brightness(1.1)',
                  WebkitBackdropFilter: 'blur(28px) saturate(1.6) brightness(1.1)',
                  border: '1.5px solid rgba(99, 102, 241, 0.35)',
                  boxShadow: `
                    0 0 40px rgba(99, 102, 241, 0.12),
                    0 8px 32px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.12),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.06),
                    inset 0 -1px 0 rgba(99, 102, 241, 0.08)
                  `,
                } as React.CSSProperties}
                  onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99, 102, 241, 0.50)';
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    '0 0 60px rgba(99,102,241,0.20), 0 12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99, 102, 241, 0.35)';
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    '0 0 40px rgba(99,102,241,0.12), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.06)';
                }}
              >
                <button
                  type="button"
                  aria-label={`Open ${feat.slogan}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCardClick(i);
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 3,
                    width: '100%',
                    height: '100%',
                    border: 0,
                    padding: 0,
                    margin: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                />

                {/* Glass shimmer */}
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 1,
                  overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none',
                }}>
                  <div style={{
                    position: 'absolute', top: '-60%', left: '-60%',
                    width: '60%', height: '220%',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.08) 48%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 52%, rgba(255,255,255,0.03) 70%, transparent 100%)',
                    transform: 'translateX(-100%) rotate(25deg)',
                    animation: 'glass-shimmer-move 5s ease-in-out infinite',
                  }} />
                </div>

                {/* Edge glow */}
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 1,
                  borderRadius: 'inherit', pointerEvents: 'none',
                  background: `
                    radial-gradient(ellipse at 20% 0%, rgba(99, 102, 241, 0.25) 0%, transparent 55%),
                    radial-gradient(ellipse at 80% 100%, rgba(99, 102, 241, 0.18) 0%, transparent 55%),
                    linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 30%)
                  `,
                }} />

                {/* Emoji watermark */}
                <div
                  style={{
                    position: 'absolute',
                    right: side === -1 ? 'auto' : 'clamp(0.8rem, 2vw, 1.5rem)',
                    left: side === -1 ? 'clamp(0.8rem, 2vw, 1.5rem)' : 'auto',
                    top: 'clamp(0.6rem, 1.2vw, 1rem)',
                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                    opacity: 0.1, pointerEvents: 'none', lineHeight: 1,
                    zIndex: 2,
                  }}
                >
                  {feat.emoji}
                </div>

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <span style={{
                      fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: 'var(--text-muted)',
                    }}>
                      {feat.tag}
                    </span>
                    <span style={{
                      fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em',
                      color: 'var(--accent)', opacity: 0.8,
                    }}>
                      {feat.year}
                    </span>
                  </div>
                  <h3 style={{
                    margin: '0 0 0.3rem',
                    fontSize: 'clamp(1rem, 2vw, 1.4rem)',
                    fontWeight: 800, color: 'var(--text-primary)',
                    letterSpacing: '-0.03em', lineHeight: 1.15,
                  }}>
                    {feat.slogan}
                  </h3>
                  <p style={{
                    margin: 0, fontSize: 'clamp(0.65rem, 0.85vw, 0.78rem)',
                    lineHeight: 1.55, color: 'var(--text-secondary)', maxWidth: '90%',
                  }}>
                    {feat.description}
                  </p>
                </div>

                {/* Bottom accent line */}
                <div style={{
                  position: 'absolute', bottom: 0, left: '8%', right: '8%', height: 2,
                  background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                  opacity: 0.25, zIndex: 2,
                }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Dim backdrop when a card is focused */}
      {focusedCard !== null && (
        <div
          onClick={dismissCard}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            transition: 'opacity 0.3s',
            pointerEvents: 'auto',
          } as React.CSSProperties}
        />
      )}

      <style>{`
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.3; transform: scaleY(0.7); }
          50% { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </section>
  );
}
