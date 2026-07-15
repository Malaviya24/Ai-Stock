import YahooFinanceModule from "yahoo-finance2";
import type { HistoricalDataPoint } from "./indicators";
import type { StockQuote } from "@shared/schema";
import { log } from "./index";
import { getShoonyaClient, getShoonyaQuote, getShoonyaHistoricalData, hasShoonyaEnv } from "./shoonyaService";

const YF = (YahooFinanceModule as any).default || YahooFinanceModule;
const yahooFinance = typeof YF === 'function' ? new YF() : YF;

// Yahoo's responses often fail yahoo-finance2's strict schema validation for
// thinly-traded / delisted BSE symbols (e.g. currency:null, no regularMarketPrice).
// We disable throwing/logging on validation since our code already handles
// missing fields with fallbacks. This also stops the huge log spam on cloud hosts.
try {
  yahooFinance.setGlobalConfig?.({
    validation: { logErrors: false, logOptionsErrors: false },
  });
  // Silence the "new version available" and survey notices in logs.
  yahooFinance.suppressNotices?.(["yahooSurvey", "ripHistorical"]);
} catch {
  /* older/newer SDK shape — safe to ignore */
}

// Module options applied to every Yahoo call: never throw on schema mismatch.
const NO_VALIDATE = { validateResult: false } as const;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, attempts: number = 3, baseDelayMs: number = 400): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

/**
 * Global concurrency limiter for Yahoo Finance requests.
 * Yahoo rate-limits (HTTP 429) when many requests arrive at once from a
 * single (especially cloud/datacenter) IP. Limiting concurrency + spacing
 * requests keeps us under the limit so scans work on hosts like Render.
 *
 * Since we now use the crumb-free chart() endpoint (much more tolerant than
 * the old quote() crumb endpoint), we can run more requests in parallel so
 * large scans (200-300 symbols) finish before Render's gateway times out
 * (which otherwise shows up as a generic 502 to the user).
 */
const YAHOO_MAX_CONCURRENT = 6;
const YAHOO_MIN_GAP_MS = 60;
// Hard cap per request so one slow/hung symbol can't block a slot and stall
// the whole scan (which would push the scan past the gateway timeout).
const YAHOO_CALL_TIMEOUT_MS = 12000;
let yahooActive = 0;
const yahooWaiters: Array<() => void> = [];

function acquireYahooSlot(): Promise<void> {
  if (yahooActive < YAHOO_MAX_CONCURRENT) {
    yahooActive++;
    return Promise.resolve();
  }
  return new Promise((resolve) => yahooWaiters.push(resolve));
}

function releaseYahooSlot() {
  const next = yahooWaiters.shift();
  if (next) {
    next();
  } else {
    yahooActive--;
  }
}

function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Yahoo call timed out after ${ms}ms`)), ms);
    fn().then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function throttleYahoo<T>(fn: () => Promise<T>): Promise<T> {
  await acquireYahooSlot();
  try {
    return await withTimeout(fn, YAHOO_CALL_TIMEOUT_MS);
  } finally {
    await sleep(YAHOO_MIN_GAP_MS);
    releaseYahooSlot();
  }
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  // Try Shoonya first if configured
  if (hasShoonyaEnv()) {
    const shoonyaQuote = await getShoonyaQuote(symbol);
    if (shoonyaQuote) {
      log(`[DATA] Fetched ${symbol} from SHOONYA`, "shoonya");
      return {
        symbol: symbol,
        name: symbol, // Shoonya might not return name directly in quote, assume symbol
        ...shoonyaQuote
      };
    } else {
      log(`[DATA] Failed to fetch ${symbol} from SHOONYA, falling back to Yahoo`, "shoonya");
    }
  }

  const now = Date.now();
  const cached = QUOTE_CACHE.get(symbol);
  if (cached && now - cached.ts < QUOTE_TTL_MS) {
    return cached.data;
  }

  // Primary: derive the quote from the chart() endpoint (v8), which does NOT
  // require a "crumb" token and is far less likely to be rate-limited (429)
  // than the quote() endpoint when running from a cloud host.
  try {
    log(`[DATA] Fetching ${symbol} from YAHOO (chart)`, "yahoo");
    const period1 = new Date();
    period1.setDate(period1.getDate() - 10);
    const result: any = await throttleYahoo(() =>
      withRetry(() => yahooFinance.chart(symbol, { period1, interval: "1d" }, NO_VALIDATE), 4, 700)
    );

    const meta = result?.meta;
    const candles: any[] = result?.quotes || [];
    const last = candles.length ? candles[candles.length - 1] : null;
    const price = meta?.regularMarketPrice ?? last?.close;

    if (price != null) {
      const prevClose =
        meta?.chartPreviousClose ??
        meta?.previousClose ??
        (candles.length > 1 ? candles[candles.length - 2].close : price);
      const change = price - prevClose;
      const data: StockQuote = {
        symbol: meta?.symbol || symbol,
        name: meta?.shortName || meta?.longName || symbol,
        price,
        change,
        changePercent: prevClose ? (change / prevClose) * 100 : 0,
        high: meta?.regularMarketDayHigh ?? last?.high ?? 0,
        low: meta?.regularMarketDayLow ?? last?.low ?? 0,
        open: last?.open ?? 0,
        previousClose: prevClose,
        volume: meta?.regularMarketVolume ?? last?.volume ?? 0,
        marketCap: undefined,
        fiftyTwoWeekHigh: meta?.fiftyTwoWeekHigh || undefined,
        fiftyTwoWeekLow: meta?.fiftyTwoWeekLow || undefined,
      };
      QUOTE_CACHE.set(symbol, { data, ts: now });
      return data;
    }
  } catch (error: any) {
    log(`Chart-quote failed for ${symbol}: ${error.message}. Trying quote().`, "yahoo");
  }

  // Fallback: the classic quote() endpoint (needs a crumb; may hit 429).
  try {
    const result: any = await throttleYahoo(() =>
      withRetry(() => yahooFinance.quote(symbol, {}, NO_VALIDATE), 3, 800)
    );
    if (!result) return null;

    const data: StockQuote = {
      symbol: result.symbol || symbol,
      name: result.shortName || result.longName || symbol,
      price: result.regularMarketPrice || 0,
      change: result.regularMarketChange || 0,
      changePercent: result.regularMarketChangePercent || 0,
      high: result.regularMarketDayHigh || 0,
      low: result.regularMarketDayLow || 0,
      open: result.regularMarketOpen || 0,
      previousClose: result.regularMarketPreviousClose || 0,
      volume: result.regularMarketVolume || 0,
      marketCap: result.marketCap || undefined,
      fiftyTwoWeekHigh: result.fiftyTwoWeekHigh || undefined,
      fiftyTwoWeekLow: result.fiftyTwoWeekLow || undefined,
    };
    QUOTE_CACHE.set(symbol, { data, ts: now });
    return data;
  } catch (error: any) {
    log(`Error fetching quote for ${symbol}: ${error.message}`, "yahoo");
    return null;
  }
}

export async function getQuoteSummary(symbol: string): Promise<any | null> {
  // Shoonya doesn't provide full fundamental summary like Yahoo
  // Fallback to Yahoo for fundamentals even if Shoonya is active
  try {
    const result = await throttleYahoo(() =>
      withRetry(
        () =>
          yahooFinance.quoteSummary(
            symbol,
            {
              modules: ["defaultKeyStatistics", "financialData", "summaryDetail", "price"],
            },
            NO_VALIDATE
          ),
        3,
        500
      )
    );
    return result;
  } catch (error: any) {
    log(`Error fetching summary for ${symbol}: ${error.message}`, "yahoo");
    return null;
  }
}

// Simple in-memory cache for quotes (TTL in ms)
const QUOTE_CACHE = new Map<string, { data: StockQuote; ts: number }>();
const QUOTE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getBulkQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
  const out: Record<string, StockQuote> = {};
  if (!symbols.length) return out;

  // If Shoonya is enabled, we could implement bulk fetch there too
  // But Shoonya get_quotes usually takes one symbol? 
  // shoonya-sdk might not support multi-token get_quotes easily in one call 
  // without websocket.
  // For now, if Shoonya is enabled, fall back to sequential getStockQuote (which calls getShoonyaQuote)
  // Or just use Yahoo for bulk if Shoonya not optimized?
  // Let's prefer Yahoo for bulk for now unless we implement bulk in Shoonya service.
  
  if (hasShoonyaEnv()) {
    // Naive parallel fetch for Shoonya
    // This might hit rate limits if too fast
    // Let's iterate
    for (const sym of symbols) {
      const q = await getStockQuote(sym);
      if (q) out[sym] = q;
    }
    return out;
  }

  // Fetch each symbol via the crumb-free getStockQuote path. The global
  // Yahoo throttle limits real concurrency, and QUOTE_CACHE avoids refetches,
  // so firing these in parallel is safe and avoids the bulk quote() crumb 429.
  try {
    const results = await Promise.all(
      symbols.map(async (sym) => ({ sym, data: await getStockQuote(sym) }))
    );
    for (const { sym, data } of results) {
      if (data) out[sym] = data;
    }
  } catch (error: any) {
    log(`Error bulk quotes for ${symbols.length} symbols: ${error.message}`, "yahoo");
  }
  return out;
}

const HIST_CACHE = new Map<string, { data: HistoricalDataPoint[]; ts: number }>();
const HIST_TTL_MS = 15 * 60 * 1000;

export async function getHistoricalData(
  symbol: string,
  months: number = 8,
  interval: "1d" | "1wk" | "1mo" = "1d"
): Promise<HistoricalDataPoint[]> {
  // Shoonya support
  if (hasShoonyaEnv()) {
    // Approximate months to days
    const days = months * 30;
    const history = await getShoonyaHistoricalData(symbol, days);
    if (history && history.length > 0) {
      log(`[DATA] Fetched HISTORY for ${symbol} from SHOONYA`, "shoonya");
      return history;
    }
    log(`[DATA] Failed to fetch HISTORY for ${symbol} from SHOONYA, fallback to Yahoo`, "shoonya");
  }

  try {
    const now = Date.now();
    const key = `${symbol}::${months}::${interval}`;
    const cached = HIST_CACHE.get(key);
    if (cached && now - cached.ts < HIST_TTL_MS) {
      // log(`[DATA] Fetched HISTORY for ${symbol} from CACHE (Yahoo)`, "yahoo");
      return cached.data;
    }
    log(`[DATA] Fetching HISTORY for ${symbol} from YAHOO`, "yahoo");
    const period1 = new Date();
    period1.setMonth(period1.getMonth() - months);
    const period2 = new Date();

    const result: any = await throttleYahoo(() =>
      withRetry(
        () =>
          yahooFinance.chart(
            symbol,
            {
              period1,
              period2,
              interval: interval,
            },
            NO_VALIDATE
          ),
        3,
        600
      )
    );

    const quotes = result.quotes || (Array.isArray(result) ? result : []);
    const mapped = quotes.map((item: any) => ({
      date: new Date(item.date),
      open: item.open || 0,
      high: item.high || 0,
      low: item.low || 0,
      close: item.close || 0,
      volume: item.volume || 0,
    }));
    if (mapped.length < 100 && interval === "1d") {
      log(`[DATA] Daily history too short for ${symbol} (${mapped.length}). Retrying weekly range.`, "yahoo");
      try {
        const weeklyYears = Math.max(2, Math.ceil(months / 12));
        const weeklyPeriod1 = new Date();
        weeklyPeriod1.setFullYear(weeklyPeriod1.getFullYear() - weeklyYears);
        const weeklyPeriod2 = new Date();
        const weeklyRes: any = await throttleYahoo(() =>
          withRetry(
            () =>
              yahooFinance.chart(
                symbol,
                {
                  period1: weeklyPeriod1,
                  period2: weeklyPeriod2,
                  interval: "1wk",
                },
                NO_VALIDATE
              ),
            3,
            600
          )
        );
        const weeklyQuotes = weeklyRes?.quotes || [];
        const weeklyMapped = weeklyQuotes.map((item: any) => ({
          date: new Date(item.date),
          open: item.open || 0,
          high: item.high || 0,
          low: item.low || 0,
          close: item.close || 0,
          volume: item.volume || 0,
        }));
        if (weeklyMapped.length > mapped.length) {
          HIST_CACHE.set(`${symbol}::${months}::1wk`, { data: weeklyMapped, ts: now });
          return weeklyMapped;
        }
      } catch (e: any) {
        log(`Weekly fallback failed for ${symbol}: ${e.message}`, "yahoo");
      }
    }
    HIST_CACHE.set(key, { data: mapped, ts: now });
    return mapped;
  } catch (error: any) {
    log(`Error fetching historical data for ${symbol}: ${error.message}`, "yahoo");
    return [];
  }
}
