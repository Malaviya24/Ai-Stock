# Presentation Outline — Strategy Lab

> Copy this structure into PowerPoint/Google Slides. Each section = 1 slide.
> Suggested total: 12-15 slides, ~10 minutes.

---

## Slide 1: Title

**AI-Assisted Capital Allocation System**
*Strategy Lab — The Market Ledger*

- Semester 7 Project
- Name: [Your Name]
- Enrollment: [Your Enrollment Number]
- Guide: [Sir's Name]
- Live: https://aistock07.vercel.app

---

## Slide 2: Problem Statement

**The Problem**

- 100+ NIFTY stocks — which ones to buy TODAY?
- Technical analysis requires years of learning (RSI, DMA, Darvas, etc.)
- Beginners have no idea where to start
- No single platform combines multiple strategies + explains WHY

**Our Solution**: One app, 18 strategies, AI explanations — for everyone.

---

## Slide 3: Key Features (Visual)

*(Use icons or a 2x3 grid of feature cards)*

1. 🔍 **18 Strategy Scanners** — Live NIFTY scanning
2. 🤖 **AI Analyst** — Plain-language stock recommendations
3. 📊 **Real-time Data** — Yahoo Finance, no API key needed
4. 🔐 **User Auth** — Clerk sign-in, per-user portfolios
5. 💾 **Persistent Storage** — MongoDB Atlas
6. 🚀 **Production Deploy** — Vercel CDN + Render API

---

## Slide 4: System Architecture

*(Show the architecture diagram from Section 4.1 of the report)*

```
User → Vercel (Frontend CDN) → Render (Express API) → MongoDB
                                    ↕              ↕
                              Yahoo Finance    Google Gemini AI
```

**Split deployment**: Frontend loads instantly (CDN), backend serves data.

---

## Slide 5: Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind, TanStack Query |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB Atlas (free tier) |
| Auth | Clerk |
| AI | Google Gemini (Flash-Lite) |
| Market Data | Yahoo Finance (free, no key) |
| Deploy | Vercel (frontend) + Render (backend) |

---

## Slide 6: The 18 Strategies

*(Show in a compact table or numbered grid — just names, grouped by type)*

**Technical**: DMA, RSI Ladder, Darvas Box, Gap Up, Turtle 55, Monthly
Candle, Weekly ETF, SRTV ETF, Smart CAR, DMA+CAR, Homa Genius

**Fundamental**: Fundamental+BOH, LTVI, Marking System

**Income/Quant**: REIT & INVIT, Supu Compounding, Money Tree ETF, DMA
Compounding, BOH Filter

---

## Slide 7: How a Scan Works (Flow)

*(Animated or step-by-step arrows)*

1. User clicks "Run Scan"
2. Backend fetches live prices from Yahoo Finance
3. Strategy engine calculates RSI, DMA, SRTV, etc.
4. Rules applied → BUY / SELL / WATCH signals generated
5. Signals stored in MongoDB
6. Frontend displays results in real-time

For heavy scans (250+ stocks): background job + progress bar → no timeouts.

---

## Slide 8: AI Analyst (Demo)

*(Screenshot of the AI Analyst page with results)*

**For beginners who don't know strategies:**

1. Click "Analyze Today's Market"
2. AI reads signals from ALL 18 strategies
3. Enriches with live RSI, DMA, 52-week data
4. Sends to Google Gemini → gets structured JSON
5. Shows: Stock, Buy Zone, Target, Stop Loss, Confidence, and a
   plain-language "Why this stock?" explanation

**Always shows disclaimer**: Educational only, not financial advice.

---

## Slide 9: Design System — Newsprint

*(Show before/after screenshots or just the final design)*

- Inspired by newspaper/editorial design
- Light-only, high contrast (ink on paper)
- Serif headlines (Playfair), monospace data (JetBrains Mono)
- Zero border-radius (sharp corners everywhere)
- Collapsed-border grids, numbered strategy index
- Professional and unique — doesn't look like a generic SaaS template

---

## Slide 10: Authentication & Security

- **Clerk**: handles sign-up/sign-in, session tokens, user management
- **Per-user data scoping**: User A can't see User B's watchlist
- **Cross-origin Bearer tokens**: secure split-deploy auth
- **Secrets never in code**: `.env` + Render/Vercel dashboards
- **GitHub Push Protection**: automatically catches leaked keys

---

## Slide 11: Performance Optimizations

| Optimization | Impact |
|-------------|--------|
| Code splitting (lazy load) | 1,105 KB → 367 KB initial bundle (-67%) |
| Background scan jobs | Eliminates 502 gateway timeouts |
| Yahoo throttle (6 concurrent) | Prevents rate-limiting on cloud |
| `content-visibility` CSS | Smooth scroll on large tables |
| Table pagination (400+ rows) | Prevents DOM lag |
| Vercel CDN (split deploy) | Frontend loads in <1s (no cold start) |

---

## Slide 12: Live Demo

*(Open the live site and demonstrate)*

1. Landing page → "Analyze Today's Market" CTA
2. Sign in (show Clerk auth)
3. Live Scanner → Run Scan → Show signals
4. AI Analyst → Generate analysis → Show picks
5. Click a stock → Show "Why this stock?" detail view
6. Save a pick → Saved Picks section
7. Monthly Candle → Show filter cards (Bullish/Bearish/No Trade)

---

## Slide 13: Limitations

- ~15 minute data delay (Yahoo free tier, not true real-time)
- Render free tier: 50s cold start after idle
- AI: educational only, cannot guarantee accuracy
- Analysis only — no actual order placement
- Gemini free tier rate limits (~15 req/min)

---

## Slide 14: Future Scope

- Broker API integration (Shoonya/Angel One) for real-time data
- Push notifications for new signals
- Mobile app (React Native)
- Backtesting with equity curves
- News feed integration
- Social features (share/discuss picks)

---

## Slide 15: Thank You / Q&A

**Strategy Lab — AI-Assisted Capital Allocation**

Live: https://aistock07.vercel.app
GitHub: https://github.com/Malaviya24/Ai-Stock

*Thank you. Questions?*

---

## Tips for the PPT

- Keep text minimal on slides — use the report for details
- Use screenshots from the live site for visuals
- The architecture diagram is the most important technical slide
- For the demo, wake up the Render backend 2 minutes before your turn
  (visit the backend URL directly to trigger the cold start)
- The AI Analyst demo is the "wow factor" — save it for the climax
- Mention "18 strategies" repeatedly — it's the headline number
