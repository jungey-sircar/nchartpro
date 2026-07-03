'use client';

/**
 * WordmarkCanvas — live candle animation clipped to "NChartPro" letterforms.
 *
 * Draw order each frame (the correct order for text-as-mask):
 *   1. clearRect                  — start transparent
 *   2. source-over:  fillText     — establish text shape as opaque pixels
 *   3. source-in:    fillRect bg  — paint dark bg only INSIDE the text shape
 *   4. source-atop:  draw candles — candles appear on top, clipped to text
 *   5. source-over   (reset)
 *
 * source-in clips the background to the text mask.
 * source-atop then blends candles on top, always preserving the text boundary.
 * Pixels OUTSIDE the letterforms are transparent — the page bg shows through.
 */

import { useRef, useEffect, useCallback } from 'react';
import { type Theme } from './ThemeProvider';

// bg is intentionally offset from the page background so the letterforms
// are visible — slightly lighter for dark themes, slightly darker for light.
const PALETTE: Record<Theme, { bg: string; up: string; down: string; wick: string }> = {
  'app-default': {
    bg:   'rgba(38, 34, 52, 0.96)',   // ~3× lighter than #0d0d0f
    up:   'rgba(52, 211, 153, 0.95)',
    down: 'rgba(248, 113, 113, 0.95)',
    wick: 'rgba(99, 102, 241, 0.55)',
  },
  dark: {
    bg:   'rgba(34, 34, 42, 0.96)',   // ~3× lighter than #0d0d0f
    up:   'rgba(74, 222, 128, 0.93)',
    down: 'rgba(251, 113, 133, 0.93)',
    wick: 'rgba(99, 102, 241, 0.50)',
  },
  light: {
    bg:   'rgba(180, 190, 208, 0.92)', // slightly darker than #E7EEF4
    up:   'rgba(16, 185, 129, 0.95)',
    down: 'rgba(239, 68, 68, 0.95)',
    wick: 'rgba(37, 99, 235, 0.45)',
  },
};

const CANDLE_W   = 12;
const CANDLE_GAP = 5;
const C_STEP     = CANDLE_W + CANDLE_GAP;
const SCROLL_SPD = 0.30;

interface Candle { x: number; open: number; close: number; high: number; low: number; up: boolean; }
interface Props  { fontSize: number; theme: Theme; }

function makeCandle(x: number, h: number): Candle {
  const vol   = h * 0.14;
  const base  = h * (0.18 + Math.random() * 0.64);
  const open  = base;
  const close = base + (Math.random() - 0.48) * vol;
  return {
    x,
    open,
    close,
    high: Math.max(2,     Math.min(open, close) - Math.random() * vol * 0.45),
    low:  Math.min(h - 2, Math.max(open, close) + Math.random() * vol * 0.45),
    up:   close < open,
  };
}

export default function WordmarkCanvas({ fontSize, theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontRef   = useRef<string>(`900 ${fontSize}px system-ui, sans-serif`);

  const readFont = useCallback(() => {
    const cssVar = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue('--font-geist-sans')
      .trim();
    fontRef.current = `900 ${fontSize}px ${cssVar || 'system-ui, -apple-system, sans-serif'}`;
  }, [fontSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CANVAS_H = Math.ceil(fontSize * 1.12);
    let candles: Candle[] = [];
    let offset  = 0;
    let animId  = 0;
    let stopped = false;

    function buildCandles(w: number) {
      candles = [];
      const count = Math.ceil(w / C_STEP) + 6;
      for (let i = 0; i < count; i++) candles.push(makeCandle(i * C_STEP, CANVAS_H));
    }

    function resize() {
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;
      canvas.width  = Math.round(container.getBoundingClientRect().width);
      canvas.height = CANVAS_H;
      buildCandles(canvas.width);
    }

    function drawCandlesCtx(c2d: CanvasRenderingContext2D, W: number, H: number, pal: typeof PALETTE[Theme]) {
      const wrap = candles.length * C_STEP;
      for (const c of candles) {
        const dx = ((c.x - offset % wrap) % wrap + wrap) % wrap;
        if (dx > W + C_STEP) continue;

        const bodyTop = Math.min(c.open, c.close);
        const bodyH   = Math.max(2, Math.abs(c.close - c.open));
        const cx      = dx + CANDLE_W / 2;

        c2d.strokeStyle = pal.wick;
        c2d.lineWidth   = 1;
        c2d.beginPath();
        c2d.moveTo(cx, c.high);
        c2d.lineTo(cx, c.low);
        c2d.stroke();

        const color = c.up ? pal.up : pal.down;
        const grad  = c2d.createLinearGradient(0, bodyTop, 0, bodyTop + bodyH);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color.replace(/[\d.]+\)$/, '0.50)'));
        c2d.fillStyle = grad;
        c2d.fillRect(dx, bodyTop, CANDLE_W, bodyH);
      }

      offset += SCROLL_SPD;

      // Recycle leftmost candle once it scrolls off-screen
      const minX = candles.reduce((m, c) => Math.min(m, c.x), Infinity);
      if (minX - offset < -C_STEP * 2) {
        const maxX = candles.reduce((m, c) => Math.max(m, c.x), -Infinity);
        candles.push(makeCandle(maxX + C_STEP, H));
        const old = candles.findIndex(c => c.x === minX);
        if (old !== -1) candles.splice(old, 1);
      }
    }

    function draw() {
      if (stopped || !ctx || !canvas) return;
      animId = requestAnimationFrame(draw);

      const W   = canvas.width;
      const H   = canvas.height;
      const pal = PALETTE[theme];

      // ── 1. Clear to transparent ───────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      // ── 2. Draw text letterforms as the mask (source-over) ────────
      //    Any pixel the text paints (alpha > 0) becomes a "keep" zone.
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = fontRef.current;
      if ('letterSpacing' in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '-0.04em';
      }
      ctx.textBaseline = 'top';
      ctx.fillStyle    = '#ffffff';
      ctx.fillText('NChartPro', 0, 0);

      // ── 3. Paint dark background INSIDE the text shape only ───────
      //    source-in: result pixels exist only where BOTH source (bg fill)
      //    and destination (text) are non-zero alpha.
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, W, H);

      // ── 4. Draw candles on top, still clipped to text area ────────
      //    source-atop: new drawing appears on top of destination,
      //    but ONLY where destination (the bg-inside-text) exists.
      //    Destination pixels show through where no candle is drawn.
      ctx.globalCompositeOperation = 'source-atop';
      drawCandlesCtx(ctx, W, H, pal);

      // ── 5. Reset ──────────────────────────────────────────────────
      ctx.globalCompositeOperation = 'source-over';

      // ── 6. Hairline letterform border ─────────────────────────────
      //    Draw text again as a thin stroke so the letter edges have a
      //    subtle accent outline (~0.5 px rendered; minimum practical).
      ctx.font = fontRef.current;
      if ('letterSpacing' in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '-0.04em';
      }
      ctx.textBaseline  = 'top';
      ctx.lineWidth     = 0.5;
      ctx.strokeStyle   = pal.wick;  // reuse wick colour — soft accent
      ctx.strokeText('NChartPro', 0, 0);
    }

    function start() {
      readFont();
      resize();
      draw();
    }

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!cancelled) { start(); }
    });

    const ro = new ResizeObserver(() => { if (!stopped) resize(); });
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    cleanup = () => {
      stopped = true;
      cancelled = true;
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
    return () => cleanup?.();
  }, [fontSize, theme, readFont]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="NChartPro"
      role="img"
      style={{ display: 'block', width: '100%', height: fontSize * 1.12, lineHeight: 0 }}
    />
  );
}
