'use client';

/**
 * ScrollPerspective - dramatic 3D scroll experience.
 *
 * Each scroll target carries its own perspective transform so nested sections
 * still feel like they move through depth. Positions are measured from layout
 * offsets rather than transformed rectangles to avoid feedback jitter.
 */

import { useRef, useEffect, useCallback, type ReactNode } from 'react';

const PERSPECTIVE = 720;
const ENTRY_DISTANCE = 1.25;
const EXIT_DISTANCE = 0.95;
const FAR_Z = -960;
const NEAR_Z = 240;
const EXIT_Z = -420;
const HERO_PIN_SCROLLS = 5;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function getLayoutTop(el: HTMLElement) {
  let top = 0;
  let node: HTMLElement | null = el;

  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }

  return top;
}

function transform3d({
  z,
  y = 0,
  scale = 1,
  rotateX = 0,
  rotateY = 0,
}: {
  z: number;
  y?: number;
  scale?: number;
  rotateX?: number;
  rotateY?: number;
}) {
  return (
    `perspective(${PERSPECTIVE}px) ` +
    `translate3d(0, ${y.toFixed(1)}px, ${z.toFixed(1)}px) ` +
    `rotateX(${rotateX.toFixed(2)}deg) ` +
    `rotateY(${rotateY.toFixed(2)}deg) ` +
    `scale(${scale.toFixed(3)})`
  );
}

export default function ScrollPerspective({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    rafRef.current = null;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const vh = window.innerHeight;
    const scrollY = window.scrollY || window.pageYOffset;
    const sections = wrapper.querySelectorAll<HTMLElement>('[data-scroll-3d]');

    for (const el of sections) {
      const height = Math.max(el.offsetHeight, 1);
      const top = getLayoutTop(el) - scrollY;
      const elCenter = top + height / 2;
      const distFromCenter = (elCenter - vh / 2) / vh;
      const preset = el.dataset.scroll3d || 'zoom';

      el.style.transformStyle = 'preserve-3d';
      el.style.backfaceVisibility = 'hidden';

      if (preset === 'hero-tilt') {
        const heroScrollY = clamp(scrollY / (vh * HERO_PIN_SCROLLS), 0, 1);
        const exitT = smoothstep(clamp((heroScrollY - 1) / 0.12, 0, 1));
        const t = smoothstep(exitT);

        el.style.transform = transform3d({
          z: lerp(0, NEAR_Z + 80, t),
          y: lerp(0, -32, t),
          scale: lerp(1, 1.04, t),
          rotateX: lerp(0, -4, t),
        });
        el.style.opacity = String(lerp(1, 0, t));
        el.style.filter = `blur(${lerp(0, 3.5, t).toFixed(2)}px)`;
        continue;
      }

      const isCardLeft = preset === 'card-depth-left';
      const isCardRight = preset === 'card-depth-right';
      const isPricing = preset === 'pricing-rotate';
      const isCylinder = preset === 'cylinder-spin';

      if (isCylinder) {
        // Cylinder: gentle scale + fade, no rotation (it rotates itself)
        if (distFromCenter > 0) {
          const t = smoothstep(1 - clamp(distFromCenter / ENTRY_DISTANCE, 0, 1));
          el.style.transform = transform3d({
            z: lerp(FAR_Z * 0.6, 0, t),
            y: lerp(80, 0, t),
            scale: lerp(0.6, 1, t),
            rotateX: 0,
            rotateY: 0,
          });
          el.style.opacity = String(clamp((t - 0.04) / 0.82, 0, 1));
          el.style.filter = `blur(${lerp(6, 0, t).toFixed(2)}px)`;
        } else {
          const t = smoothstep(clamp(-distFromCenter / EXIT_DISTANCE, 0, 1));
          el.style.transform = transform3d({
            z: lerp(0, EXIT_Z * 0.5, t),
            y: lerp(0, -60, t),
            scale: lerp(1, 0.85, t),
            rotateX: 0,
            rotateY: 0,
          });
          el.style.opacity = String(lerp(1, 0.2, t));
          el.style.filter = `blur(${lerp(0, 3, t).toFixed(2)}px)`;
        }
        continue;
      }

      if (distFromCenter > 0) {
        const t = smoothstep(1 - clamp(distFromCenter / ENTRY_DISTANCE, 0, 1));
        const startRotateY = isCardLeft ? 28 : isCardRight ? -28 : isPricing ? 16 : 0;

        el.style.transform = transform3d({
          z: lerp(FAR_Z, NEAR_Z, t),
          y: lerp(110, 0, t),
          scale: lerp(0.56, 1.08, t),
          rotateX: lerp(10, 0, t),
          rotateY: lerp(startRotateY, 0, t),
        });
        el.style.opacity = String(clamp((t - 0.04) / 0.82, 0, 1));
        el.style.filter = `blur(${lerp(8, 0, t).toFixed(2)}px)`;
      } else {
        const t = smoothstep(clamp(-distFromCenter / EXIT_DISTANCE, 0, 1));
        const exitRotateY = isCardLeft ? -8 : isCardRight ? 8 : isPricing ? -6 : 0;

        el.style.transform = transform3d({
          z: lerp(NEAR_Z, EXIT_Z, t),
          y: lerp(0, -90, t),
          scale: lerp(1.08, 0.88, t),
          rotateX: lerp(0, -7, t),
          rotateY: lerp(0, exitRotateY, t),
        });
        el.style.opacity = String(lerp(1, 0.22, t));
        el.style.filter = `blur(${lerp(0, 3.5, t).toFixed(2)}px)`;
      }
    }
  }, []);

  const scheduleTick = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      const wrapper = wrapperRef.current;
      if (wrapper) {
        const sections = wrapper.querySelectorAll<HTMLElement>('[data-scroll-3d]');
        for (const el of sections) {
          el.style.transform = 'none';
          el.style.opacity = '1';
          el.style.filter = 'none';
        }
      }
      return;
    }

    scheduleTick();
    window.addEventListener('scroll', scheduleTick, { passive: true });
    window.addEventListener('resize', scheduleTick);

    return () => {
      window.removeEventListener('scroll', scheduleTick);
      window.removeEventListener('resize', scheduleTick);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleTick]);

  return (
    <div
      ref={wrapperRef}
      style={{
        perspective: `${PERSPECTIVE}px`,
        perspectiveOrigin: '50% 50%',
        transformStyle: 'preserve-3d',
        overflow: 'visible',
      }}
    >
      {children}
    </div>
  );
}
