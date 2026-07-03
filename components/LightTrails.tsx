'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════
// TIMING
// ═══════════════════════════════════════════════════════════════════
const DRAW_DURATION_MS = 2600;
const HOLD_DURATION_MS = 400;
const FADE_DURATION_MS = 1100;

// ═══════════════════════════════════════════════════════════════════
// FIREBALL PARTICLES
// ═══════════════════════════════════════════════════════════════════
const MAX_PARTICLES = 120;
const FLAME_EMIT_RATE = 6;   // flame particles per frame from the fireball
const EMBER_EMIT_RATE = 2;   // tiny ember sparks

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  type: 'flame' | 'ember';
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function cubicBezier(
  p0: number, p1: number, p2: number, p3: number, t: number,
): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3;
}

// ═══════════════════════════════════════════════════════════════════
// FIRE COLOR — life-based: white → yellow → orange → red → dark red
// ═══════════════════════════════════════════════════════════════════
function fireColor(life: number): string {
  // life: 1 (just born) → 0 (dead)
  if (life > 0.8) {
    // White-yellow core
    const t = (life - 0.8) / 0.2;
    const r = 255;
    const g = Math.round(lerp(230, 255, t));
    const b = Math.round(lerp(100, 220, t));
    return `rgba(${r}, ${g}, ${b}, ${life})`;
  } else if (life > 0.5) {
    // Yellow → orange
    const t = (life - 0.5) / 0.3;
    const r = 255;
    const g = Math.round(lerp(140, 230, t));
    const b = Math.round(lerp(20, 100, t));
    return `rgba(${r}, ${g}, ${b}, ${life * 0.9})`;
  } else if (life > 0.2) {
    // Orange → red
    const t = (life - 0.2) / 0.3;
    const r = Math.round(lerp(200, 255, t));
    const g = Math.round(lerp(40, 140, t));
    const b = Math.round(lerp(10, 20, t));
    return `rgba(${r}, ${g}, ${b}, ${life * 0.8})`;
  } else {
    // Red → dark smoke
    const t = life / 0.2;
    const r = Math.round(lerp(80, 200, t));
    const g = Math.round(lerp(20, 40, t));
    const b = Math.round(lerp(10, 10, t));
    return `rgba(${r}, ${g}, ${b}, ${life * 0.5})`;
  }
}

function fireShadowColor(life: number): string {
  if (life > 0.6) return 'rgba(255, 200, 50, 0.6)';
  if (life > 0.3) return 'rgba(255, 120, 20, 0.4)';
  return 'rgba(200, 40, 10, 0.2)';
}

// ═══════════════════════════════════════════════════════════════════
// TRAIL COLOR — gradient from warm (near head) to cool (tail)
// ═══════════════════════════════════════════════════════════════════
function getTrailColor(t: number): { r: number; g: number; b: number } {
  // t: position along path 0→1
  if (t < 0.35) {
    const lt = t / 0.35;
    return {
      r: Math.round(lerp(255, 255, lt)),
      g: Math.round(lerp(160, 200, lt)),
      b: Math.round(lerp(30, 80, lt)),
    };
  } else if (t < 0.7) {
    const lt = (t - 0.35) / 0.35;
    return {
      r: Math.round(lerp(255, 200, lt)),
      g: Math.round(lerp(200, 140, lt)),
      b: Math.round(lerp(80, 255, lt)),
    };
  } else {
    const lt = (t - 0.7) / 0.3;
    return {
      r: Math.round(lerp(200, 140, lt)),
      g: Math.round(lerp(140, 120, lt)),
      b: Math.round(lerp(255, 255, lt)),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// PATH — smooth N-shaped bezier curves
// ═══════════════════════════════════════════════════════════════════
interface CurveSegment {
  p0x: number; p0y: number;
  p1x: number; p1y: number;
  p2x: number; p2y: number;
  p3x: number; p3y: number;
}

function generateNPath(w: number, h: number): CurveSegment[] {
  // Clean cursive N — three strokes, slanted right
  //
  //     B·                         ·D
  //    / ·`.                      /
  //   /   · `.                   /
  //  /    ·   `.                /
  // A     ·     `.             /
  //       ·       `.          /
  //       ·         `.       /
  //       ·           `.    /
  //       ·             `. /
  //       ·               C
  //

  const A = { x: w * 0.05,  y: h * 0.88 };  // bottom-left
  const B = { x: w * 0.20,  y: h * 0.08 };  // top-left (leaned right)
  const C = { x: w * 0.60,  y: h * 0.88 };  // bottom-right
  const D = { x: w * 0.90,  y: h * 0.05 };  // top-right (leaned far right)

  return [
    // Stroke 1: upstroke — bottom-left to top, leaning right, gentle S-curve
    {
      p0x: A.x, p0y: A.y,
      p1x: A.x + w * 0.04, p1y: lerp(A.y, B.y, 0.55),
      p2x: B.x - w * 0.02, p2y: lerp(A.y, B.y, 0.35),
      p3x: B.x, p3y: B.y,
    },
    // Stroke 2: diagonal down — top-left to bottom-right, slight curve
    {
      p0x: B.x, p0y: B.y,
      p1x: lerp(B.x, C.x, 0.33), p1y: lerp(B.y, C.y, 0.25),
      p2x: lerp(B.x, C.x, 0.67), p2y: lerp(B.y, C.y, 0.75),
      p3x: C.x, p3y: C.y,
    },
    // Stroke 3: upstroke — bottom-right to top-right, leaning right
    {
      p0x: C.x, p0y: C.y,
      p1x: C.x + w * 0.06, p1y: lerp(C.y, D.y, 0.55),
      p2x: D.x - w * 0.04, p2y: lerp(C.y, D.y, 0.35),
      p3x: D.x, p3y: D.y,
    },
  ];
}

function evalPath(segments: CurveSegment[], t: number): { x: number; y: number } {
  const n = segments.length;
  const globalT = t * n;
  const segIdx = Math.min(n - 1, Math.floor(globalT));
  const localT = globalT - segIdx;
  const seg = segments[segIdx];
  return {
    x: cubicBezier(seg.p0x, seg.p1x, seg.p2x, seg.p3x, localT),
    y: cubicBezier(seg.p0y, seg.p1y, seg.p2y, seg.p3y, localT),
  };
}

function samplePath(segments: CurveSegment[], count: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= count; i++) {
    pts.push(evalPath(segments, i / count));
  }
  return pts;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════
interface Props {
  onComplete: () => void;
}

export default function LightTrails({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [opacity, setOpacity] = useState(1);
  const completeCalled = useRef(false);

  const handleComplete = useCallback(() => {
    if (!completeCalled.current) {
      completeCalled.current = true;
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const segments = generateNPath(w, h);
    const SAMPLE_COUNT = 300;
    const sampledPts = samplePath(segments, SAMPLE_COUNT);
    const particles: Particle[] = [];

    const startTime = performance.now();
    let animId = 0;
    let phase: 'draw' | 'hold' | 'fade' = 'draw';
    let phaseStart = startTime;

    // ─── Emit fire particles from the fireball head ───
    function emitFireParticles(x: number, y: number) {
      for (let i = 0; i < FLAME_EMIT_RATE; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(0.5, 3);
        const p: Particle = {
          x: x + rand(-4, 4),
          y: y + rand(-4, 4),
          vx: Math.cos(angle) * speed + rand(-0.5, 0.5),
          vy: Math.sin(angle) * speed - rand(0.5, 2), // bias upward (flames rise)
          life: 1,
          decay: rand(0.02, 0.05),
          size: rand(2, 6),
          type: 'flame',
        };
        if (particles.length >= MAX_PARTICLES) {
          const oldest = particles.reduce((minIdx, pp, idx, arr) =>
            pp.life < arr[minIdx].life ? idx : minIdx, 0);
          particles[oldest] = p;
        } else {
          particles.push(p);
        }
      }
      // Tiny hot embers that shoot further
      for (let i = 0; i < EMBER_EMIT_RATE; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(2, 5);
        const p: Particle = {
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - rand(1, 3),
          life: 1,
          decay: rand(0.03, 0.07),
          size: rand(0.8, 1.8),
          type: 'ember',
        };
        if (particles.length >= MAX_PARTICLES) {
          const oldest = particles.reduce((minIdx, pp, idx, arr) =>
            pp.life < arr[minIdx].life ? idx : minIdx, 0);
          particles[oldest] = p;
        } else {
          particles.push(p);
        }
      }
    }

    // ─── Update + draw particles ───
    function updateAndDrawParticles(ctx: CanvasRenderingContext2D, globalAlpha: number) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.vy -= 0.03; // slight upward drift (heat rises)
        p.life -= p.decay;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = globalAlpha;

        if (p.type === 'flame') {
          // Flame particles — large, soft, fiery
          ctx.shadowColor = fireShadowColor(p.life);
          ctx.shadowBlur = 12;
          ctx.fillStyle = fireColor(p.life);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Ember — tiny bright spark
          const alpha = p.life * p.life;
          ctx.shadowColor = `rgba(255, 200, 50, ${alpha * 0.8})`;
          ctx.shadowBlur = 4;
          ctx.fillStyle = `rgba(255, 240, 180, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // ─── Draw the glowing trail ───
    function drawTrail(
      ctx: CanvasRenderingContext2D,
      revealIdx: number,
      globalAlpha: number,
    ) {
      if (revealIdx < 1) return;

      ctx.save();
      ctx.globalAlpha = globalAlpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i <= revealIdx && i < sampledPts.length; i++) {
        const t = i / SAMPLE_COUNT;
        const color = getTrailColor(t);

        // Proximity to head — near head is brighter/hotter
        const headProximity = 1 - Math.abs(revealIdx - i) / Math.max(1, revealIdx);
        const tailFade = Math.pow(1 - (revealIdx - i) / Math.max(1, revealIdx), 0.35);

        // Layer 1: Wide warm outer glow
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(0.05 * tailFade).toFixed(4)})`;
        ctx.lineWidth = 24;
        ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${(0.12 * tailFade).toFixed(4)})`;
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.moveTo(sampledPts[i - 1].x, sampledPts[i - 1].y);
        ctx.lineTo(sampledPts[i].x, sampledPts[i].y);
        ctx.stroke();

        // Layer 2: Medium color glow — hotter near head
        const midAlpha = headProximity > 0.85 ? 0.35 : 0.15;
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(midAlpha * tailFade).toFixed(4)})`;
        ctx.lineWidth = 5;
        ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(sampledPts[i - 1].x, sampledPts[i - 1].y);
        ctx.lineTo(sampledPts[i].x, sampledPts[i].y);
        ctx.stroke();

        // Layer 3: Thin bright core
        const coreAlpha = headProximity > 0.9 ? 0.95 : 0.7;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(coreAlpha * tailFade).toFixed(4)})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = `rgba(255, 200, 100, 0.6)`;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(sampledPts[i - 1].x, sampledPts[i - 1].y);
        ctx.lineTo(sampledPts[i].x, sampledPts[i].y);
        ctx.stroke();
      }

      ctx.restore();
    }

    // ─── Draw the fireball head ───
    function drawFireball(ctx: CanvasRenderingContext2D, x: number, y: number) {
      ctx.save();

      // Layer 1: Very large soft outer fire glow
      ctx.shadowColor = 'rgba(255, 150, 30, 0.9)';
      ctx.shadowBlur = 60;
      const outerGrad = ctx.createRadialGradient(x, y, 0, x, y, 40);
      outerGrad.addColorStop(0, 'rgba(255, 255, 220, 0.9)');
      outerGrad.addColorStop(0.15, 'rgba(255, 220, 80, 0.7)');
      outerGrad.addColorStop(0.35, 'rgba(255, 150, 30, 0.4)');
      outerGrad.addColorStop(0.6, 'rgba(255, 80, 10, 0.15)');
      outerGrad.addColorStop(1, 'rgba(200, 30, 0, 0)');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.fill();

      // Layer 2: Medium hot core
      ctx.shadowColor = 'rgba(255, 200, 50, 0.95)';
      ctx.shadowBlur = 30;
      const midGrad = ctx.createRadialGradient(x, y, 0, x, y, 14);
      midGrad.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
      midGrad.addColorStop(0.4, 'rgba(255, 230, 100, 0.8)');
      midGrad.addColorStop(0.7, 'rgba(255, 180, 40, 0.4)');
      midGrad.addColorStop(1, 'rgba(255, 120, 20, 0)');
      ctx.fillStyle = midGrad;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();

      // Layer 3: Bright white-hot inner core
      ctx.shadowColor = 'rgba(255, 255, 200, 1)';
      ctx.shadowBlur = 15;
      ctx.fillStyle = 'rgba(255, 255, 250, 0.97)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // ─── Animation loop ───
    function tick(now: number) {
      if (!canvas || !ctx) return;

      const phaseElapsed = now - phaseStart;
      ctx.clearRect(0, 0, w, h);

      if (phase === 'draw') {
        const rawT = Math.min(1, phaseElapsed / DRAW_DURATION_MS);
        const t = rawT < 0.5
          ? 2 * rawT * rawT
          : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

        const revealIdx = Math.floor(t * SAMPLE_COUNT);

        drawTrail(ctx, revealIdx, 1);

        if (revealIdx < SAMPLE_COUNT) {
          const headPt = sampledPts[Math.min(revealIdx, SAMPLE_COUNT)];
          drawFireball(ctx, headPt.x, headPt.y);
          emitFireParticles(headPt.x, headPt.y);
        }

        updateAndDrawParticles(ctx, 1);

        if (rawT >= 1) {
          phase = 'hold';
          phaseStart = now;
        }
      } else if (phase === 'hold') {
        drawTrail(ctx, SAMPLE_COUNT, 1);
        updateAndDrawParticles(ctx, 1);

        if (phaseElapsed >= HOLD_DURATION_MS) {
          phase = 'fade';
          phaseStart = now;
        }
      } else if (phase === 'fade') {
        const fadeProgress = Math.min(1, phaseElapsed / FADE_DURATION_MS);
        const eased = 1 - Math.pow(1 - fadeProgress, 3);
        const alpha = 1 - eased;

        setOpacity(alpha);
        drawTrail(ctx, SAMPLE_COUNT, alpha);
        updateAndDrawParticles(ctx, alpha);

        if (fadeProgress >= 1) {
          handleComplete();
          return;
        }
      }

      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [handleComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none',
        opacity,
      }}
    />
  );
}
