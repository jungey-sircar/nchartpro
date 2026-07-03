'use client';

import { useEffect, useState } from 'react';

function computeFontSize() {
  if (typeof window === 'undefined') return 128;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const widthBased = Math.round(width * 0.11);
  const heightBased = Math.round(height * 0.22);

  return Math.max(72, Math.min(220, Math.min(widthBased, heightBased)));
}

export function useAdaptiveFontSize() {
  const [fontSize, setFontSize] = useState(computeFontSize);

  useEffect(() => {
    function update() {
      setFontSize(computeFontSize());
    }

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return fontSize;
}