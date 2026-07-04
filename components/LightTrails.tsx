'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════
// TIMING
// ═══════════════════════════════════════════════════════════════════
const DRAW_DURATION_MS = 3600;
const HOLD_DURATION_MS = 650;
const FADE_DURATION_MS = 1300;

// ═══════════════════════════════════════════════════════════════════
// PALETTE — champagne gold with fiery accents
// ═══════════════════════════════════════════════════════════════════
const GOLD = { r: 235, g: 190, b: 115 };
const FIRE = { r: 255, g: 130, b: 35 };       // fiery outer glow
const GOLD_CORE = { r: 255, g: 250, b: 232 }; // warm white core

const SAMPLE_COUNT = 560;

interface Pt { x: number; y: number }

// ═══════════════════════════════════════════════════════════════════
// PATH — grand signature: enters from the bottom-left corner of the
// screen, writes a calligraphic cursive N, then a sweeping flourish
// arcs across the top and exits at the top-left corner.
// ═══════════════════════════════════════════════════════════════════
function sampleCursiveN(w: number, h: number): { pts: Pt[]; widths: number[] } {
  // Glyph metrics (viewbox ~100x100, N spans x:6-94, y:8-86)
  const glyphW = 90, glyphH = 80, gx = 4, gy = 7;
  const targetH = Math.min(h * 0.62, w * 0.38);
  const scale = targetH / glyphH;
  const targetW = glyphW * scale;
  const offX = (w - targetW) / 2 - gx * scale;
  const offY = (h - targetH) / 2 - gy * scale;

  // Screen corners mapped into glyph space (slightly off-screen)
  const toGX = (sx: number) => (sx - offX) / scale;
  const toGY = (sy: number) => (sy - offY) / scale;
  const blx = toGX(-40), bly = toGY(h + 40);   // bottom-left corner
  const trx = toGX(w + 40), try_ = toGY(-40);  // top-right corner

  const f = (n: number) => n.toFixed(2);

  const pathD =
    // Entry: sweep in from bottom-left corner of the screen
    `M ${f(blx)} ${f(bly)} ` +
    `C ${f(blx + (21 - blx) * 0.45)} ${f(bly)}, ${f(4)} ${f(90)}, 21 79 ` +
    // Cursive N body
    'C 27 70, 32 50, 35 30 ' +
    'C 37 18, 38 11, 34 9.5 ' +
    'C 30 8, 27.5 13, 29.5 21 ' +
    'C 33 34, 43 56, 53 72 ' +
    'C 57 78.5, 61 84, 65 79.5 ' +
    'C 71 72, 76.5 51, 80.5 31 ' +
    'C 82.5 21, 84.5 13.5, 88.5 12 ' +
    // Exit flourish: continue the upstroke, soaring off to the top-right corner
    `C ${f(92)} ${f(10)}, ${f(88.5 + (trx - 88.5) * 0.35)} ${f(6)}, ${f(trx)} ${f(try_)}`;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.visibility = 'hidden';
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', pathD);
  svg.appendChild(path);
  document.body.appendChild(svg);

  const total = path.getTotalLength();
  const pts: Pt[] = [];
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const p = path.getPointAtLength((i / SAMPLE_COUNT) * total);
    pts.push({ x: p.x * scale + offX, y: p.y * scale + offY });
  }
  document.body.removeChild(svg);

  // Copperplate pen-pressure widths: thick downstrokes, hairline upstrokes
  const baseW = Math.max(1.2, scale * 0.06);
  const ampW = Math.max(5, scale * 0.30);
  const nx = Math.cos(-Math.PI / 4);
  const ny = Math.sin(-Math.PI / 4);
  const widths: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 2)];
    const b = pts[Math.min(pts.length - 1, i + 2)];
    let dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const perp = Math.abs(dx * ny - dy * nx);
    const t = i / (pts.length - 1);
    const taper = Math.min(1, t / 0.03, (1 - t) / 0.04);
    widths.push((baseW + ampW * perp * perp) * Math.max(0.3, taper));
  }
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < widths.length - 1; i++) {
      widths[i] = (widths[i - 1] + widths[i] * 2 + widths[i + 1]) / 4;
    }
  }
  return { pts, widths };
}

// ═══════════════════════════════════════════════════════════════════
// PARTICLES — gold dust, fiery embers, star sparkles
// ═══════════════════════════════════════════════════════════════════
const MAX_PARTICLES = 260;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; decay: number;
  size: number;
  phase: number;
  kind: 'dust' | 'ember' | 'star';
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Ember color: white-hot → orange → deep red as it dies
function emberColor(life: number, alpha: number): string {
  if (life > 0.7) {
    const t = (life - 0.7) / 0.3;
    return `rgba(255, ${Math.round(lerp(190, 245, t))}, ${Math.round(lerp(80, 190, t))}, ${alpha})`;
  } else if (life > 0.35) {
    const t = (life - 0.35) / 0.35;
    return `rgba(255, ${Math.round(lerp(110, 190, t))}, ${Math.round(lerp(25, 80, t))}, ${alpha})`;
  }
  const t = life / 0.35;
  return `rgba(${Math.round(lerp(160, 255, t))}, ${Math.round(lerp(40, 110, t))}, ${Math.round(lerp(15, 25, t))}, ${alpha})`;
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

    const { pts, widths } = sampleCursiveN(w, h);
    const particles: Particle[] = [];

    // Offscreen canvas accumulates the ink stroke (drawn incrementally)
    const ink = document.createElement('canvas');
    ink.width = w * dpr;
    ink.height = h * dpr;
    const inkCtx = ink.getContext('2d')!;
    inkCtx.scale(dpr, dpr);
    inkCtx.lineCap = 'round';
    inkCtx.lineJoin = 'round';

    let drawnIdx = 0;
    let phase: 'draw' | 'hold' | 'fade' = 'draw';
    let phaseStart = performance.now();
    let animId = 0;

    function inkSegment(i: number) {
      const a = pts[i - 1], b = pts[i];
      const lw = widths[i];

      // Fiery outer glow
      inkCtx.strokeStyle = `rgba(${FIRE.r}, ${FIRE.g}, ${FIRE.b}, 0.10)`;
      inkCtx.lineWidth = lw * 3.6 + 10;
      inkCtx.shadowColor = `rgba(${FIRE.r}, ${FIRE.g}, ${FIRE.b}, 0.45)`;
      inkCtx.shadowBlur = 30;
      inkCtx.beginPath();
      inkCtx.moveTo(a.x, a.y);
      inkCtx.lineTo(b.x, b.y);
      inkCtx.stroke();

      // Main gold body
      inkCtx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.88)`;
      inkCtx.lineWidth = lw;
      inkCtx.shadowColor = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.75)`;
      inkCtx.shadowBlur = 15;
      inkCtx.beginPath();
      inkCtx.moveTo(a.x, a.y);
      inkCtx.lineTo(b.x, b.y);
      inkCtx.stroke();

      // Bright warm-white core
      inkCtx.strokeStyle = `rgba(${GOLD_CORE.r}, ${GOLD_CORE.g}, ${GOLD_CORE.b}, 0.92)`;
      inkCtx.lineWidth = Math.max(0.6, lw * 0.38);
      inkCtx.shadowColor = `rgba(${GOLD_CORE.r}, ${GOLD_CORE.g}, ${GOLD_CORE.b}, 0.85)`;
      inkCtx.shadowBlur = 6;
      inkCtx.beginPath();
      inkCtx.moveTo(a.x, a.y);
      inkCtx.lineTo(b.x, b.y);
      inkCtx.stroke();
    }

    function addParticle(p: Particle) {
      if (particles.length >= MAX_PARTICLES) {
        let oldest = 0;
        for (let j = 1; j < particles.length; j++) {
          if (particles[j].life < particles[oldest].life) oldest = j;
        }
        particles[oldest] = p;
      } else {
        particles.push(p);
      }
    }

    function emitAt(x: number, y: number, dust: number, embers: number, stars: number) {
      for (let i = 0; i < dust; i++) {
        addParticle({
          x: x + rand(-4, 4), y: y + rand(-4, 4),
          vx: rand(-0.8, 0.8), vy: rand(-0.4, 1),
          life: 1, decay: rand(0.007, 0.02),
          size: rand(0.6, 2.2), phase: rand(0, Math.PI * 2),
          kind: 'dust',
        });
      }
      for (let i = 0; i < embers; i++) {
        const ang = rand(0, Math.PI * 2);
        const spd = rand(0.6, 2.8);
        addParticle({
          x: x + rand(-3, 3), y: y + rand(-3, 3),
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - rand(0.6, 1.8),
          life: 1, decay: rand(0.014, 0.035),
          size: rand(1, 3), phase: rand(0, Math.PI * 2),
          kind: 'ember',
        });
      }
      for (let i = 0; i < stars; i++) {
        addParticle({
          x: x + rand(-8, 8), y: y + rand(-8, 8),
          vx: rand(-0.4, 0.4), vy: rand(-0.5, 0.3),
          life: 1, decay: rand(0.012, 0.025),
          size: rand(1.4, 2.8), phase: rand(0, Math.PI * 2),
          kind: 'star',
        });
      }
    }

    function drawStar(c: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) {
      c.strokeStyle = `rgba(${GOLD_CORE.r}, ${GOLD_CORE.g}, ${GOLD_CORE.b}, ${alpha})`;
      c.lineWidth = 0.9;
      c.shadowColor = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${alpha})`;
      c.shadowBlur = 6;
      c.beginPath();
      c.moveTo(x - r, y); c.lineTo(x + r, y);
      c.moveTo(x, y - r); c.lineTo(x, y + r);
      c.moveTo(x - r * 0.45, y - r * 0.45); c.lineTo(x + r * 0.45, y + r * 0.45);
      c.moveTo(x + r * 0.45, y - r * 0.45); c.lineTo(x - r * 0.45, y + r * 0.45);
      c.stroke();
    }

    function updateAndDrawParticles(now: number, globalAlpha: number) {
      if (!ctx) return;
      ctx.save();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        if (p.kind === 'ember') {
          p.vy = p.vy * 0.97 - 0.045; // heat rises
        } else {
          p.vy = p.vy * 0.985 + 0.012; // dust settles
        }
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }

        const twinkle = 0.55 + 0.45 * Math.sin(now * 0.014 + p.phase);
        const a = p.life * twinkle * globalAlpha;

        if (p.kind === 'star') {
          drawStar(ctx, p.x, p.y, p.size * 3.2 * p.life, a);
        } else if (p.kind === 'ember') {
          ctx.fillStyle = emberColor(p.life, a);
          ctx.shadowColor = emberColor(p.life, a * 0.9);
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${a})`;
          ctx.shadowColor = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${a * 0.8})`;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function drawPenHead(x: number, y: number, now: number) {
      if (!ctx) return;
      ctx.save();
      const pulse = 1 + 0.12 * Math.sin(now * 0.022);

      // Fiery halo
      const halo = ctx.createRadialGradient(x, y, 0, x, y, 42 * pulse);
      halo.addColorStop(0, `rgba(${GOLD_CORE.r}, ${GOLD_CORE.g}, ${GOLD_CORE.b}, 0.95)`);
      halo.addColorStop(0.18, `rgba(255, 215, 120, 0.6)`);
      halo.addColorStop(0.45, `rgba(${FIRE.r}, ${FIRE.g}, ${FIRE.b}, 0.25)`);
      halo.addColorStop(0.75, 'rgba(220, 70, 15, 0.08)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, 42 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Star flare — elegant cross of light
      const flareLen = 30 * pulse;
      const grad = (x1: number, y1: number, x2: number, y2: number) => {
        const g = ctx.createLinearGradient(x1, y1, x2, y2);
        g.addColorStop(0, 'rgba(255,250,235,0)');
        g.addColorStop(0.5, 'rgba(255,250,235,0.9)');
        g.addColorStop(1, 'rgba(255,250,235,0)');
        return g;
      };
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = grad(x - flareLen, y, x + flareLen, y);
      ctx.beginPath(); ctx.moveTo(x - flareLen, y); ctx.lineTo(x + flareLen, y); ctx.stroke();
      ctx.strokeStyle = grad(x, y - flareLen, x, y + flareLen);
      ctx.beginPath(); ctx.moveTo(x, y - flareLen); ctx.lineTo(x, y + flareLen); ctx.stroke();

      // Bright core
      ctx.shadowColor = `rgba(${GOLD_CORE.r}, ${GOLD_CORE.g}, ${GOLD_CORE.b}, 1)`;
      ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(255, 253, 245, 0.98)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function tick(now: number) {
      if (!canvas || !ctx) return;
      const phaseElapsed = now - phaseStart;
      ctx.clearRect(0, 0, w, h);

      if (phase === 'draw') {
        const rawT = Math.min(1, phaseElapsed / DRAW_DURATION_MS);
        const t = rawT < 0.5
          ? 4 * rawT * rawT * rawT
          : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
        const targetIdx = Math.floor(t * SAMPLE_COUNT);

        while (drawnIdx < targetIdx && drawnIdx < pts.length - 1) {
          drawnIdx++;
          inkSegment(drawnIdx);
        }

        ctx.drawImage(ink, 0, 0, w, h);

        if (drawnIdx < SAMPLE_COUNT) {
          const head = pts[Math.min(drawnIdx, pts.length - 1)];
          drawPenHead(head.x, head.y, now);
          emitAt(head.x, head.y, 2, 3, Math.random() < 0.3 ? 1 : 0);
        }
        // Shimmer sparkles along the already-drawn stroke
        if (drawnIdx > 10 && Math.random() < 0.5) {
          const sp = pts[Math.floor(rand(0, drawnIdx))];
          emitAt(sp.x, sp.y, 1, Math.random() < 0.4 ? 1 : 0, Math.random() < 0.25 ? 1 : 0);
        }
        updateAndDrawParticles(now, 1);

        if (rawT >= 1) {
          phase = 'hold';
          phaseStart = now;
        }
      } else if (phase === 'hold') {
        ctx.drawImage(ink, 0, 0, w, h);
        if (Math.random() < 0.6) {
          const sp = pts[Math.floor(rand(0, pts.length - 1))];
          emitAt(sp.x, sp.y, 1, 1, Math.random() < 0.3 ? 1 : 0);
        }
        updateAndDrawParticles(now, 1);

        if (phaseElapsed >= HOLD_DURATION_MS) {
          phase = 'fade';
          phaseStart = now;
        }
      } else {
        const fadeProgress = Math.min(1, phaseElapsed / FADE_DURATION_MS);
        const eased = 1 - Math.pow(1 - fadeProgress, 3);
        const alpha = 1 - eased;

        setOpacity(alpha);
        ctx.globalAlpha = alpha;
        ctx.drawImage(ink, 0, 0, w, h);
        ctx.globalAlpha = 1;
        updateAndDrawParticles(now, alpha);

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
      data-testid="light-trails-canvas"
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
