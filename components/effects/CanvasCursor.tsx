'use client';

import useCanvasCursor from '@/app/hooks/useCanvasCursor';

const CanvasCursor = () => {
  useCanvasCursor();

  return (
    <canvas
      id='canvas'
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
};

export default CanvasCursor;
