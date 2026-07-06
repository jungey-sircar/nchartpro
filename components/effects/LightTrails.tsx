'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DRAW_DURATION_MS = 2200;
const HOLD_DURATION_MS = 260;
const FADE_DURATION_MS = 900;

interface Pt { x: number; y: number }
interface Props { onComplete: () => void }

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function buildWavePath(w: number, h: number): Pt[] {
  return [
    { x: -80, y: h + 80 },
    { x: w * 0.02, y: h * 0.96 },
    { x: w * 0.08, y: h * 0.78 },
    { x: w * 0.15, y: h * 0.50 },
    { x: w * 0.22, y: h * 0.22 },
    { x: w * 0.31, y: h * 0.10 },
    { x: w * 0.41, y: h * 0.16 },
    { x: w * 0.52, y: h * 0.34 },
    { x: w * 0.63, y: h * 0.58 },
    { x: w * 0.74, y: h * 0.84 },
    { x: w * 0.84, y: h * 0.56 },
    { x: w * 0.92, y: h * 0.12 },
    { x: w * 1.06, y: h * -0.04 },
  ];
}

function samplePath(points: Pt[], count: number): Pt[] {
  const lengths: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }

  const total = lengths[lengths.length - 1];
  const sampled: Pt[] = [];
  let seg = 1;

  for (let i = 0; i <= count; i++) {
    const d = (i / count) * total;
    while (seg < lengths.length - 1 && lengths[seg] < d) seg++;
    const t = (d - lengths[seg - 1]) / Math.max(1e-6, lengths[seg] - lengths[seg - 1]);
    sampled.push({
      x: lerp(points[seg - 1].x, points[seg].x, t),
      y: lerp(points[seg - 1].y, points[seg].y, t),
    });
  }

  return sampled;
}

export default function LightTrails({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [opacity, setOpacity] = useState(1);
  const completeCalled = useRef(false);

  const handleComplete = useCallback(() => {
    if (completeCalled.current) return;
    completeCalled.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const mainCtx = ctx;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const path = samplePath(buildWavePath(w, h), 620);
    const ink = document.createElement('canvas');
    ink.width = canvas.width;
    ink.height = canvas.height;
    const inkCtx = ink.getContext('2d');
    if (!inkCtx) return;
    const trailCtx = inkCtx;
    trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    trailCtx.lineCap = 'round';
    trailCtx.lineJoin = 'round';

    const baseGlow = 'rgba(255, 167, 70, 0.18)';
    const midGlow = 'rgba(255, 198, 119, 0.78)';
    const coreGlow = 'rgba(255, 247, 225, 0.98)';

    let frame = 0;
    let phase: 'draw' | 'hold' | 'fade' = 'draw';
    let phaseStart = performance.now();
    let animId = 0;

    function drawSegment(count: number) {
      const prev = path[count - 1];
      const curr = path[count];
      const t = count / path.length;
      const width = 1.8 + 0.6 * Math.sin(t * Math.PI);

      trailCtx.save();
      trailCtx.shadowColor = baseGlow;
      trailCtx.shadowBlur = 22;
      trailCtx.strokeStyle = baseGlow;
      trailCtx.lineWidth = width * 6.5;
      trailCtx.beginPath();
      trailCtx.moveTo(prev.x, prev.y);
      trailCtx.lineTo(curr.x, curr.y);
      trailCtx.stroke();

      trailCtx.shadowColor = midGlow;
      trailCtx.shadowBlur = 12;
      trailCtx.strokeStyle = midGlow;
      trailCtx.lineWidth = width * 2.0;
      trailCtx.beginPath();
      trailCtx.moveTo(prev.x, prev.y);
      trailCtx.lineTo(curr.x, curr.y);
      trailCtx.stroke();

      trailCtx.shadowColor = coreGlow;
      trailCtx.shadowBlur = 5;
      trailCtx.strokeStyle = coreGlow;
      trailCtx.lineWidth = Math.max(0.85, width * 0.45);
      trailCtx.beginPath();
      trailCtx.moveTo(prev.x, prev.y);
      trailCtx.lineTo(curr.x, curr.y);
      trailCtx.stroke();
      trailCtx.restore();
    }

    function tick(now: number) {
      const elapsed = now - phaseStart;
      mainCtx.clearRect(0, 0, w, h);

      if (phase === 'draw') {
        const progress = Math.min(1, elapsed / DRAW_DURATION_MS);
        const target = Math.floor(progress * (path.length - 1));

        while (frame < target) {
          frame++;
          drawSegment(frame);
        }

        mainCtx.drawImage(ink, 0, 0, w, h);

        if (progress >= 1) {
          phase = 'hold';
          phaseStart = now;
        }
      } else if (phase === 'hold') {
        mainCtx.drawImage(ink, 0, 0, w, h);
        if (elapsed >= HOLD_DURATION_MS) {
          phase = 'fade';
          phaseStart = now;
        }
      } else {
        const progress = Math.min(1, elapsed / FADE_DURATION_MS);
        const alpha = 1 - progress;
        setOpacity(alpha);
        mainCtx.globalAlpha = alpha;
        mainCtx.drawImage(ink, 0, 0, w, h);
        mainCtx.globalAlpha = 1;
        if (progress >= 1) {
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
      style={{ position: 'fixed', inset: 0, zIndex: 3, pointerEvents: 'none', opacity }}
    />
  );
}

