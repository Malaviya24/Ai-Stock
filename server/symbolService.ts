import fs from "fs";
import path from "path";
import { log } from "./index";

interface SymbolInfo {
  exchange: string;
  token: string;
  symbol: string;
  tradingSymbol: string;
  instrument: string;
}

const SYMBOL_MAP = new Map<string, SymbolInfo>();
let isLoaded = false;

export function loadNseSymbols() {
  if (isLoaded) return;
  
  // Load NSE
  const nsePath = path.join(process.cwd(), "NSE_symbols.txt");
  if (fs.existsSync(nsePath)) {
    try {
        const content = fs.readFileSync(nsePath, "utf-8");
        const lines = content.split("\n");
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(",");
          if (parts.length < 6) continue;
          const info: SymbolInfo = {
            exchange: parts[0],
            token: parts[1],
            symbol: parts[3],
            tradingSymbol: parts[4],
            instrument: parts[5]
          };
          SYMBOL_MAP.set(`NSE:${info.symbol.toUpperCase()}`, info);
          SYMBOL_MAP.set(`NSE:${info.tradingSymbol.toUpperCase()}`, info);
          // Default fallback (NSE preferred if no prefix)
          if (!SYMBOL_MAP.has(info.symbol.toUpperCase())) {
             SYMBOL_MAP.set(info.symbol.toUpperCase(), info);
          }
          count++;
        }
        log(`Loaded ${count} NSE symbols`, "shoonya");
    } catch (e: any) {
        log(`Error loading NSE symbols: ${e.message}`, "shoonya");
    }
  }

  // Load BSE
  const bsePath = path.join(process.cwd(), "BSE_symbols.txt");
  if (fs.existsSync(bsePath)) {
    try {
        const content = fs.readFileSync(bsePath, "utf-8");
        const lines = content.split("\n");
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(",");
          if (parts.length < 6) continue;
          const info: SymbolInfo = {
            exchange: parts[0],
            token: parts[1],
            symbol: parts[3],
            tradingSymbol: parts[4],
            instrument: parts[5]
          };
          SYMBOL_MAP.set(`BSE:${info.symbol.toUpperCase()}`, info);
          SYMBOL_MAP.set(`BSE:${info.tradingSymbol.toUpperCase()}`, info);
          // Note: We don't overwrite the default (no-prefix) lookup if NSE already took it
          // unless NSE didn't have it.
          if (!SYMBOL_MAP.has(info.symbol.toUpperCase())) {
             SYMBOL_MAP.set(info.symbol.toUpperCase(), info);
          }
          count++;
        }
        log(`Loaded ${count} BSE symbols`, "shoonya");
    } catch (e: any) {
        log(`Error loading BSE symbols: ${e.message}`, "shoonya");
    }
  }

  isLoaded = true;
}

export function lookupSymbol(symbol: string, exchange?: string): SymbolInfo | undefined {
  if (!isLoaded) loadNseSymbols();
  
  const upper = symbol.toUpperCase();
  if (exchange) {
    return SYMBOL_MAP.get(`${exchange.toUpperCase()}:${upper}`);
  }
  return SYMBOL_MAP.get(upper);
}

// Kept for backward compat
export function lookupNseSymbol(symbol: string): SymbolInfo | undefined {
  return lookupSymbol(symbol, "NSE");
}

// Load immediately on module load (or we could wait for first request)
loadNseSymbols();
