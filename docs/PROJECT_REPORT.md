# Project Report

## AI-Assisted Capital Allocation System (Strategy Lab)

**Semester 7 Project Report**

---

| Field | Details |
|-------|---------|
| Project Title | AI-Assisted Capital Allocation System |
| Project Name | Strategy Lab |
| Domain | Financial Technology (FinTech) / Artificial Intelligence |
| Technology Stack | React, Node.js, Express, MongoDB, Google Gemini AI |
| Live URL (Frontend) | https://aistock07.vercel.app |
| Live URL (Backend API) | https://ai-stock-nyj7.onrender.com |
| GitHub Repository | https://github.com/Malaviya24/Ai-Stock |

---

## 1. Abstract

Strategy Lab is a full-stack web application that combines 18 systematic
trading strategies with real-time market data and AI-powered analysis to help
users — including complete beginners — make informed investment decisions in the
Indian stock market (NSE/BSE).

The system scans NIFTY 50, NIFTY 100, and LargeMidcap 250 stocks using
strategies ranging from technical indicators (RSI, DMA, Darvas Box) to
fundamental analysis (PE, PB, PS, EV/EBITDA scoring), generates BUY/SELL/WATCH
signals, and provides an AI Analyst feature that synthesizes all strategy outputs
into plain-language recommendations a first-time investor can understand.

The project demonstrates end-to-end software engineering: from data acquisition
and strategy implementation to user authentication, AI integration, and
production-grade split deployment across two cloud platforms.

---

## 2. Introduction

### 2.1 Problem Statement

Retail investors in India face multiple challenges:
- Information overload from hundreds of stocks across multiple indices
- Lack of systematic methodology — most rely on tips or news-driven decisions
- Complexity of technical analysis tools that require years of learning
- No unified platform that combines multiple proven strategies under one roof
- Beginners have no way to get a plain-language explanation of *why* a stock
  might be interesting

### 2.2 Proposed Solution

A web-based platform that:
1. Implements 18 battle-tested trading strategies as automated scanners
2. Fetches real-time market data from Yahoo Finance (free, no API key needed)
3. Generates objective, rule-based BUY/SELL/WATCH signals
4. Uses AI (Google Gemini) to synthesize signals into beginner-friendly
   explanations
5. Provides per-user authentication and data persistence
6. Deploys as a production-grade application accessible from any device

### 2.3 Objectives

- Automate stock scanning across NIFTY universe using 18 systematic strategies
- Provide real-time signal generation based on live market data
- Implement AI-powered analysis for beginners (plain language, no jargon)
- Build a secure, multi-user system with Clerk authentication
- Achieve production-grade deployment with instant frontend loads (Vercel CDN)
- Create a responsive, accessible interface following the Newsprint design system

---

## 3. Literature Review / Background

### 3.1 Trading Strategies Implemented

| # | Strategy | Type | Key Logic |
|---|----------|------|-----------|
| 1 | Nifty DMA | Technical | 50/100/200 DMA alignment, buy when all bullish |
| 2 | Fundamental + BOH | Fundamental | PE, PB, PS, EV/EBITDA scoring + BOH zone filter |
| 3 | RSI Nifty Shop | Technical | 6-level mean-reversion ladder (RSI-based) |
| 4 | Gap Up Strategy | Technical | 3.14% gap-up filter with 3PM confirmation |
| 5 | Turtle Trading | Technical | 55-day breakout, 15-part capital allocation |
| 6 | REIT & INVIT | Income | Breakout-based dividend income tracking |
| 7 | BOH Filter | Technical | 52-week high/low zone detection |
| 8 | Supu Compounding | Quantitative | 344-cycle systematic compounding |
| 9 | SRTV ETF Scanner | Technical | 124-DMA mean reversion for ETFs |
| 10 | Monthly Candle | Technical | Monthly OHLC candle pattern analysis |
| 11 | Homa Genius Method | Technical | Multi-ETF rotational relative strength |
| 12 | Weekly ETF Contrarian | Contrarian | Bearish weekly candle accumulation |
| 13 | LTVI Value Index | Fundamental | PB + PE + P/NSPS + P/RONW ranking |
| 14 | Marking System | Fundamental | Rank-based relative valuation scoring |
| 15 | Money Tree ETF | Quantitative | Weekly SIP with profit-booking engine |
| 16 | DMA Compounding | Quantitative | 6.28% target growth with tax modelling |
| 17 | Smart CAR | Technical | Cumulative average reversal from 52-week high |
| 18 | DMA + CAR Merged | Technical | Two-phase: DMA screening then CAR confirmation |

### 3.2 Data Sources

- **Yahoo Finance** (primary): Real-time quotes and historical OHLCV data via
  the `yahoo-finance2` npm library. Free, no API key required.
- **Shoonya API** (optional upgrade): Broker-level real-time data via Finvasia's
  Shoonya platform. Currently optional — system works fully on Yahoo.

### 3.3 AI Integration

- **Google Gemini** (Flash-Lite model): Generates plain-language stock analysis
  based on aggregated strategy signals and live technical indicators.
- Provider-agnostic design: can swap to Groq or OpenAI with a single env var
  change.

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Browser)                             │
│           https://aistock07.vercel.app                        │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS (Bearer Token Auth)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Express API Server)                     │
│        https://ai-stock-nyj7.onrender.com                    │
│                                                              │
│  ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐  │
│  │  Clerk   │ │  Strategy  │ │   Market   │ │    AI     │  │
│  │  Auth    │ │  Engines   │ │  Service   │ │  Service  │  │
│  │ Middleware│ │ (18 scans) │ │(Yahoo/Shoo)│ │(Gemini)   │  │
│  └──────────┘ └────────────┘ └────────────┘ └───────────┘  │
│                       │                                      │
│              ┌────────┴────────┐                             │
│              │   IStorage      │                             │
│              │  (Interface)    │                             │
│              └────────┬────────┘                             │
└───────────────────────┼──────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              MongoDB Atlas (Free Tier)                        │
│         Persistent storage for all user data                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Frontend Architecture

- **React 18** with code-splitting (lazy-loaded pages via `React.lazy()`)
- **wouter** for client-side routing (lightweight alternative to react-router)
- **TanStack Query** for server state management and caching
- **Tailwind CSS** with the custom "Newsprint" design system
- **Clerk** for authentication (sign-in, sign-up, session management)

### 4.3 Backend Architecture

- **Express 5** with TypeScript
- **Pluggable storage** via `IStorage` interface (MongoDB / PostgreSQL / Memory)
- **Background job pattern** for heavy scans (prevents 502 gateway timeouts)
- **Global Yahoo Finance throttle** (6 concurrent, 60ms gap) to avoid rate limits
- **Provider-agnostic AI service** supporting Gemini, Groq, and OpenAI

### 4.4 Deployment Architecture

| Layer | Platform | Role |
|-------|----------|------|
| Frontend | Vercel (CDN) | Static React build, global edge delivery, instant loads |
| Backend | Render (Singapore) | Long-running Express API server |
| Database | MongoDB Atlas | Persistent document storage (free M0 cluster) |
| Auth | Clerk | User management, session tokens, sign-in/up UI |
| AI | Google AI Studio | Gemini Flash-Lite for analysis generation |

---

## 5. Implementation Details

### 5.1 Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Yahoo Finance (crumb-free chart endpoint) | Avoids rate limiting from cloud IPs; no API key needed |
| Background scan jobs | Prevents Render's ~100s gateway timeout on heavy scans |
| Code splitting (lazy loading) | Reduces initial bundle from 1.1MB to 367KB |
| Bearer token auth (not cookies) | Required for cross-origin split deployment (Vercel ≠ Render) |
| `formatDetails()` utility | Central defense against raw JSON appearing in the UI |
| Provider-agnostic AI service | Can switch AI models without code changes |

### 5.2 Performance Optimizations

- **Code splitting**: 22 pages lazy-loaded → 67% smaller initial bundle
- **Global Yahoo throttle**: 6 concurrent requests max with per-call timeout
- **Request caching**: 5-minute quote cache, 15-minute history cache
- **`content-visibility: auto`** on large tables for smooth scrolling
- **Table pagination** for 400+ row tables (Fundamental page)
- **Background job pattern** for scans >30 seconds (DMA, BOH)

### 5.3 Security Measures

- All secrets in `.env` (gitignored) — never committed to source
- Clerk handles password hashing, session management, token verification
- Per-user data scoping (User A cannot see User B's watchlist/portfolio)
- AI API key never reaches the client (all AI calls server-side only)
- GitHub Push Protection catches accidental secret commits
- CORS restricted to the specific Vercel frontend domain

---

## 6. Results & Features

### 6.1 Completed Features

1. **18 strategy scanners** scanning NIFTY 50/100/250 + BSE fundamentals
2. **Real-time market data** fetching (Yahoo Finance, no API key needed)
3. **AI Analyst** with plain-language stock recommendations for beginners
4. **User authentication** (sign-up/sign-in via Clerk)
5. **Per-user data** (watchlist, portfolio, saved AI analyses)
6. **Live signal generation** (BUY/SELL/WATCH with price targets)
7. **Production deployment** (Vercel CDN + Render API)
8. **Persistent MongoDB storage** (data survives server restarts)
9. **Responsive design** (works on mobile, tablet, desktop)
10. **Newsprint design system** (professional editorial aesthetic)

### 6.2 Screenshots

*(Include screenshots of: Landing page, Dashboard, AI Analyst results,
Monthly Candle scan, Live Scanner, Sign-in page)*

---

## 7. Tools & Technologies Used

| Category | Technology | Purpose |
|----------|-----------|---------|
| Frontend Framework | React 18 | Component-based UI |
| Build Tool | Vite 7 | Fast development server + optimized production builds |
| Styling | Tailwind CSS 3.4 | Utility-first styling |
| UI Components | shadcn/ui + Radix | Accessible, customizable primitives |
| Routing | wouter | Lightweight client-side routing |
| State Management | TanStack Query | Server state + caching |
| Backend Runtime | Node.js 20 | Server-side JavaScript |
| Backend Framework | Express 5 | HTTP API server |
| Language | TypeScript | Type safety across frontend + backend |
| Database | MongoDB Atlas | NoSQL document database |
| Authentication | Clerk | User management + session handling |
| AI Provider | Google Gemini | Natural language analysis generation |
| Market Data | Yahoo Finance | Real-time stock prices + historical data |
| Frontend Hosting | Vercel | CDN-based static hosting |
| Backend Hosting | Render | Long-running server hosting |
| Version Control | Git + GitHub | Source code management |

---

## 8. Limitations & Future Scope

### 8.1 Current Limitations

- Yahoo Finance data has a ~15-minute delay (not true tick-by-tick real-time)
- Free-tier Render backend has 50-second cold starts after idle
- AI analysis is educational only — cannot guarantee accuracy
- No actual order placement (analysis only, not a trading terminal)
- Free Gemini tier has rate limits (~15 requests/minute)

### 8.2 Future Enhancements

- **Broker integration** (Shoonya/Angel One) for true real-time data
- **Push notifications** for new BUY signals via email/SMS
- **Backtesting engine** with historical equity curves per strategy
- **Social features** — share/discuss picks with other users
- **Mobile app** (React Native) for on-the-go alerts
- **Portfolio P&L tracker** with live unrealized gains
- **News feed integration** (Marketaux/NewsData.io) for market context

---

## 9. Conclusion

Strategy Lab successfully demonstrates that complex financial analysis can be
made accessible to beginners through systematic automation and AI explanation.
The system combines 18 proven trading strategies, real-time market data,
AI-powered analysis, and modern web engineering into a production-grade platform
deployable on free-tier cloud infrastructure.

Key achievements:
- End-to-end full-stack development with split deployment architecture
- AI integration that explains *why* a stock is interesting in plain language
- Production-ready authentication, data persistence, and responsive UI
- Performance-optimized (code splitting, background jobs, throttled data fetching)
- Professional "Newsprint" design system for a polished user experience

---

## 10. References

1. Yahoo Finance — Real-time market data (finance.yahoo.com)
2. Clerk Documentation — Authentication (clerk.com/docs)
3. Google AI Studio — Gemini API (aistudio.google.com)
4. MongoDB Atlas — Cloud Database (mongodb.com/cloud/atlas)
5. Vercel Documentation — Frontend Deployment (vercel.com/docs)
6. Render Documentation — Backend Deployment (render.com/docs)
7. Tailwind CSS — Utility Framework (tailwindcss.com)
8. React Documentation (react.dev)
9. Express.js Documentation (expressjs.com)
10. TanStack Query (tanstack.com/query)
