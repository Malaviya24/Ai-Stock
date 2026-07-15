import YahooFinanceModule from "yahoo-finance2";
import type { HistoricalDataPoint } from "./indicators";
import type { StockQuote } from "@shared/schema";
import { log } from "./index";
import { getShoonyaClient, getShoonyaQuote, getShoonyaHistoricalData, hasShoonyaEnv } from "./shoonyaService";

const YF = (YahooFinanceModule as any).default || YahooFinanceModule;
const yahooFinance = typeof YF === 'function' ? new YF() : YF;

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

  try {
    const now = Date.now();
    const cached = QUOTE_CACHE.get(symbol);
    if (cached && now - cached.ts < QUOTE_TTL_MS) {
      // log(`[DATA] Fetched ${symbol} from CACHE (Yahoo)`, "yahoo"); // Optional: log cache hits?
      return cached.data;
    }
    log(`[DATA] Fetching ${symbol} from YAHOO`, "yahoo");
    const result: any = await withRetry(() => yahooFinance.quote(symbol), 3, 500);
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
    const result = await withRetry(
      () =>
        yahooFinance.quoteSummary(symbol, {
          modules: ["defaultKeyStatistics", "financialData", "summaryDetail", "price"],
        }),
      3,
      500
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

  try {
    const now = Date.now();
    const toFetch: string[] = [];
    // Use cache where valid
    for (const sym of symbols) {
      const cached = QUOTE_CACHE.get(sym);
      if (cached && now - cached.ts < QUOTE_TTL_MS) {
        out[sym] = cached.data;
      } else {
        toFetch.push(sym);
      }
    }
    if (toFetch.length) {
      const result = await withRetry(() => (yahooFinance as any).quote(toFetch), 3, 500);
      const arr: any[] = Array.isArray(result) ? result : [result];
      for (const r of arr) {
        if (!r || !r.symbol) continue;
        const data: StockQuote = {
          symbol: r.symbol,
          name: r.shortName || r.longName || r.symbol,
          price: r.regularMarketPrice || 0,
          change: r.regularMarketChange || 0,
          changePercent: r.regularMarketChangePercent || 0,
          high: r.regularMarketDayHigh || 0,
          low: r.regularMarketDayLow || 0,
          open: r.regularMarketOpen || 0,
          previousClose: r.regularMarketPreviousClose || 0,
          volume: r.regularMarketVolume || 0,
          marketCap: r.marketCap || undefined,
          fiftyTwoWeekHigh: r.fiftyTwoWeekHigh || undefined,
          fiftyTwoWeekLow: r.fiftyTwoWeekLow || undefined,
        };
        QUOTE_CACHE.set(r.symbol, { data, ts: now });
        out[r.symbol] = data;
      }
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

    const result: any = await withRetry(
      () =>
        yahooFinance.chart(symbol, {
          period1,
          period2,
          interval: interval,
        }),
      3,
      600
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
        const weeklyRes: any = await withRetry(
          () =>
            yahooFinance.chart(symbol, {
              period1: weeklyPeriod1,
              period2: weeklyPeriod2,
              interval: "1wk",
            }),
          3,
          600
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
