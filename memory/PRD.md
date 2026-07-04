# NChartPro — PRD / Memory

## Original Problem Statement (latest session, June 2026)
User: the intro light trail on page load looked ugly and didn't resemble an "N". Requested a beautiful, sexy cursive N trail. Choices: surprise-me style, single elegant color, draw once on load then vanish.

## Architecture
- Next.js (v16) app at /app root (app/ + components/ + styles/), TypeScript, three.js/r3f, recharts
- FastAPI backend at /app/backend (port 8001), MongoDB
- NOTE: supervisor `frontend` program points to /app/frontend; a shim /app/frontend/package.json runs `npx next dev -H 0.0.0.0 -p 3000` in /app. Do not delete this shim.

## What's been implemented
- Prior sessions: landing page, matrix candlesticks, canvas cursor, wordmark canvas, glass cards, pricing, quiz, support chat, 3D scenes.
- 2026-06 (this session): Rewrote `components/LightTrails.tsx`:
  - Real calligraphic cursive "N" defined as SVG path, sampled via getPointAtLength (380 pts)
  - Copperplate pen-pressure: thick downstrokes, hairline upstrokes (45° nib simulation), smoothed + tapered ends
  - Single champagne-gold palette (rgb 232,196,132) with warm-white core, 3-layer glow
  - Offscreen ink canvas accumulates stroke (perf), glowing pen head with pulsing halo + 4-point star flare, gold-dust twinkle particles with gentle gravity
  - Phases: draw 3.6s (easeInOutCubic) → hold 650ms w/ shimmer → fade 1.3s → onComplete unmounts
  - Iteration 2 (user request): trail enters from bottom-left screen corner, exits via top flourish to top-left corner; added fiery look (orange outer glow FIRE rgb 255,130,35, rising ember particles with white→orange→red life colors, more star sparkles along stroke, 260 max particles)
  - Verified via screenshots: renders as elegant fiery cursive N, corner-to-corner, draws once, vanishes.

## Backlog / Next
- P2: reduced-motion preference could skip the intro animation
- P2: mobile scaling of the N (currently min(h*0.68, w*0.42))
