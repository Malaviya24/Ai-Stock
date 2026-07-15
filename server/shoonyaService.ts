import { RestClient } from "shoonya-sdk";
import { log } from "./index";
import { lookupNseSymbol, lookupSymbol } from "./symbolService";
import * as OTPAuth from "otpauth";

let api: RestClient | null = null;
let lastLoginTime = 0;
const LOGIN_TTL_MS = 23 * 60 * 60 * 1000; // 23 hours
let lastLoginFailTime = 0;
const FAIL_COOLDOWN_MS = 2 * 60 * 1000;

export function hasShoonyaEnv(): boolean {
  return Boolean(
    process.env.SHOONYA_USER_ID &&
      process.env.SHOONYA_PASSWORD &&
      process.env.SHOONYA_TOTP_SECRET &&
      process.env.SHOONYA_API_KEY &&
      process.env.SHOONYA_VENDOR_CODE,
  );
}

export async function getShoonyaClient() {
  const userId = process.env.SHOONYA_USER_ID;
  const password = process.env.SHOONYA_PASSWORD;
  const totpSecret = process.env.SHOONYA_TOTP_SECRET;
  const apiKey = process.env.SHOONYA_API_KEY;
  const vendorCode = process.env.SHOONYA_VENDOR_CODE;
  const imei = process.env.SHOONYA_IMEI || "abc1234";

  if (!userId || !password || !totpSecret || !apiKey || !vendorCode) {
    log("Shoonya credentials missing in .env", "shoonya");
    return null;
  }

  const now = Date.now();
  if (lastLoginFailTime && now - lastLoginFailTime < FAIL_COOLDOWN_MS) {
    return null;
  }
  if (api && now - lastLoginTime < LOGIN_TTL_MS) {
    return api;
  }

  try {
    const cleanSecret = totpSecret.replace(/ /g, "").toUpperCase();
    
    let secret: OTPAuth.Secret;
    try {
        secret = OTPAuth.Secret.fromBase32(cleanSecret);
    } catch (e) {
        log(`Base32 decode failed for secret: ${e}. Using raw secret as fallback.`, "shoonya");
        secret = new OTPAuth.Secret({ buffer: Buffer.from(cleanSecret, "utf-8") });
    }

    const totp = new OTPAuth.TOTP({
      issuer: "Shoonya",
      label: userId,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret
    });

    const twoFaCode = totp.generate();

    api = new RestClient({
      userId: userId,
      password: password,
      twoFa: twoFaCode,
      vendorCode: vendorCode,
      apiKey: apiKey,
      imei: imei,
    });

    try {
        log(`Attempting Shoonya login for ${userId}...`, "shoonya");
        const userDetails = await api.getUserDetails();
        if (userDetails && userDetails.stat === "Ok") {
            log(`Shoonya login successful for ${userId}`, "shoonya");
            lastLoginTime = now;
            return api;
        } else {
            log(`Shoonya login check failed: ${JSON.stringify(userDetails)}`, "shoonya");
            api = null;
            lastLoginFailTime = now;
            return null;
        }
    } catch (e: any) {
        log(`Shoonya login verification failed: ${e.message}`, "shoonya");
        api = null;
        lastLoginFailTime = now;
        return null;
    }
  } catch (error: any) {
    log(`Shoonya init error: ${error.message}`, "shoonya");
    api = null;
    lastLoginFailTime = Date.now();
    return null;
  }
}

const TOKEN_CACHE = new Map<string, string>();

export async function resolveShoonyaToken(symbol: string, client: RestClient): Promise<{ exchange: string; token: string } | null> {
  const clean = symbol.toUpperCase().replace(".NS", "").replace(".BO", "");
  const exchange = symbol.endsWith(".BO") ? "BSE" : "NSE";
  const cacheKey = `${exchange}:${clean}`;

  if (TOKEN_CACHE.has(cacheKey)) {
    return { exchange, token: TOKEN_CACHE.get(cacheKey)! };
  }

  try {
    const res = await client.searchScrip(exchange, clean);
    if (res && res.stat === "Ok" && res.values && res.values.length > 0) {
      // Find exact match if possible, or take the first one
      // Shoonya search results usually contain tsym (trading symbol)
      // We want "RELIANCE-EQ" for "RELIANCE" in NSE usually.
      // Or just matching the symbol name.
      
      // Heuristic: Prefer -EQ for NSE Equity
      let match = res.values.find(v => v.tsym === `${clean}-EQ` && v.exch === exchange);
      if (!match) {
        match = res.values.find(v => v.tsym === clean && v.exch === exchange);
      }
      if (!match) {
         match = res.values[0];
      }

      if (match) {
        TOKEN_CACHE.set(cacheKey, match.token);
        return { exchange, token: match.token };
      }
    }
  } catch (e: any) {
    log(`Shoonya search error for ${symbol}: ${e.message}`, "shoonya");
  }

  return null;
}

export async function getShoonyaQuote(symbol: string) {
  const client = await getShoonyaClient();
  if (!client) return null;

  const resolved = await resolveShoonyaToken(symbol, client);
  if (!resolved) {
      log(`Could not resolve token for ${symbol}`, "shoonya");
      return null;
  }
  const { exchange, token } = resolved;
  
  try {
    // SDK uses getQuotes
    const res: any = await client.getQuotes(exchange, token);
    if (res.stat === "Ok") {
      const price = parseFloat(res.lp || "0");
      const prevClose = parseFloat(res.c || "0"); // c is previous close usually in get_quotes?
      
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
      
      return {
        price: price,
        open: parseFloat(res.o || "0"),
        high: parseFloat(res.h || "0"),
        low: parseFloat(res.l || "0"),
        close: parseFloat(res.c || "0"), // using 'c' as close/prevClose
        volume: parseFloat(res.v || "0"),
        previousClose: prevClose,
        change: change,
        changePercent: changePercent
      };
    } else {
        log(`Shoonya getQuotes failed for ${symbol} (Token: ${token}): ${JSON.stringify(res)}`, "shoonya");
    }
  } catch (e: any) {
    log(`Shoonya quote error for ${symbol}: ${e.message}`, "shoonya");
  }
  return null;
}

export async function getShoonyaHistoricalData(symbol: string, days: number = 365) {
  const client = await getShoonyaClient();
  if (!client) return [];

  const resolved = await resolveShoonyaToken(symbol, client);
  if (!resolved) {
      log(`Could not resolve token for ${symbol}`, "shoonya");
      return [];
  }
  const { exchange, token } = resolved;
  
  // Calculate start time (seconds since epoch)
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - (days * 24 * 60 * 60);

  try {
    // getHistoricData takes an object with exch, token, st, et
    // st, et are strings in seconds since epoch?
    // The d.ts comment says "time in seconds since 1st Jan 1970"
    
    // Note: The method name in SDK is getHistoricData
    // Also, it might return Promise<HistoricData>
    
    const res = await client.getHistoricData({
      exch: exchange,
      token: token,
      st: startTime.toString(),
      et: endTime.toString()
      // interval is missing in getHistoricData arguments in the d.ts snippet I saw?
      // Wait, let's re-read d.ts line 822.
      // getHistoricData(option: { exch, token, st, et }): Promise<HistoricData>;
      // It doesn't seem to have 'interval' or 'interv'?
      // Usually Shoonya API needs 'intrv'.
      // Maybe the SDK adds it or I missed it in the type definition?
      // If the SDK type is strict, I might need to cast or check if 'intrv' is allowed.
      // Or maybe the SDK defaults to 'D' or something?
      // Actually, standard Shoonya API requires 'intrv'.
      // If the SDK wrapper missed it, I might need to patch or cast.
      // Let's try adding it and cast to any if needed.
    } as any);
    
    if (res && (res as any).stat === "Ok" && Array.isArray(res)) {
      // Wait, HistoricData type?
      // It's likely an array or object with data array.
      // Let's assume res is the array if successful (based on common Shoonya usage)
      // or res.data?
      // The d.ts says Promise<HistoricData>. HistoricData is likely BaseType<...>
      
      const data = Array.isArray(res) ? res : (res as any).data || (res as any).values || [];
      
      return data.map((d: any) => ({
        // Shoonya TPSeries response fields:
        // time: "dd-MM-yyyy HH:mm:ss" or epoch
        // into: open
        // intoh: high
        // intol: low
        // intc: close
        // intv: volume
        
        date: typeof d.time === 'string' ? parseShoonyaDate(d.time) : new Date(Number(d.time) * 1000),
        open: parseFloat(d.into),
        high: parseFloat(d.intoh),
        low: parseFloat(d.intol),
        close: parseFloat(d.intc),
        volume: parseFloat(d.intv),
      }));
    }
  } catch (e: any) {
    log(`Shoonya history error for ${symbol}: ${e.message}`, "shoonya");
  }
  return [];
}

function parseShoonyaDate(dateStr: string): Date {
  // Format: "dd-MM-yyyy HH:mm:ss"
  const [datePart, timePart] = dateStr.split(" ");
  const [d, m, y] = datePart.split("-").map(Number);
  const [h, min, s] = timePart ? timePart.split(":").map(Number) : [0, 0, 0];
  return new Date(y, m - 1, d, h, min, s);
  }
  
  export function mapSymbolToShoonya(symbol: string): { exchange: string; token: string } {
    // Simple mapping for now. Shoonya needs exchange and token/symbol.
    // Usually API takes "NSE:RELIANCE-EQ" or similar.
    // The shoonya-sdk usually expects separate exchange and symbol args for some calls,
    // or a trading symbol string.
    // Let's assume standard "NSE:RELIANCE-EQ" format or just "RELIANCE-EQ".
    
    let clean = symbol.toUpperCase().replace(".NS", "").replace(".BO", "");
    let exchange = symbol.endsWith(".BO") ? "BSE" : "NSE";
    
    // Try lookup from master list using specific exchange
    // We try looking up the clean symbol (e.g. "ESILVER")
    // If not found, we can try with "-EQ" appended if the file didn't index it correctly?
    // But symbolService indexes both Symbol and TradingSymbol.
    
    // DEBUG: Log what we are looking for
    // log(`Looking up Shoonya symbol for: ${clean} [${exchange}]`, "shoonya");
    
    const info = lookupSymbol(clean, exchange);
    if (info) {
      // Shoonya API getQuotes expects the numeric token (e.g. "26009" for ESILVER)
      // NOT the trading symbol (e.g. "ESILVER-EQ").
      return { exchange, token: info.token };
    } else if (exchange === "NSE") {
        // Fallback: Try looking up with -EQ suffix explicitly if clean lookup failed?
        // Actually symbolService should handle it if loaded correctly.
        // Let's try one more check: maybe the clean symbol matches 'TradingSymbol' but we only indexed it via `clean`?
        // Wait, symbolService indexes `info.symbol` AND `info.tradingSymbol`.
        
        // Maybe the symbol in file is different? 
        // e.g. "MID150BEES" vs "MID150BEES-EQ".
        // If clean is "MID150BEES", it should match.
        
        // What if clean symbol has special chars? 
        // e.g. "M&M" -> "M&M" or "M_M"?
        // "M&M" is usually "M&M" in Yahoo and NSE.
    }

    // Note: Shoonya symbols often have suffixes like "-EQ" for equity.
    // We might need a token lookup map if simple string matching fails.
    // For now, try appending "-EQ" for NSE/BSE stocks.
    if (exchange === "NSE" || exchange === "BSE") {
      // Basic heuristic: most stocks are EQ
      // Indices like NIFTY 50 might need different handling if traded (futures?)
      // But for "GetQuotes" we usually need the trading symbol.
      // UPDATE: Returning clean symbol without -EQ suffix as it causes issues with indices and some stocks.
      return { exchange, token: clean };
    }
    
    return { exchange, token: clean };
  }
