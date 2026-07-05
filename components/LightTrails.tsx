'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════
// STOCK-MARKET LIGHT TRAIL — rises from the bottom-left corner like a
// price chart (up-moves and pullbacks) and vanishes at top-center.
// ═══════════════════════════════════════════════════════════════════
const DRAW_DURATION_MS = 2700;
const HOLD_DURATION_MS = 300;
const FADE_DURATION_MS = 1000;
const SAMPLE_COUNT = 420;

const GOLD = { r: 235, g: 190, b: 115 };
const FIRE = { r: 255, g: 130, b: 35 };
const CORE = { r: 255, g: 250, b: 232 };

interface Pt { x: number; y: number }

function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// Zigzag price-action path: bottom-left corner → top-center
function buildMarketPath(w: number, h: number): Pt[] {
  const pivots: Pt[] = [{ x: -30, y: h + 30 }, { x: w * 0.03, y: h * 0.86 }];
  const steps = 13;
  const startX = w * 0.03, endX = w * 0.50;
  const startY = h * 0.86, endY = h * 0.08;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = lerp(startX, endX, t) + rand(-w * 0.012, w * 0.012);
    const trend = lerp(startY, endY, t);
    const pullback = i % 3 === 2;
    const y = trend + (pullback ? rand(0.05, 0.11) : rand(-0.055, -0.01)) * h;
    pivots.push({ x, y });
  }
  pivots.push({ x: w * 0.5, y: endY });

  // Arc-length uniform sampling along the sharp polyline
  const lens: number[] = [0];
  for (let i = 1; i < pivots.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(pivots[i].x - pivots[i - 1].x, pivots[i].y - pivots[i - 1].y));
  }
  const total = lens[lens.length - 1];
  const pts: Pt[] = [];
  let seg = 1;
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const d = (i / SAMPLE_COUNT) * total;
    while (seg < lens.length - 1 && lens[seg] < d) seg++;
    const t = (d - lens[seg - 1]) / Math.max(1e-6, lens[seg] - lens[seg - 1]);
    pts.push({
      x: lerp(pivots[seg - 1].x, pivots[seg].x, t),
      y: lerp(pivots[seg - 1].y, pivots[seg].y, t),
    });
  }
  return pts;
}

const MAX_PARTICLES = 260;
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; decay: number; size: number; phase: number;
  kind: 'dust' | 'ember' | 'star';
}

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

interface Props { onComplete: () => void }

export default function LightTrails({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [opacity, setOpacity] = useState(1);
  const completeCalled = useRef(false);

  const handleComplete = useCallback(() => {
    if (!completeCalled.current) { completeCalled.current = true; onComplete(); }
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

    const pts = buildMarketPath(w, h);
    const particles: Particle[] = [];

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
    let burstDone = false;
    let animId = 0;

    function inkSegment(i: number) {
      const a = pts[i - 1], b = pts[i];
      const t = i / SAMPLE_COUNT;
      const lw = 2.6 * Math.min(1, t / 0.03, (1 - t) / 0.05 + 0.4);

      inkCtx.strokeStyle = `rgba(${FIRE.r}, ${FIRE.g}, ${FIRE.b}, 0.10)`;
      inkCtx.lineWidth = lw * 4 + 9;
      inkCtx.shadowColor = `rgba(${FIRE.r}, ${FIRE.g}, ${FIRE.b}, 0.45)`;
      inkCtx.shadowBlur = 26;
      inkCtx.beginPath(); inkCtx.moveTo(a.x, a.y); inkCtx.lineTo(b.x, b.y); inkCtx.stroke();

      inkCtx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.9)`;
      inkCtx.lineWidth = lw;
      inkCtx.shadowColor = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.75)`;
      inkCtx.shadowBlur = 14;
      inkCtx.beginPath(); inkCtx.moveTo(a.x, a.y); inkCtx.lineTo(b.x, b.y); inkCtx.stroke();

      inkCtx.strokeStyle = `rgba(${CORE.r}, ${CORE.g}, ${CORE.b}, 0.92)`;
      inkCtx.lineWidth = Math.max(0.6, lw * 0.4);
      inkCtx.shadowColor = `rgba(${CORE.r}, ${CORE.g}, ${CORE.b}, 0.85)`;
      inkCtx.shadowBlur = 5;
      inkCtx.beginPath(); inkCtx.moveTo(a.x, a.y); inkCtx.lineTo(b.x, b.y); inkCtx.stroke();
    }

    function addParticle(p: Particle) {
      if (particles.length >= MAX_PARTICLES) {
        let oldest = 0;
        for (let j = 1; j < particles.length; j++) if (particles[j].life < particles[oldest].life) oldest = j;
        particles[oldest] = p;
      } else particles.push(p);
    }

    function emitAt(x: number, y: number, dust: number, embers: number, stars: number) {
      for (let i = 0; i < dust; i++) addParticle({
        x: x + rand(-4, 4), y: y + rand(-4, 4), vx: rand(-0.8, 0.8), vy: rand(-0.4, 1),
        life: 1, decay: rand(0.007, 0.02), size: rand(0.6, 2.2), phase: rand(0, Math.PI * 2), kind: 'dust',
      });
      for (let i = 0; i < embers; i++) {
        const ang = rand(0, Math.PI * 2), spd = rand(0.6, 2.8);
        addParticle({
          x: x + rand(-3, 3), y: y + rand(-3, 3),
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - rand(0.6, 1.8),
          life: 1, decay: rand(0.014, 0.035), size: rand(1, 3), phase: rand(0, Math.PI * 2), kind: 'ember',
        });
      }
      for (let i = 0; i < stars; i++) addParticle({
        x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-0.4, 0.4), vy: rand(-0.5, 0.3),
        life: 1, decay: rand(0.012, 0.025), size: rand(1.4, 2.8), phase: rand(0, Math.PI * 2), kind: 'star',
      });
    }

    function drawStar(c: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) {
      c.strokeStyle = `rgba(${CORE.r}, ${CORE.g}, ${CORE.b}, ${alpha})`;
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
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.98;
        p.vy = p.kind === 'ember' ? p.vy * 0.97 - 0.045 : p.vy * 0.985 + 0.012;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const twinkle = 0.55 + 0.45 * Math.sin(now * 0.014 + p.phase);
        const a = p.life * twinkle * globalAlpha;
        if (p.kind === 'star') drawStar(ctx, p.x, p.y, p.size * 3.2 * p.life, a);
        else if (p.kind === 'ember') {
          ctx.fillStyle = emberColor(p.life, a);
          ctx.shadowColor = emberColor(p.life, a * 0.9);
          ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${a})`;
          ctx.shadowColor = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${a * 0.8})`;
          ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    function drawHead(x: number, y: number, now: number) {
      if (!ctx) return;
      ctx.save();
      const pulse = 1 + 0.12 * Math.sin(now * 0.022);
      const halo = ctx.createRadialGradient(x, y, 0, x, y, 38 * pulse);
      halo.addColorStop(0, `rgba(${CORE.r}, ${CORE.g}, ${CORE.b}, 0.95)`);
      halo.addColorStop(0.18, 'rgba(255, 215, 120, 0.6)');
      halo.addColorStop(0.45, `rgba(${FIRE.r}, ${FIRE.g}, ${FIRE.b}, 0.25)`);
      halo.addColorStop(0.75, 'rgba(220, 70, 15, 0.08)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, 38 * pulse, 0, Math.PI * 2); ctx.fill();

      const flareLen = 26 * pulse;
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

      ctx.shadowColor = `rgba(${CORE.r}, ${CORE.g}, ${CORE.b}, 1)`;
      ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(255, 253, 245, 0.98)';
      ctx.beginPath(); ctx.arc(x, y, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function tick(now: number) {
      if (!canvas || !ctx) return;
      const phaseElapsed = now - phaseStart;
      ctx.clearRect(0, 0, w, h);

      if (phase === 'draw') {
        const rawT = Math.min(1, phaseElapsed / DRAW_DURATION_MS);
        const t = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
        const targetIdx = Math.floor(t * SAMPLE_COUNT);
        while (drawnIdx < targetIdx && drawnIdx < pts.length - 1) { drawnIdx++; inkSegment(drawnIdx); }

        ctx.drawImage(ink, 0, 0, w, h);
        if (drawnIdx < SAMPLE_COUNT) {
          const head = pts[Math.min(drawnIdx, pts.length - 1)];
          drawHead(head.x, head.y, now);
          emitAt(head.x, head.y, 2, 3, Math.random() < 0.3 ? 1 : 0);
        }
        if (drawnIdx > 10 && Math.random() < 0.4) {
          const sp = pts[Math.floor(rand(0, drawnIdx))];
          emitAt(sp.x, sp.y, 1, 0, Math.random() < 0.2 ? 1 : 0);
        }
        updateAndDrawParticles(now, 1);

        if (rawT >= 1) {
          if (!burstDone) {
            burstDone = true;
            const end = pts[pts.length - 1];
            emitAt(end.x, end.y, 10, 14, 5);
          }
          phase = 'hold';
          phaseStart = now;
        }
      } else if (phase === 'hold') {
        ctx.drawImage(ink, 0, 0, w, h);
        updateAndDrawParticles(now, 1);
        if (phaseElapsed >= HOLD_DURATION_MS) { phase = 'fade'; phaseStart = now; }
      } else {
        const fadeProgress = Math.min(1, phaseElapsed / FADE_DURATION_MS);
        const alpha = 1 - (1 - Math.pow(1 - fadeProgress, 3));
        setOpacity(alpha);
        ctx.globalAlpha = alpha;
        ctx.drawImage(ink, 0, 0, w, h);
        ctx.globalAlpha = 1;
        updateAndDrawParticles(now, alpha);
        if (fadeProgress >= 1) { handleComplete(); return; }
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
      style={{ position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none', opacity }}
    />
  );
}
