'use client';

import { useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════
// CUSTOM TRADINGVIEW-STYLE CANVAS CHART
// 10 market scenarios, smooth 60fps morphing between datasets,
// animated candles, volume bars, grid, sweeping crosshair.
// ═══════════════════════════════════════════════════════════════════
const N = 48;
const MORPH_MS = 950;

export interface Ohlcv { o: number; h: number; l: number; c: number; v: number }

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(t: number, c: number, s: number) {
  return Math.exp(-((t - c) * (t - c)) / (2 * s * s));
}

// Base close-price curves for each scenario
const BASES: ((t: number) => number)[] = [
  // 1 Strong Bullish Trend
  (t) => 100 + 62 * t + 4 * Math.sin(t * 9),
  // 2 Sideways Consolidation
  (t) => 132 + 6 * Math.sin(t * 11) + 3 * Math.sin(t * 23),
  // 3 Bullish Breakout
  (t) => (t < 0.55 ? 112 + 4 * Math.sin(t * 18) : 112 + 72 * Math.pow((t - 0.55) / 0.45, 1.15)),
  // 4 Pullback
  (t) => (t < 0.6 ? 100 + 58 * (t / 0.6) : 158 - 26 * ((t - 0.6) / 0.4)),
  // 5 Double Top
  (t) => 106 + 50 * (gauss(t, 0.32, 0.1) + gauss(t, 0.68, 0.1)) - 16 * Math.max(0, (t - 0.82) / 0.18),
  // 6 Bearish Downtrend
  (t) => 168 - 60 * t + 4 * Math.sin(t * 10),
  // 7 Support Bounce
  (t) => (t < 0.55 ? 164 - 54 * (t / 0.55) : 110 + 48 * ((t - 0.55) / 0.45)),
  // 8 Resistance Rejection
  (t) => (t < 0.62 ? 104 + 54 * Math.pow(Math.min(1, t / 0.55), 0.85) : 158 - 42 * ((t - 0.62) / 0.38)),
  // 9 High Volatility
  (t) => 132 + 24 * Math.sin(t * 21) + 11 * Math.sin(t * 55) + 6 * Math.sin(t * 9),
  // 10 Recovery Trend
  (t) => (t < 0.4 ? 152 - 44 * (t / 0.4) : 108 + 64 * Math.pow((t - 0.4) / 0.6, 1.05)),
];

export const SCENARIO_META = [
  { label: 'Strong Bullish Trend', tone: 'up' },
  { label: 'Sideways Consolidation', tone: 'flat' },
  { label: 'Bullish Breakout', tone: 'up' },
  { label: 'Pullback', tone: 'down' },
  { label: 'Double Top', tone: 'down' },
  { label: 'Bearish Downtrend', tone: 'down' },
  { label: 'Support Bounce', tone: 'up' },
  { label: 'Resistance Rejection', tone: 'down' },
  { label: 'High Volatility', tone: 'flat' },
  { label: 'Recovery Trend', tone: 'up' },
] as const;

const DATASETS: Ohlcv[][] = BASES.map((base, si) => {
  const rng = mulberry32(si * 1013 + 77);
  const noiseAmp = si === 8 ? 6 : 2.2;
  const data: Ohlcv[] = [];
  let prevClose = base(0) + (rng() - 0.5) * noiseAmp;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const c = base(t) + (rng() - 0.5) * 2 * noiseAmp;
    const o = prevClose;
    const spread = Math.abs(c - o);
    const wick = noiseAmp * (0.8 + rng() * 1.6);
    const h = Math.max(o, c) + rng() * wick;
    const l = Math.min(o, c) - rng() * wick;
    const v = 24 + rng() * 60 + spread * 7;
    data.push({ o, h, l, c, v });
    prevClose = c;
  }
  return data;
});

const UP = '#34d399';
const DN = '#f87171';

interface Props { scenario: number; active: boolean }

export default function CandleChart({ scenario, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    displayed: DATASETS[0].map((d) => ({ ...d })),
    prev: DATASETS[0].map((d) => ({ ...d })),
    target: 0,
    morphStart: 0,
    morphing: false,
  });
  const scenarioRef = useRef(scenario);
  const activeRef = useRef(active);
  activeRef.current = active;

  // Trigger morph on scenario change
  useEffect(() => {
    if (scenario === scenarioRef.current) return;
    const s = stateRef.current;
    s.prev = s.displayed.map((d) => ({ ...d }));
    s.target = scenario;
    s.morphStart = performance.now();
    s.morphing = true;
    scenarioRef.current = scenario;
  }, [scenario]);

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
      if (!activeRef.current || !canvas || !ctx) return;

      const s = stateRef.current;
      // Morph interpolation
      if (s.morphing) {
        const raw = Math.min(1, (now - s.morphStart) / MORPH_MS);
        const t = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        const tgt = DATASETS[s.target];
        for (let i = 0; i < N; i++) {
          const a = s.prev[i], b = tgt[i], d = s.displayed[i];
          d.o = a.o + (b.o - a.o) * t;
          d.h = a.h + (b.h - a.h) * t;
          d.l = a.l + (b.l - a.l) * t;
          d.c = a.c + (b.c - a.c) * t;
          d.v = a.v + (b.v - a.v) * t;
        }
        if (raw >= 1) s.morphing = false;
      }

      const W = canvas.width / dpr, H = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const padL = 10, padR = 58, padT = 16;
      const volH = H * 0.15;
      const padB = volH + 14;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      // Price range
      let min = Infinity, max = -Infinity, vMax = 0;
      for (const d of s.displayed) {
        if (d.l < min) min = d.l;
        if (d.h > max) max = d.h;
        if (d.v > vMax) vMax = d.v;
      }
      const pad = (max - min) * 0.09 + 0.001;
      min -= pad; max += pad;
      const yOf = (p: number) => padT + ((max - p) / (max - min)) * plotH;
      const xOf = (i: number) => padL + ((i + 0.5) / N) * plotW;
      const cw = (plotW / N) * 0.6;

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
        ctx.fillText(price.toFixed(1), W - padR + 10, y + 3);
      }
      for (let g = 0; g <= 6; g++) {
        const x = padL + (g / 6) * plotW;
        ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke();
      }

      // Volume bars
      for (let i = 0; i < N; i++) {
        const d = s.displayed[i];
        const up = d.c >= d.o;
        const vh = (d.v / vMax) * volH;
        ctx.fillStyle = up ? 'rgba(52,211,153,0.30)' : 'rgba(248,113,113,0.30)';
        ctx.fillRect(xOf(i) - cw / 2, H - 10 - vh, cw, vh);
      }

      // Candles
      for (let i = 0; i < N; i++) {
        const d = s.displayed[i];
        const up = d.c >= d.o;
        const col = up ? UP : DN;
        const x = xOf(i);
        const glow = i >= N - 3;

        ctx.save();
        if (glow) {
          const pulse = i === N - 1 ? 10 + 5 * Math.sin(now * 0.005) : 7;
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
      const ci = Math.min(N - 1, Math.floor(sweep * N));
      const cx = xOf(ci);
      const cy = yOf(s.displayed[ci].c);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx, padT); ctx.lineTo(cx, padT + plotH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL, cy); ctx.lineTo(W - padR + 4, cy); ctx.stroke();
      ctx.setLineDash([]);
      // Price tag
      const tag = s.displayed[ci].c.toFixed(1);
      ctx.fillStyle = 'rgba(139,124,246,0.9)';
      const tagW = ctx.measureText(tag).width + 12;
      ctx.beginPath();
      ctx.roundRect(W - padR + 4, cy - 8, tagW, 16, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(tag, W - padR + 10, cy + 3);
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
