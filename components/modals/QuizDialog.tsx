'use client';

import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function QuizDialog({ open, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    if (open) {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }

    return undefined;
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        ref={overlayRef}
        onClick={e => {
          if (e.target === overlayRef.current) onClose();
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 190,
          background: 'rgba(0,0,0,0.42)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="NChartPro quiz"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 200,
          width: 'min(92vw, 560px)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
          padding: '1.25rem',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close quiz"
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Quick quiz
          </div>
          <h2 style={{ margin: '0.35rem 0 0', fontSize: 'var(--fs-2xl)', lineHeight: 1.1 }}>
            NChartPro market check-in
          </h2>
          <p style={{ margin: '0.75rem 0 0', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
            This dialog is now wired locally in the NChartPro app instead of pointing at the old dashboard path.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <QuizCard title="What does NChartPro visualize?" body="Real-time charting, screening, and market insights." />
          <QuizCard title="What should happen on close?" body="The modal should simply dismiss without a route change." />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button
            onClick={onClose}
            style={{
              border: '1px solid var(--border)',
              background: 'var(--accent)',
              color: 'var(--color-on-dark)',
              borderRadius: 10,
              padding: '0.65rem 1rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

function QuizCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        padding: '0.9rem 1rem',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{title}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}