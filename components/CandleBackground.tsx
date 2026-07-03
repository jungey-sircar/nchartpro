'use client';

import { useRef, useEffect } from 'react';
import { type Theme } from './ThemeProvider';

interface Candle {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  up: boolean;
}

interface Props {
  theme: Theme;
}

export default function CandleBackground({ theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const THEME_COLORS: Record<Theme, { up: string; down: string; wick: string }> = {
      'app-default': { up: 'rgba(52, 211, 153, 0.28)', down: 'rgba(248, 113, 113, 0.28)', wick: 'rgba(167, 139, 250, 0.20)' },
      dark:          { up: 'rgba(52, 211, 153, 0.22)', down: 'rgba(248, 113, 113, 0.22)', wick: 'rgba(124, 111, 255, 0.18)' },
      light:         { up: 'rgba(16, 185, 129, 0.25)', down: 'rgba(239, 68, 68, 0.25)',   wick: 'rgba(108, 99, 255, 0.15)' },
    };

    let candles: Candle[] = [];
    let offset = 0;
    let animId: number;
    const candleW = 14;
    const gap = 6;
    const step = candleW + gap;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      buildCandles();
    }

    function buildCandles() {
      if (!canvas) return;
      const count = Math.ceil(canvas.width / step) + 4;
      let price = canvas.height * 0.5;
      candles = [];
      for (let i = 0; i < count; i++) {
        const volatility = canvas.height * 0.06;
        const open = price;
        price += (Math.random() - 0.48) * volatility;
        const close = price;
        const hi = Math.min(open, close) - Math.random() * volatility * 0.3;
        const lo = Math.max(open, close) + Math.random() * volatility * 0.3;
        candles.push({ x: i * step, open, close, high: hi, low: lo, up: close < open });
      }
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const c = THEME_COLORS[theme];
      const h = canvas.height;

      for (const cd of candles) {
        const drawX = cd.x - (offset % (candles.length * step));
        if (drawX < -step || drawX > canvas.width + step) continue;

        const color = cd.up ? c.up : c.down;
        const bodyTop = Math.min(cd.open, cd.close);
        const bodyH = Math.max(2, Math.abs(cd.close - cd.open));
        const cx = drawX + candleW / 2;

        // wick
        ctx.strokeStyle = c.wick;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, h - cd.high);
        ctx.lineTo(cx, h - cd.low);
        ctx.stroke();

        // body
        ctx.fillStyle = color;
        ctx.fillRect(drawX, h - bodyTop - bodyH, candleW, bodyH);
      }

      offset += 0.25;
      animId = requestAnimationFrame(draw);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
