'use client';
import { useEffect } from 'react';

export default function ScaleFactorSetter() {
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      const s = Math.min(1.5, Math.max(0.5, w / 1920));
      document.documentElement.style.setProperty('--scale-factor', String(s));
      document.cookie = `x-client-resolution=${w}; path=/; max-age=86400; SameSite=Lax`;
    }

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return null;
}
