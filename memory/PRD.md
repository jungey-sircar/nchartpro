# NChartPro — PRD / Memory

## Original Problem Statement (latest major session, June 2026)
Cinematic Apple-style scroll-driven landing page redesign:
candlestick-matrix loader, letter-by-letter hero, hero image from right,
Three.js depth, pinned scroll-controlled 10-slide presentation with morphing
TradingView-style chart (one scroll = one slide, no buttons), pricing untouched.
User choices: custom canvas chart renderer; light trail = stock-market zigzag
from bottom-left corner vanishing at top-center (replaces cursive N).

## Architecture
- Next.js 16 (App Router) at /app root (app/ + components/ + styles/), TypeScript
- Deps added: gsap, lenis (three/r3f pre-existing; NOTE: r3f v8 is BROKEN with React 19 — use plain three.js imperative, see HeroParticles.tsx)
- FastAPI backend /app/backend (port 8001), MongoDB
- Supervisor `frontend` points to /app/frontend → shim package.json runs `npx next dev -H 0.0.0.0 -p 3000` in /app. DO NOT delete /app/frontend/package.json.

## What's been implemented (2026-06)
- CandleLoader.tsx: fullscreen black loader, glowing candle rain ~2.5s → dissolves into particles → fade, centered NChartPro wordmark, body scroll locked, reduced-motion skip
- LightTrails.tsx: fiery stock-market zigzag trail, bottom-left corner → vanishes top-center with spark burst (draw 2.7s / hold / fade), gold+fire palette, embers/stars
- HeroCinematic.tsx: letter-by-letter gradient title (CSS staggered, blur/glow/slide), sequential subtitle→description→CTAs (#pricing, #story), hero image slides from right blur→sharp + floating loop, audio button + scroll indicator kept
- HeroParticles.tsx: plain three.js — 220 gold drift points + 8 floating translucent candlesticks + mouse parallax camera
- StoryPresentation.tsx (#story): 11*100vh section, sticky 100vh inner; LEFT chart panel (toolbar NEPSE:NCHART + scenario chip), RIGHT keynote slide (kicker NN—10, big title, gold rule, sub) with gsap blur/slide/scale transitions; directional snap on scroll idle (160ms) via window.__lenis.scrollTo; progress dots (indicator only)
- CandleChart.tsx: custom canvas TradingView-style renderer, 48 candles × 10 seeded scenario datasets, 950ms eased morph between datasets, grid, price axis, volume bars, sweeping dashed crosshair + price tag, last-candle pulse glow, NChartPro watermark; rAF gated by `active`
- SmoothScroll.tsx: Lenis (duration 1.05, anchors), exposes window.__lenis, disables CSS scroll-behavior
- Header.tsx: transparent at top → glass/blur after 60px scroll
- LandingPage.tsx orchestration: loader → (heroStart + light trail); sections: HeroCinematic → StoryPresentation → Immersive3DScene (features helix, kept) → PricingSection (untouched) → Footer
- Testing agent iteration_1: 23/25 pass; slides/charts/snap/header all verified

## Known pre-existing issues (not regressions, LOW)
- /public/audio/background.mp3 missing → 404 (audio button silent)
- favicon.ico missing → 404
- /api/v1/user/me returns 500 (not 401) for logged-out users; frontend handles via res.ok

## Backlog
- P2: flush pin release after slide 10 (currently ~100vh dwell — intentional keynote feel)
- P2: mobile layout for story presentation (chart stacks above slide)
- P2: add favicon + real ambient audio asset
- P2: skip intro animations for returning visitors (sessionStorage)
