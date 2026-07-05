'use client';

import { useRef, useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════
// MATRIX CANDLESTICK LOADER — classic Matrix digital-rain effect
// (dense columns, bright glowing heads, fading trails) but every
// "glyph" is a realistic share-market candlestick from a random walk.
// Stays ~2s, dissolves, then the site loads.
// ═══════════════════════════════════════════════════════════════════
const RAIN_MS = 2000;
const DISSOLVE_MS = 650;
const FADE_MS = 450;

const COL_SPACING = 26;   // dense matrix columns
const CELL_H = 34;        // vertical cell per candle (matrix grid step)
const STEP_MS = 36;       // matrix tick speed

interface Col {
  x: number;
  y: number;            // head cell y (px)
  stepEvery: number;    // ticks per step (1 = fast, 3 = slow)
  tickCount: number;
  lastClose: number;    // random-walk price state
  trailLen: number;
}

interface P { x: number; y: number; vx: number; vy: number; life: number; decay: number; size: number; up: boolean }

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

const UP = { r: 68, g: 255, b: 140 };   // matrix-green bullish
const DN = { r: 255, g: 92, b: 92 };    // bearish red

export default function CandleLoader({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const finish = () => {
      if (!doneRef.current) { doneRef.current = true; onComplete(); }
    };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    // Solid black base — trails are created by translucent black fade
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    const cols: Col[] = [];
    const nCols = Math.ceil(w / COL_SPACING) + 1;
    for (let i = 0; i < nCols; i++) {
      cols.push({
        x: i * COL_SPACING + COL_SPACING / 2,
        y: rand(-h, h * 0.6),
        stepEvery: Math.random() < 0.5 ? 1 : Math.random() < 0.75 ? 2 : 3,
        tickCount: 0,
        lastClose: rand(80, 160),
        trailLen: rand(8, 20),
      });
    }

    // Realistic candle from a random walk (open = previous close)
    function nextCandle(col: Col) {
      const o = col.lastClose;
      const drift = rand(-7, 7);
      const c = Math.max(40, Math.min(200, o + drift));
      col.lastClose = c;
      const bodyTopP = Math.max(o, c);
      const bodyH = Math.max(3, Math.min(20, Math.abs(c - o) * 1.6 + 3));
      const wickTop = rand(1.5, 9);
      const wickBot = rand(1.5, 9);
      return { up: c >= o, bodyH, wickTop, wickBot, p: bodyTopP };
    }

    function drawCandle(x: number, cellY: number, col: Col, head: boolean, dim = 1) {
      if (!ctx) return;
      const cndl = nextCandle(col);
      const colr = cndl.up ? UP : DN;
      const totalH = cndl.wickTop + cndl.bodyH + cndl.wickBot;
      const topY = cellY + (CELL_H - totalH) / 2;
      const bodyTop = topY + cndl.wickTop;

      ctx.save();
      if (head) {
        // Bright white-hot head like the matrix leading glyph
        ctx.shadowColor = `rgba(${colr.r},${colr.g},${colr.b},0.95)`;
        ctx.shadowBlur = 16;
        ctx.strokeStyle = 'rgba(240,255,245,0.95)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, topY + totalH);
        ctx.stroke();
        ctx.fillStyle = `rgba(${Math.min(255, colr.r + 140)},${Math.min(255, colr.g + 60)},${Math.min(255, colr.b + 120)},0.98)`;
        ctx.fillRect(x - 4.5, bodyTop, 9, cndl.bodyH);
        ctx.shadowBlur = 6;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x - 2, bodyTop + cndl.bodyH * 0.2, 4, cndl.bodyH * 0.6);
      } else {
        ctx.shadowColor = `rgba(${colr.r},${colr.g},${colr.b},${(0.5 * dim).toFixed(2)})`;
        ctx.shadowBlur = 7;
        ctx.strokeStyle = `rgba(${colr.r},${colr.g},${colr.b},${(0.55 * dim).toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, topY + totalH);
        ctx.stroke();
        ctx.fillStyle = `rgba(${colr.r},${colr.g},${colr.b},${(0.85 * dim).toFixed(2)})`;
        ctx.fillRect(x - 4.5, bodyTop, 9, cndl.bodyH);
      }
      ctx.restore();
    }

    // Prefill: draw each column's trail so the screen is instantly full,
    // exactly like the matrix reference (no slow fill-in).
    for (const col of cols) {
      col.y = rand(0, h);
      const trail = Math.floor(col.trailLen);
      for (let k = trail; k >= 1; k--) {
        const cy = col.y - k * CELL_H;
        if (cy < -CELL_H || cy > h) continue;
        drawCandle(col.x, cy, col, false, Math.max(0.14, 1 - k / trail) * 0.95);
      }
      drawCandle(col.x, col.y, col, true);
    }

    const particles: P[] = [];
    let dissolved = false;
    let lastStep = 0;
    const start = performance.now();
    let animId = 0;

    function spawnDissolve() {
      // Scatter particles from a grid sampling of the current frame glow
      for (const col of cols) {
        for (let cy = col.y - col.trailLen * CELL_H; cy <= col.y; cy += CELL_H) {
          if (cy < -CELL_H || cy > h) continue;
          if (particles.length >= 1500) return;
          const up = Math.random() > 0.45;
          for (let k = 0; k < 2; k++) {
            particles.push({
              x: col.x + rand(-5, 5), y: cy + rand(0, CELL_H),
              vx: rand(-3.5, 3.5), vy: rand(-5, 1.5),
              life: 1, decay: rand(0.02, 0.05),
              size: rand(1, 2.8), up,
            });
          }
        }
      }
    }

    function tick(now: number) {
      if (!canvas || !ctx) return;
      const elapsed = now - start;

      if (elapsed < RAIN_MS) {
        animId = requestAnimationFrame(tick);
        if (now - lastStep < STEP_MS) return;
        lastStep = now;

        // Matrix trail fade — translucent black wash instead of clear
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, w, h);

        for (const col of cols) {
          col.tickCount++;
          if (col.tickCount % col.stepEvery !== 0) continue;
          drawCandle(col.x, col.y, col, true);
          col.y += CELL_H;
          if (col.y - col.trailLen * CELL_H > h) {
            col.y = rand(-h * 0.4, 0);
            col.trailLen = rand(8, 20);
            col.stepEvery = Math.random() < 0.5 ? 1 : Math.random() < 0.75 ? 2 : 3;
          }
        }
      } else {
        animId = requestAnimationFrame(tick);
        if (!dissolved) {
          dissolved = true;
          spawnDissolve();
          setTimeout(() => setFading(true), Math.max(0, DISSOLVE_MS - FADE_MS));
        }
        // Fast fade of the rain frame + particle burst
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fillRect(0, 0, w, h);
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx; p.y += p.vy;
          p.vx *= 0.96; p.vy = p.vy * 0.96 + 0.1;
          p.life -= p.decay;
          if (p.life <= 0) { particles.splice(i, 1); continue; }
          const colr = p.up ? UP : DN;
          ctx.fillStyle = `rgba(${colr.r},${colr.g},${colr.b},${(p.life * 0.9).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        if (elapsed > RAIN_MS + DISSOLVE_MS + 100) { finish(); return; }
      }
    }

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [onComplete]);

  return (
    <div
      data-testid="candle-loader"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
