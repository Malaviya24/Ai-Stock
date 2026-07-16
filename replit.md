# Strategy Lab - AI-Assisted Capital Allocation System

## Overview
A real-time AI-powered capital allocation engine with 20 trading strategies. Features live NIFTY 100 stock scanning via Yahoo Finance, AI scoring, signal generation, portfolio management, and capital allocation. Redesigned to match the Strategy Lab reference site with sidebar-based dashboard layout.

## Tech Stack
- **Frontend**: React + Vite, Tailwind CSS, Recharts, shadcn/ui, wouter (routing)
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (Drizzle ORM)
- **Data Source**: Yahoo Finance (yahoo-finance2 v3)

## Architecture
```
Yahoo Finance API → Backend Data Processor → Indicator Engine → AI Scoring Layer → Signal Generator → Frontend Dashboard
```

## Project Structure
### Frontend Pages
- `client/src/pages/landing.tsx` - Landing page with hero, strategies grid, features
- `client/src/pages/dashboard.tsx` - Main dashboard with stat cards, strategy grid, signals table
- `client/src/pages/scanner.tsx` - Live scanner with filters, scan button, signals table
- `client/src/pages/portfolio.tsx` - Portfolio with holdings, summary, allocation, trades
- `client/src/pages/strategy-darvas.tsx` - Darvas Box strategy page
- `client/src/pages/strategy-rsi.tsx` - RSI Ladder Trading strategy page (Class 8b - 6-level buy/sell ladder)
- `client/src/pages/strategy-gap-up.tsx` - Gap Up strategy page
- `client/src/pages/strategy-turtle.tsx` - Turtle Trading strategy page
- `client/src/pages/strategy-money-tree.tsx` - Money Tree ETF strategy page
- `client/src/pages/strategy-supu.tsx` - Supu Compounding strategy page
- `client/src/pages/strategy-monthly-candle.tsx` - Monthly Candle strategy page
- `client/src/pages/strategy-fundamental.tsx` - Fundamental Marking strategy page
- `client/src/pages/strategy-boh.tsx` - BOH/BIOS Filter strategy page
- `client/src/pages/strategy-reit.tsx` - REIT & INVIT strategy page
- `client/src/pages/strategy-darvas-swing.tsx` - Darvas Swing Trading full-universe scanner
- `client/src/pages/strategy-turtle-55.tsx` - Updated Turtle Trading (55-day breakout, 15-part capital)
- `client/src/pages/strategy-dma.tsx` - Nifty Dukaan DMA Strategy (Class 15 - 50/100/200 DMA alignment)
- `client/src/pages/strategy-dma-compound.tsx` - DMA Compounding Engine (Class 16 - 6.28% target growth)
- `client/src/pages/strategy-car.tsx` - Smart CAR (Class 17 - Cumulative Average Reversal)
- `client/src/pages/strategy-dma-car.tsx` - DMA + CAR Merged (Class 18 - 2-phase analysis)

### Frontend Components
- `client/src/components/dashboard-layout.tsx` - Sidebar layout with navigation
- `client/src/components/theme-provider.tsx` - Dark/light theme provider

### Backend
- `server/routes.ts` - API endpoints
- `server/indicators.ts` - RSI, DMA, SRTV, Darvas, CAR, Compounding calculations + AI scoring
- `server/marketService.ts` - Yahoo Finance data fetching
- `server/storage.ts` - Database operations (PostgreSQL)
- `server/seed.ts` - Seeds watchlist with 5 default Indian stocks
- `shared/schema.ts` - Data models and TypeScript types

## Key API Endpoints
- `GET /api/watchlist` - Get watchlist items
- `POST /api/watchlist` - Add symbol to watchlist
- `DELETE /api/watchlist/:id` - Remove from watchlist
- `GET /api/market/:symbol` - Get quote + indicators for a symbol
- `GET /api/chart/:symbol` - Get historical price data
- `GET /api/scores` - Get AI scores for all watchlist items
- `GET /api/capital/:totalCapital` - Get capital allocation suggestions
- `GET /api/signals` - Get trading signals (with optional strategy filter)
- `POST /api/scan` - Run live scan on NIFTY 100 stocks
- `POST /api/scan/reit` - Run dedicated REIT/INVIT scan (5 instruments)
- `POST /api/scan/boh-darvas` - Run combined BOH/BIOS filter + Advanced Darvas scan (top 30 NIFTY)
- `POST /api/scan/darvas-swing` - Full universe Darvas Swing scan (REIT/INVIT + Nifty LargeMidcap 250)
- `POST /api/scan/turtle-55` - Updated Turtle Trading scan (Nifty 50 + ETFs, 55-day high breakout)
- `POST /api/scan/gap-up` - Gap Up Open scanner (Nifty 100, 3.14% gap filter, 3PM confirmation)
- `GET /api/portfolio` - Get portfolio positions
- `POST /api/portfolio` - Add portfolio position
- `DELETE /api/portfolio/:id` - Remove portfolio position
- `GET /api/trades` - Get recent trades
- `GET /api/stats` - Get dashboard statistics

## Database Tables
- `watchlist_items` - Symbols tracked by user
- `portfolio_positions` - Active/historical positions
- `signals` - Trading signals from scanner
- `trades` - Trade history log

## REIT/INVIT Strategy
- Universe: EMBASSY.NS, MINDSPACE.NS, BIRET.NS, INDIGRID.NS, PGINVIT.NS
- BUY: Close > 5-day highest high + Vol > 1.5× avg + Close > 50 DMA + Not near 1-year resistance
- REIT targets: +6% target, -4% stop | INVIT targets: +5% target, -3% stop
- EXIT: Target hit OR Close < breakout level OR Close < 50 DMA
- Dedicated scan endpoint: POST /api/scan/reit (clears old signals, fetches 13 months data)

## Key API Endpoints (Strategy Scans)
- `POST /api/scan/srtv-etf` - SRTV ETF Scanner (30 NSE ETFs, 124 DMA mean reversion)
- `POST /api/scan/monthly-candle` - Monthly Candle System (Nifty 50 monthly OHLC, 3% target)
- `POST /api/scan/fundamental` - Fundamental + BH Filter (7-metric scoring, BIOS zone)
- `POST /api/scan/rsi-ladder` - RSI Ladder Scanner (6-level buy/sell, Nifty 50)
- `POST /api/scan/weekly-etf` - Weekly ETF Contrarian (bearish weekly accumulation, 3% exit)
- `GET /api/compound/projection` - Supu Compounding Engine (344-cycle projection calculator)
- `POST /api/scan/nifty-shop` - Nifty Shop Engine (RSI + 7-lot averaging, 6.28% target, Nifty 50+Next 50)
- `POST /api/scan/ltvi` - Long Term Value Index (PB+PE+P/NSPS+P/RONW ranking)
- `POST /api/scan/marking` - Relative Valuation Marking System (PE/PB/PS/EV_EBITDA rank-based scoring)
- `GET /api/money-tree/simulate` - Money Tree ETF Simulator (weekly SIP + profit booking)
- `POST /api/scan/dma` - Nifty Dukaan DMA Scanner (Nifty 50+Next 50+Midcap 150, 50/100/200 DMA alignment)
- `POST /api/scan/dma-compound` - DMA Compounding Engine (6.28% target, tax, brokerage, 50% split)
- `POST /api/scan/car` - Smart CAR Analysis (52-week high, cumulative average reversal, 10-day trend)
- `POST /api/scan/dma-car` - DMA+CAR 2-Phase System (Phase 1 DMA → Phase 2 CAR confirmation)

## Data Source Pattern
- Strategy pages use `scanResult` from POST response as primary data source (rich fields)
- `/api/signals` query serves as fallback for historical signals (basic fields only: symbol, price, signal, details)
- Signals table does NOT store rich fields like SRTV, score, RSI levels etc.

## Authentication (Clerk)
- Sign-up/sign-in via Clerk (`@clerk/clerk-react` + `@clerk/express`). All `/dashboard/*` routes are wrapped in `RequireAuth` and redirect to `/sign-in` when signed out.
- Env vars: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` (optional, for `/api/webhooks/clerk` user sync). Leave all empty to run with the dashboard open (no login) — same pattern as the other optional integrations.
- User management is entirely via the Clerk dashboard (no local password storage). Watchlist/portfolio/trades/saved AI analyses are scoped per Clerk `userId` (falls back to a shared `"local"` user when Clerk is disabled).

## AI Analyst ("Start Here" for beginners)
- `/dashboard/advisor` — one click aggregates the latest signals across all strategies, enriches the top candidates with live indicators (RSI, DMA, SRTV), and asks an AI model for a plain-English shortlist with buy zone, target, stop loss, confidence, and a "why" explanation.
- Provider-agnostic `server/aiService.ts` — set `AI_PROVIDER` to `gemini` (default), `groq`, or `openai`, and `AI_API_KEY` to the matching key. Leave `AI_API_KEY` empty to disable the section (returns 503).
- Runs as a background job (`POST /api/advisor/analyze` + `GET /api/status/ai-analyst`) so it never blocks the Render gateway.
- Always educational — every surface shows a disclaimer; never presents personalized financial advice.

## Recent Changes
- 2026-02-24: Added 4 new strategies: Nifty Dukaan DMA (Class 15), DMA Compounding (Class 16), Smart CAR (Class 17), DMA+CAR Merged (Class 18)
- 2026-02-21: Added Updated Turtle Trading (Class 13) — 55-day high breakout, 15-part capital, Nifty 50 + ETFs, 6.28% target
- 2026-02-21: Rewrote Gap Up Open Strategy (Class 14) — 3.14% gap filter, 3PM confirmation, dual targets
- 2026-02-21: Added 4 new strategy engines: Nifty Shop (Class 9), LTVI (Class 10), Marking System (Class 11), Money Tree ETF (Class 12) with backend + frontend
- 2026-02-21: Built 6 strategy scan endpoints and full UI pages (SRTV ETF, Monthly Candle, Fundamental+BH, RSI Ladder, Weekly ETF Contrarian, Supu Compounding)
- 2026-02-21: Rewrote RSI Ladder Trading page (Class 8b) with 6-level buy/sell ladder, visual ladder displays, scan functionality, and comprehensive results table
- 2026-02-21: Added Darvas Swing Trading full-universe scanner (REIT/INVIT + Nifty LargeMidcap 250) with 4-category results
- 2026-02-21: Implemented Advanced Darvas Box + BOH 3-layer system (BIOS filter, Darvas breakout, 2.75% avoid rule)
- 2026-02-21: Implemented REIT/INVIT strategy with exact trading rules, dedicated scan endpoint, and updated UI
- 2026-02-21: Complete redesign to match Strategy Lab reference site
- 2026-02-21: Added sidebar-based dashboard layout with 14 navigation pages
- 2026-02-21: Added live scanner with NIFTY 100 stock scanning
- 2026-02-21: Added portfolio management with holdings and trades
- 2026-02-21: Added 10 individual strategy pages
- 2026-02-21: Fixed yahoo-finance2 ESM/CJS interop for production builds
