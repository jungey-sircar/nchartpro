'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme, type Theme } from './ThemeProvider';

interface User { id: string; email: string; username: string; }

interface Props {
  user: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

const THEME_SEGMENTS: { value: Theme; label: string; title: string }[] = [
  { value: 'app-default', label: '✦', title: 'App Default' },
  { value: 'dark',        label: '◑', title: 'Dark'        },
  { value: 'light',       label: '○', title: 'Light'       },
];

const NAV_LINKS = [
  { label: 'Features', href: '#features', tip: 'See all features'  },
  { label: 'Pricing',  href: '#pricing',  tip: 'View pricing plans' },
  { label: 'Blog',     href: '#',         tip: 'Read our blog'      },
  { label: 'Docs',     href: '#',         tip: 'Documentation'      },
];

export default function Header({ user, onLoginClick, onLogout }: Props) {
  const { theme, setTheme } = useTheme();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef  = useRef<HTMLDivElement>(null);
  const iconRef  = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        dropRef.current  && !dropRef.current.contains(e.target as Node) &&
        iconRef.current  && !iconRef.current.contains(e.target as Node)
      ) setDropOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const initials = user?.username.slice(0, 2).toUpperCase() ?? null;

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 48, zIndex: 100,
      display: 'flex', alignItems: 'center',
      padding: '0 1.25rem', gap: '0.875rem',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      boxShadow: '0 1px 0 rgba(0,0,0,0.25)',
    }}>

      {/* Brand */}
      <a href="#hero" style={{
        fontWeight: 800, fontSize: '0.9375rem', letterSpacing: '-0.03em',
        color: 'var(--accent)', textDecoration: 'none', flexShrink: 0, lineHeight: 1,
      }}>
        NChartPro
      </a>

      <div style={{ flex: 1 }} />

      {/* Nav links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {NAV_LINKS.map(link => (
          <Tooltip key={link.label} label={link.tip} direction="down">
            <NavLink href={link.href}>{link.label}</NavLink>
          </Tooltip>
        ))}
      </nav>

      {/* 3-way segmented theme toggle */}
      <div
        role="group"
        aria-label="Theme"
        style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(0,0,0,0.22)',
          border: '1px solid var(--border)',
          borderRadius: 7, padding: 2, gap: 1,
        }}
      >
        {THEME_SEGMENTS.map(({ value, label, title }) => {
          const active = theme === value;
          return (
            <Tooltip key={value} label={title} direction="down">
              <button
                onClick={() => setTheme(value)}
                aria-label={title}
                style={{
                  width: 26, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, border: 'none',
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? 'var(--color-on-dark)' : 'var(--text-muted)',
                  fontSize: 11, fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {label}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* User icon / initials */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Tooltip label={user ? 'Account menu' : 'Sign in'} direction="down">
          <button
            ref={iconRef}
            onClick={user ? () => setDropOpen(d => !d) : onLoginClick}
            aria-label={user ? 'Account menu' : 'Sign in'}
            style={{
              width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', border: '1px solid var(--border)',
              background: user ? 'var(--accent)' : 'var(--glass-bg)',
              color: user ? 'var(--color-on-dark)' : 'var(--text-secondary)',
              fontSize: user ? '0.625rem' : 'inherit', fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
          >
            {initials ?? <UserIcon />}
          </button>
        </Tooltip>

        {dropOpen && user && (
          <div
            ref={dropRef}
            style={{
              position: 'absolute', top: 36, right: 0, minWidth: 170,
              background: 'var(--glass-bg-hover)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--border)',
              borderRadius: 10, boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden', zIndex: 200,
            }}
          >
            <div style={{
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid var(--border)',
              fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)',
            }}>
              {user.email}
            </div>
            <a href="/dashboard" style={dropItemStyle}
              onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              Dashboard
            </a>
            <button
              onClick={() => { setDropOpen(false); onLogout(); }}
              style={{ ...dropItemStyle, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' } as React.CSSProperties}
              onMouseEnter={hoverOn} onMouseLeave={hoverOff}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

// ── Tooltip ──────────────────────────────────────────────────────────
function Tooltip({
  label,
  children,
  direction = 'down',
}: {
  label: string;
  children: React.ReactNode;
  direction?: 'up' | 'down';
}) {
  const [visible, setVisible] = useState(false);

  const tipStyle: React.CSSProperties = {
    position: 'absolute',
    ...(direction === 'down'
      ? { top: 'calc(100% + 6px)' }
      : { bottom: 'calc(100% + 6px)' }),
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '4px 9px',
    borderRadius: 5,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: '0.6875rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    zIndex: 9999,
    pointerEvents: 'none',
    boxShadow: 'var(--shadow-md)',
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.12s',
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <span style={tipStyle}>{label}</span>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────
const dropItemStyle: React.CSSProperties = {
  display: 'block', padding: '0.45rem 0.75rem',
  fontSize: 'var(--fs-sm)', color: 'var(--text-primary)',
  textDecoration: 'none', background: 'transparent',
};
function hoverOn(e: React.MouseEvent<HTMLElement>)  { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }
function hoverOff(e: React.MouseEvent<HTMLElement>) { e.currentTarget.style.background = 'transparent'; }

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        padding: '0.2rem 0.55rem', borderRadius: 6,
        fontSize: 'var(--fs-sm)', fontWeight: 500,
        color: 'var(--text-secondary)', textDecoration: 'none',
        transition: 'color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.color      = 'var(--text-primary)';
        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.color      = 'var(--text-secondary)';
        (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
      }}
    >
      {children}
    </a>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
