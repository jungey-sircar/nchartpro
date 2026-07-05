'use client';

import { useRef, useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════
// CANDLESTICK MATRIX LOADER — full-screen black scene, glowing candle
// rain, dissolves into particles, then reveals the hero.
// ═══════════════════════════════════════════════════════════════════
const RAIN_MS = 2500;
const DISSOLVE_MS = 1000;
const FADE_MS = 600;

interface Candle { bodyH: number; wickTop: number; wickBot: number; up: boolean }
interface Stream { x: number; y: number; speed: number; candles: Candle[]; bright: number }
interface P { x: number; y: number; vx: number; vy: number; life: number; decay: number; size: number; up: boolean }

function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function mkCandle(): Candle {
  return { bodyH: rand(7, 26), wickTop: rand(2, 13), wickBot: rand(2, 13), up: Math.random() > 0.5 };
}
function candleH(c: Candle) { return c.wickTop + c.bodyH + c.wickBot; }

const UP = { r: 52, g: 211, b: 153 };
const DN = { r: 248, g: 113, b: 113 };

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

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t = setTimeout(finish, 400);
      return () => clearTimeout(t);
    }

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

    const spacing = 46;
    const cols = Math.ceil(w / spacing) + 1;
    const streams: Stream[] = [];
    for (let i = 0; i < cols; i++) {
      const candles: Candle[] = [];
      for (let j = 0; j < 10; j++) candles.push(mkCandle());
      streams.push({
        x: i * spacing + rand(-8, 8),
        y: rand(-h * 1.6, h * 0.4),
        speed: rand(4, 12),
        candles,
        bright: rand(0.35, 0.85),
      });
    }

    const particles: P[] = [];
    let dissolved = false;
    const start = performance.now();
    let animId = 0;

    function drawCandle(x: number, topY: number, c: Candle, alpha: number, glow: boolean) {
      if (!ctx) return;
      const bodyTop = topY + c.wickTop;
      const col = c.up ? UP : DN;
      ctx.save();
      if (glow) {
        ctx.shadowColor = `rgba(${col.r},${col.g},${col.b},${Math.min(1, alpha * 1.6)})`;
        ctx.shadowBlur = 14;
      }
      ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${alpha * 0.7})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, topY + candleH(c));
      ctx.stroke();
      ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${alpha})`;
      ctx.fillRect(x - 5, bodyTop, 10, c.bodyH);
      ctx.restore();
    }

    function dissolveStreams() {
      for (const s of streams) {
        let curY = s.y;
        for (const c of s.candles) {
          const cy = curY + c.wickTop + c.bodyH / 2;
          if (cy > -30 && cy < h + 30 && particles.length < 1400) {
            const n = 4;
            for (let k = 0; k < n; k++) {
              particles.push({
                x: s.x + rand(-6, 6), y: cy + rand(-c.bodyH / 2, c.bodyH / 2),
                vx: rand(-3.2, 3.2), vy: rand(-4.5, 1.5),
                life: 1, decay: rand(0.018, 0.04),
                size: rand(1, 3), up: c.up,
              });
            }
          }
          curY += candleH(c) + 12;
        }
      }
    }

    function tick(now: number) {
      if (!canvas || !ctx) return;
      const elapsed = now - start;
      ctx.clearRect(0, 0, w, h);

      if (elapsed < RAIN_MS) {
        for (const s of streams) {
          let curY = s.y;
          for (let ci = 0; ci < s.candles.length; ci++) {
            const c = s.candles[ci];
            const fullH = candleH(c);
            if (curY + fullH > -20 && curY < h + 20) {
              const fade = 1 - (ci / s.candles.length) * 0.65;
              drawCandle(s.x, curY, c, s.bright * fade, ci === 0);
            }
            curY += fullH + 12;
          }
          s.y += s.speed;
          const total = s.candles.reduce((a, c) => a + candleH(c) + 12, 0);
          if (s.y - total > h + 60) {
            s.y = -total - rand(0, 200);
            s.speed = rand(4, 12);
          }
        }
      } else {
        if (!dissolved) { dissolved = true; dissolveStreams(); setTimeout(() => setFading(true), DISSOLVE_MS - FADE_MS); }
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx; p.y += p.vy;
          p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.06;
          p.life -= p.decay;
          if (p.life <= 0) { particles.splice(i, 1); continue; }
          const col = p.up ? UP : DN;
          ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${(p.life * 0.85).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        if (elapsed > RAIN_MS + DISSOLVE_MS + 150) { finish(); return; }
      }
      animId = requestAnimationFrame(tick);
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
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, pointerEvents: 'none',
      }}>
        <div style={{
          fontSize: 'clamp(1.6rem, 3.2vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em',
          color: '#B284BE',
          textShadow: '0 0 30px rgba(178,132,190,0.5), 0 0 60px rgba(178,132,190,0.2)',
          animation: 'loaderPulse 1.6s ease-in-out infinite',
        }}>
          NChartPro
        </div>
        <div style={{
          fontSize: 11, letterSpacing: '0.35em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace',
        }}>
          Loading Markets
        </div>
      </div>
      <style>{`@keyframes loaderPulse{0%,100%{opacity:.75}50%{opacity:1}}`}</style>
    </div>
  );
}
