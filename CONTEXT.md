# CONTEXT.md

> A single-file briefing so any AI agent or developer can understand this
> project quickly. Read this before making changes — it captures architecture,
> conventions, and hard-won gotchas that aren't obvious from the code alone.

---

## 1. What this app is

**Strategy Lab** (repo: `Ai-Stock`) is an AI-assisted capital allocation
dashboard that scans Indian stocks (NIFTY 50 / 100 / LargeMidcap 250, plus
BSE fundamentals) through 20+ systematic trading strategies and helps
beginners understand which stocks look interesting today.

Live URLs:
- **Frontend:** `https://aistock07.vercel.app` (Vercel — static React)
- **Backend:** `https://ai-stock-nyj7.onrender.com` (Render — Express API)

It's a semester project for one user (Malaviya24 on GitHub). Design system is
"Newsprint" — light-only, editorial newspaper aesthetic (serif Playfair
headlines, Lora body, ink black on off-white paper, zero border-radius, red
`#CC0000` used sparingly as an accent).

---

## 2. Tech stack

**Frontend** (`client/`)
- React 18 + Vite + TypeScript
- Routing: **wouter** (NOT react-router — don't introduce new routers)
- UI: Tailwind + shadcn/ui + Radix primitives
- Data: TanStack Query (`@tanstack/react-query`)
- Auth: `@clerk/clerk-react`
- Charts: Recharts

**Backend** (`server/`)
- Node 20 + Express 5 + TypeScript, run via `tsx` in dev and bundled to a
  single `dist/index.cjs` via `esbuild` in prod
- Auth: `@clerk/express` (Bearer-token verification via `getAuth(req)`)
- Storage: pluggable `IStorage` interface — three backends:
  `MongoStorage` (used in prod), `DatabaseStorage` (Postgres/Drizzle),
  `MemoryStorage` (fallback when `DATABASE_URL` is empty)
- Market data: Yahoo Finance via `yahoo-finance2`, with an optional Shoonya
  broker upgrade path
- AI: provider-agnostic `aiService.ts` — Gemini by default, also supports
  Groq / OpenAI

**Shared** (`shared/schema.ts`)
- Drizzle schema + zod insert schemas + shared TypeScript types (imported by
  both client and server via the `@shared/*` path alias)

**Deployment**
- Split: frontend on Vercel (CDN static), backend on Render (long-running
  Express). See section 8.

---

## 3. Repo layout (top level)

```
client/                     React app (Vite root is client/, not repo root)
  src/
    pages/                  Route-level components (landing, sign-in/up,
                            dashboard, scanner, portfolio, advisor, saved,
                            strategy-*, etc.)
    components/             Shared components (dashboard-layout, ui/*,
                            require-auth, clerk-token-provider, theme-provider)
    lib/                    api.ts, queryClient.ts, clerk.ts, utils.ts,
                            format-details.ts
    hooks/                  use-toast, use-mobile
    main.tsx                Entry point; mounts ClerkProvider, sets up the
                            global fetch interceptor for split deployment
    App.tsx                 Router + lazy-loaded page routes
  index.html                Contains the pre-hydration splash screen

server/
  index.ts                  Express bootstrap: JSON body, CORS, auth,
                            registerRoutes, health-check, port bind
  routes.ts                 ALL API routes in one file (large — grep for the
                            endpoint you need)
  storage.ts                DatabaseStorage + MemoryStorage + storage export
  mongoStorage.ts           MongoStorage (used in prod when DATABASE_URL
                            starts with mongodb://)
  authService.ts            Clerk setup, requireAuth middleware, getUserId
  aiService.ts              Gemini / Groq / OpenAI adapter for AI Analyst
  marketService.ts          Yahoo Finance quotes + history with throttling
                            and a crumb-free path
  shoonyaService.ts         Optional Shoonya broker integration
  niftyDmaService.ts        Stateful strategy engine for Nifty DMA
  seed.ts                   Seeds a default watchlist under userId "local"
  indicators.ts             RSI, DMA, SRTV, CAR, BOH, compounding math

shared/
  schema.ts                 Drizzle tables + zod schemas + shared types

script/
  build.ts                  Production build (vite build + esbuild the server)

server/data/                CSVs consumed by strategy scans (fundamental_data,
                            etc.)
docs/                       Human-readable strategy documentation
attached_assets/            Reference material from the user's sir + logo
                            image imported by the app
NSE_symbols.txt             Loaded at startup by symbolService
BSE_symbols.txt             Loaded at startup by symbolService

render.yaml                 Render blueprint (backend deployment)
vercel.json                 Vercel config (frontend deployment)
.env.example                Env var reference — never contains real secrets
.gitignore                  .env, node_modules, dist/, .config/, .local/,
                            nifty-dma-state.json (runtime state), etc.
```

---

## 4. Design system: Newsprint

The visual identity is centralized in `client/src/index.css`. Non-negotiables:

- **Light mode only.** Force-applied — the theme toggle is a no-op stub.
- **Zero border radius everywhere.** A global `*` selector enforces this
  with `border-radius: 0 !important`. Do not add rounded corners.
- **Palette**: ink `#111111` on paper `#F9F9F7`. Red `#CC0000` (`--accent`) is
  used sparingly (breaking-news dots, active nav accent, CTA hover states).
- **Green / red are intentionally preserved** for financial gain/loss
  semantics — this is a deliberate deviation from strict Newsprint for
  legibility in a trading context.
- **Off-palette colors from the original blue theme** (blue / purple / cyan)
  are neutralized to ink via a global CSS override — don't add them.
- **Typefaces**:
  - `font-serif` = Playfair Display (headlines)
  - `font-body` = Lora (long-form prose)
  - `font-sans` = Inter (UI labels)
  - `font-mono` = JetBrains Mono (metadata, numbers)
- **`.news-label`** utility = uppercase mono `text-xs`, `tracking-widest`,
  `text-muted-foreground`. Use for section kickers, metadata, timestamps.
- **`.newsprint-texture`** = subtle fine-grid overlay for hero sections.

The dashboard shell (`components/dashboard-layout.tsx`) is a masthead
sidebar with a Newsroom section (core nav) and a "Strategy Desk" contents
index (numbered `01`, `02`, ..., serif labels, ink borders, red accent on
hover/active).

---

## 5. Data flow & storage model

### Signals & scans

- 20+ scan endpoints under `/api/scan/*` fetch fresh market data and write
  `signals` rows (BUY / SELL / WATCH) with `price`, `target`, and a
  `details` field.
- The **`details` field is a JSON-serialized object** for most strategies
  (Monthly Candle, Fundamental+BOH, Marking, etc.) — never render it raw.
  Use `client/src/lib/format-details.ts` `formatDetails(details)` which
  parses the JSON, extracts a readable summary, and also repairs known
  encoding corruptions.
- Heavy scans (DMA ~469 symbols, BOH ~250) run **as background jobs** using
  the `startScanJob` / `scanJobStatus` helpers in `server/routes.ts`. The
  POST endpoint responds instantly with `202` and a job id; the frontend
  polls `GET /api/scan/status/:name` every ~1.5s until `stage === "complete"`.
  Do NOT `await` heavy scans in the request handler — you'll trigger
  Render's ~100s gateway timeout and get a 502.

### Per-user vs. shared data

- **Per-user** (scoped by Clerk `userId`): `watchlist`, `portfolioPositions`,
  `trades`, `savedAnalyses`. When Clerk isn't configured, everything falls
  back to a shared pseudo-user `"local"`.
- **Shared** across all users: `signals` (market-wide scan results — every
  user sees the same signals since they're derived from public market data).
- **Strategy-engine state** (Nifty Shop / Homa Genius reading "currently
  open lots" as part of their calculation): keyed to the pseudo-user
  `"system"` (see `SYSTEM_USER_ID` in `server/routes.ts`).

### Storage backend selection (see `server/storage.ts`)

```ts
export const storage: IStorage =
  process.env.DATABASE_URL?.startsWith("mongodb") ? new MongoStorage()
  : process.env.DATABASE_URL                       ? new DatabaseStorage()
                                                   : new MemoryStorage();
```

Production uses **MongoDB Atlas** (free tier). See section 9 for the DNS
gotcha that comes with `mongodb+srv://`.

---

## 6. Authentication (Clerk)

- Frontend wraps `<App/>` in `<ClerkProvider>` in `main.tsx`, only when
  `VITE_CLERK_PUBLISHABLE_KEY` is set. Otherwise the dashboard runs open
  (same "empty key = feature off" pattern used for every optional integration
  in this project).
- Routing is wouter, so `<ClerkProvider>` is passed **`routerPush`/
  `routerReplace`** callbacks that call the browser History API directly —
  wouter monkey-patches `pushState`/`replaceState`, so client-side redirects
  after sign-in / sign-up work instantly without a page reload.
- Sign-in and sign-up components use **`routing="virtual"`** so Clerk's
  internal steps (email verification, etc.) stay client-side and we don't
  need extra wildcard routes in wouter.
- `RequireAuth` (`components/require-auth.tsx`) wraps every `/dashboard/*`
  route via a `protected_()` HOC in `App.tsx`. Signed-out users redirect
  to `/sign-in`.
- Backend uses `@clerk/express`'s `clerkMiddleware()` in `setupAuth()`, and
  `requireAuth` guards data-mutating routes. The important API detail:
  **`@clerk/express` exposes `getAuth(req)` as a standalone function** — it
  is NOT `req.auth()` like the Next.js SDK. `authService.ts` caches the
  `getAuth` reference at startup so synchronous callers (many of them in
  routes.ts) don't need to be made async.

### Cross-origin auth in split deployment

Cookies do NOT travel between Vercel and Render domains, so:

1. `ClerkTokenProvider` (a component inside `<ClerkProvider>`) exposes
   Clerk's `getToken()` via a module-level setter in `lib/api.ts`.
2. The global fetch interceptor in `main.tsx` (only active when
   `VITE_API_URL` is set) awaits `getClerkToken()` before every `/api/*`
   call and attaches the result as `Authorization: Bearer <token>`.
3. `credentials: "include"` is intentionally set to `"omit"` in
   split-deploy mode — cookies are unused; the header carries auth.

---

## 7. AI Analyst (Editorial "Start Here")

Location: `/dashboard/advisor` → `client/src/pages/advisor.tsx`.
Provider-agnostic service: `server/aiService.ts` (Gemini default, also
Groq / OpenAI). Configure via `AI_PROVIDER=gemini|groq|openai` and
`AI_API_KEY=...`.

Flow:
1. `POST /api/advisor/analyze` (protected) starts a background job that:
   - Reads recent signals from storage
   - Groups by symbol, ranks by number of strategies agreeing
   - Enriches top ~10 candidates with fresh Yahoo quotes + RSI/DMA/SRTV
   - Sends a compact payload to the AI with a strict JSON schema
2. Returns `{ generatedAt, disclaimer, picks: [...] }` with 6 max picks
   containing action, buyZone, target, stopLoss, timeHorizon, confidence,
   triggeringStrategies, and a plain-language rationale.
3. Frontend polls `GET /api/status/ai-analyst` every ~1.5s.

**Important:** Every AI-facing surface must show the educational-only
disclaimer. This is a trading app — never present AI output as personalized
financial advice.

### Gemini model gotcha

Google's free tier gives `gemini-2.0-flash` a hard quota of `limit: 0` on
some projects/keys — the model returns 429 forever on those. Use
**`gemini-flash-lite-latest`** (the `-latest` alias auto-tracks whichever
Flash-Lite version is currently free-tier enabled). This is already the
default in `aiService.ts` — don't change it back to a pinned model version.

---

## 8. Deployment (split: Vercel + Render)

**Frontend on Vercel** (`vercel.json`)
- Build: `npx vite build` (runs from repo root; Vite's `root` is `client/`)
- Output: `dist/public` (Vite's `build.outDir`)
- Rewrites: `/(.*)` → `/index.html` for SPA routing
- Env vars (set in Vercel dashboard):
  - `VITE_API_URL` = the Render backend URL, no trailing slash
  - `VITE_CLERK_PUBLISHABLE_KEY` = `pk_test_...` or `pk_live_...`

**Backend on Render** (`render.yaml`)
- Build: `npm install --include=dev && npm run build`
  (the `--include=dev` is mandatory — Render sets `NODE_ENV=production`
  which would otherwise skip devDependencies like Vite/esbuild/tsx)
- Start: `node dist/index.cjs`
- Env vars (set in Render dashboard):
  - `FRONTEND_URL` = the Vercel domain (activates CORS + disables
    static-serving so it's an API-only server)
  - `DATABASE_URL` = `mongodb+srv://...` (MongoDB Atlas)
  - `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`
  - `AI_API_KEY`, `AI_PROVIDER=gemini`
  - Optional: all `SHOONYA_*` for broker upgrade
- Health check path: `/` — served by a small JSON endpoint that only
  activates when `FRONTEND_URL` is set (otherwise static files handle it).
  Without this, health checks time out and Render kills the deploy.

**Same-origin mode still supported:** if you leave `FRONTEND_URL` and
`VITE_API_URL` unset, everything runs on Render as one service (Vite
static files served by Express). The code auto-detects.

---

## 9. Known gotchas (things that WILL bite if you don't know them)

### 9.1 Yahoo Finance from cloud IPs

Yahoo's `quote()` endpoint requires a "crumb" token and aggressively
rate-limits (429) burst requests from datacenter IPs. `marketService.ts`
handles this with:

- The **crumb-free `chart()` endpoint** as the primary source (derives
  quote data from the last candle + `meta`).
- A **global throttle** (`throttleYahoo`) limiting to ~6 concurrent
  requests with 60ms gaps, plus a 12s per-call timeout so a hung symbol
  can't stall a whole scan.
- **`validateResult: false`** on every call, because Yahoo's response
  fails yahoo-finance2's strict schema validation for thinly-traded BSE
  symbols. Without this, the logs get flooded with schema validation
  errors on every scan.

### 9.2 MongoDB SRV lookup fails on some networks

Node's default DNS resolver mishandles SRV records over UDP on some
Windows/ISP setups (`ECONNREFUSED` on `_mongodb._tcp....`). `mongoStorage.ts`
calls `dns.setServers(["8.8.8.8", "1.1.1.1"])` at connect time to force
Node to use public resolvers that reliably support SRV. Don't remove this.

### 9.3 Encoding corruption in source files

**Never** run PowerShell `Get-Content` + regex + `WriteAllText` on files
that contain `₹`, `—`, `·`, `×` or other multi-byte UTF-8 characters. On
Windows, PowerShell's mixed encoding layers triple-encode these into
garbled sequences like `â‚¹`, `Ãƒâ€š`, etc. that survive git commits and
show up in the UI.

If you must batch-edit files with special characters:
- Use a **Node.js script** with `fs.readFileSync(path, "utf-8")` and
  `fs.writeFileSync(path, text, "utf-8")`
- Use `\uXXXX` escapes for target/replacement strings so the script's
  own encoding can't be corrupted

### 9.4 Render production build skips devDependencies

Because `NODE_ENV=production`, `npm install` skips devDependencies by
default — but Vite, esbuild, tsx, cross-env are in devDependencies. The
build command in `render.yaml` uses `npm install --include=dev` to force
them in. Don't remove `--include=dev`.

### 9.5 Free-tier cold starts

Render free plan sleeps a service after ~15 min of no traffic. Waking up
takes ~50s (Node boot + Mongo connect + symbol file load). The frontend
splash screen in `client/index.html` shows during that wait. All heavy
scans use background jobs so they can't hit the ~100s gateway timeout.

### 9.6 `nifty-dma-state.json` is runtime state

The Nifty DMA service writes its holdings/capital/last-scan-results to
this file on every scan. It's gitignored — never commit changes to it.
The service falls back to `INITIAL_STATE` if the file is missing.

### 9.7 Signals `details` field is a JSON string

Most strategy scans store structured scan data as a JSON-serialized
object in the signal's `details` string. Rendering `{item.details}`
directly dumps raw JSON to the user. Always use
`formatDetails(item.details)` from `client/src/lib/format-details.ts`.

### 9.8 Rich-vs-legacy table column layout

Some strategy pages have two table column layouts — "rich" (uses parsed
structured fields) and "legacy" (uses `price` + `details`). The header
and body MUST both use the same condition (`hasRichData` — a
dataset-level check), never a per-row check like `!!item.currentMonth`.
Mismatched header/body counts shift cells and render raw JSON in the
wrong column.

---

## 10. Development

Local dev requires Node 20+.

```bash
npm install --include=dev
cp .env.example .env         # then fill in the keys you have
npm run dev                  # http://localhost:5000
```

**Useful commands:**
- `npm run dev` — dev server (Vite + tsx on Express, hot reload)
- `npm run build` — production build (Vite client + esbuild server bundle)
- `npm run start` — run the production bundle locally
- `npm run check` — TypeScript type check across everything
- `npm run db:push` — apply Drizzle schema to Postgres (unused in Mongo mode)

**Empty key = feature off** is a consistent pattern across all optional
integrations (Shoonya, Clerk, AI, DATABASE_URL). Nothing crashes if a key
is missing — the feature just becomes unavailable and a log line explains
why. Preserve this pattern in new integrations.

---

## 11. Code conventions

- **Match existing patterns** — do not introduce new routers, new state
  libraries, new CSS frameworks, or new styling approaches.
- **Match Newsprint** — sharp corners, ink borders, serif headings for
  h1-h6 (already global CSS), uppercase mono labels via `.news-label`.
- **Preserve accessibility** — 44px min tap targets, `focus-visible` rings,
  semantic HTML, `aria-label` on icon-only buttons.
- **Never dump raw JSON** to the user — always route `details` fields
  through `formatDetails()`.
- **Never block the request** on heavy work — use the background-job
  pattern (`startScanJob` / `scanJobStatus`) for anything that might
  take more than 30 seconds.
- **Log lines format**: `[hh:mm:ss AM/PM] [source] message` — use the
  exported `log(message, source?)` from `server/index.ts`.

---

## 12. When making a change

1. Read this file + the relevant existing implementation before writing code
2. If a similar page/pattern already exists, follow it exactly
3. Run `npm run check` after backend changes; run `npm run build` after
   any significant client change to catch build-only errors
4. Test in split-deploy mode locally by setting `VITE_API_URL` and
   `FRONTEND_URL` in `.env`; test in same-origin mode by leaving them blank
5. Commit in tight, scoped commits with descriptive messages — the history
   is the primary way to trace what/why for future debugging
