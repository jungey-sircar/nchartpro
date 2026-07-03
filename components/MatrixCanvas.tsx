'use client';

import { useRef, useEffect } from 'react';
import { type Theme } from './ThemeProvider';

// ═══════════════════════════════════════════════════════════════════
// SPEED & SIZE CONTROLS
// ═══════════════════════════════════════════════════════════════════
const STEP_MS          = 30;   // ms between animation ticks
const STREAM_SPEED_MIN = 0.8;  // px per tick (min)
const STREAM_SPEED_MAX = 2.2;  // px per tick (max)

const CANDLE_W         = 10;   // candle body width (px)
const WICK_W           = 1;    // wick line width (px)
const CANDLE_GAP       = 12;   // vertical gap between candles in a stream
const CANDLES_PER_STREAM = 8;  // candles drawn per falling stream
const COL_SPACING      = 80;   // horizontal spacing between streams

// ═══════════════════════════════════════════════════════════════════
// Per-candle random shape
// ═══════════════════════════════════════════════════════════════════
interface CandleShape {
  bodyH:    number;  // body height (px)
  wickTop:  number;  // wick extending above body (px)
  wickBot:  number;  // wick extending below body (px)
  up:       boolean; // bullish (green) or bearish (red)
}

function randomCandle(): CandleShape {
  const bodyH   = 6 + Math.random() * 22;
  const wickTop = 2 + Math.random() * 14;
  const wickBot = 2 + Math.random() * 14;
  const up      = Math.random() > 0.5;
  return { bodyH, wickTop, wickBot, up };
}

// Total height of a candle (wick-to-wick)
function candleFullH(c: CandleShape) {
  return c.wickTop + c.bodyH + c.wickBot;
}

// ═══════════════════════════════════════════════════════════════════
// Stream — a column of falling candles
// ═══════════════════════════════════════════════════════════════════
interface Stream {
  x:          number;         // horizontal center
  y:          number;         // y offset (top of first candle)
  speed:      number;         // px per tick
  candles:    CandleShape[];  // the candle shapes in this stream
  brightness: number;         // base opacity
}

function buildStream(x: number, h: number): Stream {
  const candles: CandleShape[] = [];
  for (let i = 0; i < CANDLES_PER_STREAM; i++) {
    candles.push(randomCandle());
  }
  return {
    x,
    y: -Math.random() * h * 1.5,
    speed: STREAM_SPEED_MIN + Math.random() * (STREAM_SPEED_MAX - STREAM_SPEED_MIN),
    candles,
    brightness: 0.55 + Math.random() * 0.35,
  };
}

function streamTotalHeight(s: Stream): number {
  let total = 0;
  for (const c of s.candles) {
    total += candleFullH(c) + CANDLE_GAP;
  }
  return total;
}

// ═══════════════════════════════════════════════════════════════════
// Theme palette
// ═══════════════════════════════════════════════════════════════════
interface Props { theme: Theme; }

const THEME_COLORS: Record<Theme, { up: string; down: string; wick: string }> = {
  'app-default': {
    up:   'rgba(52, 211, 153, VAR)',   // green
    down: 'rgba(248, 113, 113, VAR)',  // red
    wick: 'rgba(167, 139, 250, VAR)',  // purple-ish
  },
  dark: {
    up:   'rgba(74, 222, 128, VAR)',
    down: 'rgba(251, 113, 133, VAR)',
    wick: 'rgba(124, 111, 255, VAR)',
  },
  light: {
    up:   'rgba(16, 185, 129, VAR)',
    down: 'rgba(239, 68, 68, VAR)',
    wick: 'rgba(37, 99, 235, VAR)',
  },
};

function colorWithAlpha(template: string, alpha: number): string {
  return template.replace('VAR', alpha.toFixed(2));
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════
export default function MatrixCanvas({ theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let streams: Stream[] = [];

    function makeStreams(w: number, h: number) {
      const count = Math.max(3, Math.ceil(w / COL_SPACING));
      streams = [];
      for (let i = 0; i < count; i++) {
        const x = 12 + i * COL_SPACING + (Math.random() - 0.5) * 20;
        streams.push(buildStream(x, h));
      }
    }

    function resize() {
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      makeStreams(canvas.width, canvas.height);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let lastStep = 0;

    function step(ts: number) {
      if (!canvas || !ctx) return;
      animId = requestAnimationFrame(step);
      if (ts - lastStep < STEP_MS) return;
      lastStep = ts;

      const pal = THEME_COLORS[theme];
      const h   = canvas.height;
      const w   = canvas.width;

      ctx.clearRect(0, 0, w, h);

      for (const s of streams) {
        let curY = s.y;

        for (let ci = 0; ci < s.candles.length; ci++) {
          const c = s.candles[ci];
          const fullH = candleFullH(c);

          // Candle position: top of wick
          const wickTopY = curY;
          const bodyTopY = curY + c.wickTop;
          const bodyBotY = bodyTopY + c.bodyH;
          const wickBotY = bodyBotY + c.wickBot;

          // Skip if fully off-screen
          if (wickBotY >= -20 && wickTopY <= h + 20) {
            // Fade based on position in stream (head = bright, tail = dim)
            const posFade = 1 - (ci / s.candles.length) * 0.6;
            const alpha   = s.brightness * posFade;

            const cx = s.x;
            const bodyColor = c.up
              ? colorWithAlpha(pal.up, alpha)
              : colorWithAlpha(pal.down, alpha);
            const wickColor = colorWithAlpha(pal.wick, alpha * 0.7);

            // Draw wick (thin vertical line through center)
            ctx.strokeStyle = wickColor;
            ctx.lineWidth   = WICK_W;
            ctx.beginPath();
            ctx.moveTo(cx, wickTopY);
            ctx.lineTo(cx, wickBotY);
            ctx.stroke();

            // Draw body (filled rectangle)
            ctx.fillStyle = bodyColor;
            ctx.fillRect(
              cx - CANDLE_W / 2,
              bodyTopY,
              CANDLE_W,
              c.bodyH,
            );

            // Subtle glow on the body for head candles
            if (ci === 0) {
              ctx.shadowColor   = c.up
                ? colorWithAlpha(pal.up, 0.4)
                : colorWithAlpha(pal.down, 0.4);
              ctx.shadowBlur    = 8;
              ctx.fillStyle     = bodyColor;
              ctx.fillRect(cx - CANDLE_W / 2, bodyTopY, CANDLE_W, c.bodyH);
              ctx.shadowColor   = 'transparent';
              ctx.shadowBlur    = 0;
            }
          }

          curY += fullH + CANDLE_GAP;
        }

        // Advance the stream position
        s.y += s.speed;

        // Reset once the entire stream has fallen past the bottom
        const totalH = streamTotalHeight(s);
        if (s.y - totalH > h + 100) {
          s.y = -totalH - Math.random() * 300;
          s.speed = STREAM_SPEED_MIN + Math.random() * (STREAM_SPEED_MAX - STREAM_SPEED_MIN);
          s.brightness = 0.55 + Math.random() * 0.35;
          // Regenerate candle shapes
          for (let i = 0; i < s.candles.length; i++) {
            s.candles[i] = randomCandle();
          }
        }
      }
    }

    let animId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
