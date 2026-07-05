
'use client';

import { useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════
// CUSTOM TRADINGVIEW-STYLE CANVAS CHART
// Single live market stream with sliding candles, volume bars, grid,
// and a sweeping crosshair.
// ═══════════════════════════════════════════════════════════════════
const N = 48;
const WINDOW = N + 1;
const STEP_MS = 320;

export interface Ohlcv { o: number; h: number; l: number; c: number; v: number }

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildInitialWindow() {
  const rng = mulberry32(1729);
  const candles: Ohlcv[] = [];
  let close = 118;
  let momentum = 0.16;
  for (let i = 0; i < WINDOW; i++) {
    momentum = momentum * 0.96 + (rng() - 0.5) * 0.75;
    const drift = Math.sin(i * 0.22) * 0.28 + momentum;
    const open = close;
    close = clamp(close + drift + (rng() - 0.5) * 1.6, 94, 198);
    const spread = Math.abs(close - open);
    const wick = 1.4 + rng() * 3.4 + spread * 0.4;
    const high = Math.max(open, close) + rng() * wick;
    const low = Math.min(open, close) - rng() * wick;
    const volume = 24 + rng() * 58 + spread * 11;
    candles.push({ o: open, h: high, l: low, c: close, v: volume });
  }
  return candles;
}

function advanceWindow(candles: Ohlcv[], rng: () => number, step: number, momentum: { value: number }) {
  const prev = candles[candles.length - 1];
  momentum.value = momentum.value * 0.92 + (rng() - 0.5) * 0.95;
  const wave = Math.sin(step * 0.17) * 0.42 + Math.sin(step * 0.05) * 0.23;
  const impulse = rng() > 0.96 ? (rng() - 0.5) * 3.2 : 0;
  const open = prev.c;
  const close = clamp(open + momentum.value + wave + impulse + (rng() - 0.5) * 1.25, 94, 198);
  const spread = Math.abs(close - open);
  const wick = 1.1 + rng() * 3.8 + spread * 0.48;
  const high = Math.max(open, close) + rng() * wick;
  const low = Math.min(open, close) - rng() * wick;
  const volume = 22 + rng() * 66 + spread * 13 + Math.abs(momentum.value) * 20;

  candles.push({ o: open, h: high, l: low, c: close, v: volume });
  if (candles.length > WINDOW) candles.shift();
}

const UP = '#34d399';
const DN = '#f87171';

interface Props { active: boolean }

export default function CandleChart({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    candles: buildInitialWindow(),
    rng: mulberry32(481516),
    momentum: { value: 0.18 },
    slide: 0,
    step: 0,
    lastStepAt: performance.now(),
  });
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function draw(now: number) {
      animId = requestAnimationFrame(draw);

      const s = stateRef.current;
      if (!activeRef.current || !canvas || !ctx) {
        s.lastStepAt = now;
        return;
      }

      const elapsed = now - s.lastStepAt;
      const steps = Math.floor(elapsed / STEP_MS);
      if (steps > 0) {
        for (let i = 0; i < steps; i++) {
          advanceWindow(s.candles, s.rng, s.step, s.momentum);
          s.step += 1;
        }
        s.lastStepAt += steps * STEP_MS;
      }
      s.slide = (now - s.lastStepAt) / STEP_MS;

      const W = canvas.width / dpr, H = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const padL = 10, padR = 58, padT = 16;
      const volH = H * 0.15;
      const padB = volH + 14;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const rightInset = 100;
      const candlePlotW = plotW - rightInset;
      const spacing = candlePlotW / N;
      const xShift = (s.slide - 1) * spacing;

      // Price range
      let min = Infinity, max = -Infinity, vMax = 0;
      for (const d of s.candles) {
        if (d.l < min) min = d.l;
        if (d.h > max) max = d.h;
        if (d.v > vMax) vMax = d.v;
      }
      const pad = (max - min) * 0.09 + 0.001;
      min -= pad; max += pad;
      const yOf = (p: number) => padT + ((max - p) / (max - min)) * plotH;
      const xOf = (i: number) => padL + ((i + 0.5) / N) * candlePlotW;
      const cw = (candlePlotW / N) * 0.6;

      // Watermark
      ctx.font = '700 44px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NChartPro', W / 2, H / 2);

      // Grid + price labels
      ctx.strokeStyle = 'rgba(255,255,255,0.055)';
      ctx.fillStyle = 'rgba(255,255,255,0.34)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.lineWidth = 1;
      for (let g = 0; g <= 5; g++) {
        const y = padT + (g / 5) * plotH;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR + 4, y); ctx.stroke();
        const price = max - (g / 5) * (max - min);
        ctx.fillText(price.toFixed(1), W - padR - rightInset + 10, y + 3);
      }
      for (let g = 0; g <= 6; g++) {
        const x = padL + (g / 6) * plotW;
        ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke();
      }

      // Volume bars
      for (let i = 0; i < s.candles.length; i++) {
        const d = s.candles[i];
        const up = d.c >= d.o;
        const vh = (d.v / vMax) * volH;
        ctx.fillStyle = up ? 'rgba(52,211,153,0.30)' : 'rgba(248,113,113,0.30)';
        ctx.fillRect(xOf(i) - cw / 2 + xShift, H - 10 - vh, cw, vh);
      }

      // Candles
      for (let i = 0; i < s.candles.length; i++) {
        const d = s.candles[i];
        const up = d.c >= d.o;
        const col = up ? UP : DN;
        const x = xOf(i) + xShift;
        const glow = i >= s.candles.length - 3;

        ctx.save();
        if (glow) {
          const pulse = i === s.candles.length - 1 ? 10 + 5 * Math.sin(now * 0.005) : 7;
          ctx.shadowColor = col;
          ctx.shadowBlur = pulse;
        }
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yOf(d.h));
        ctx.lineTo(x, yOf(d.l));
        ctx.stroke();

        const bodyTop = yOf(Math.max(d.o, d.c));
        const bodyH = Math.max(1, Math.abs(yOf(d.o) - yOf(d.c)));
        ctx.fillStyle = col;
        ctx.fillRect(x - cw / 2, bodyTop, cw, bodyH);
        ctx.restore();
      }

      // Sweeping crosshair
      const sweep = (Math.sin(now * 0.00042) + 1) / 2;
        const ci = Math.min(s.candles.length - 1, Math.floor(sweep * s.candles.length));
        const cx = xOf(ci) + xShift;
        const cy = yOf(s.candles[ci].c);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx, padT); ctx.lineTo(cx, padT + plotH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL, cy); ctx.lineTo(W - padR + 4, cy); ctx.stroke();
      ctx.setLineDash([]);
      // Price tag
        const tag = s.candles[ci].c.toFixed(1);
      ctx.fillStyle = 'rgba(139,124,246,0.9)';
      const tagW = ctx.measureText(tag).width + 12;
      ctx.beginPath();
      ctx.roundRect(W - padR - rightInset + 4, cy - 8, tagW, 16, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(tag, W - padR - rightInset + 10, cy + 3);
      // Crosshair dot
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    animId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="story-chart-canvas"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
