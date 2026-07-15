import fs from "fs";
import path from "path";
import { log } from "./index";
import { getHistoricalData, getStockQuote } from "./marketService";
import { calculateDMA } from "./indicators";

const STATE_FILE = path.resolve("./nifty-dma-state.json");

interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  investedAmount: number;
  currentLTP: number;
  pnl: number;
  pnlPercent: number;
  isQuarantine: boolean;
  sipCount: number;
  lastSipDate: string | null; // ISO Date string
  targetPrice: number;
  entryDate: string;
}

interface TargetLog {
  symbol: string;
  buyDate: string;
  sellDate: string;
  buyPrice: number;
  sellPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface StrategyState {
  capital: {
    total: number;
    parts: number; // 50
    perPart: number;
    used: number;
    remaining: number;
  };
  holdings: Holding[];
  targetLogs: TargetLog[];
  lastScanDate: string | null;
  lastScanResults: {
    buyList: any[];
    sellList: any[];
    quarantineList: any[];
  } | null;
}

// Initial State
const INITIAL_STATE: StrategyState = {
  capital: {
    total: 1000000, // Default 10L, user can configure via API
    parts: 50,
    perPart: 20000,
    used: 0,
    remaining: 1000000,
  },
  holdings: [],
  targetLogs: [],
  lastScanDate: null,
  lastScanResults: null,
};

// Helper to load/save state
function loadState(): StrategyState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    log(`Failed to load Nifty DMA state: ${e}`);
  }
  return INITIAL_STATE;
}

function saveState(state: StrategyState) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log(`Failed to save Nifty DMA state: ${e}`);
  }
}

// Logic to check Bull Run
function isBullRun(price: number, ma50: number, ma100: number, ma200: number): boolean {
  // CMP > 50, 100, 200 (No alignment required)
  // Additional Filter: CMP <= 200 DMA * 1.10
  return (
    price > ma50 &&
    price > ma100 &&
    price > ma200 &&
    price <= ma200 * 1.10
  );
}

// Logic to check Bear Run
function isBearRun(price: number, ma50: number, ma100: number, ma200: number): boolean {
  // CMP < 50
  // 50 < 100 < 200 (Alignment required for Bear Run?)
  // "BEAR RUN CONDITION: CMP < 50 DMA, 50 DMA < 100 DMA, 100 DMA < 200 DMA"
  return (
    price < ma50 &&
    ma50 < ma100 &&
    ma100 < ma200
  );
}

export class NiftyDmaService {
  state: StrategyState;

  constructor() {
    this.state = loadState();
  }

  getState() {
    return this.state;
  }

  updateCapital(total: number) {
    this.state.capital.total = total;
    this.state.capital.parts = 50;
    this.state.capital.perPart = total / 50;
    // Recalculate used/remaining based on holdings
    const used = this.state.holdings.reduce((sum, h) => sum + h.investedAmount, 0);
    this.state.capital.used = used;
    this.state.capital.remaining = total - used;
    saveState(this.state);
    return this.state.capital;
  }

  async scanAndTrade(symbols: string[], executeTrades: boolean = false) {
    log(`Starting Nifty DMA Scan for ${symbols.length} symbols...`);
    const results: any[] = [];
    const buyList: any[] = [];
    const quarantineList: any[] = [];
    const sellList: any[] = [];

    // 1. Update Holdings (Check Targets, Stop Loss/Quarantine)
    for (const holding of this.state.holdings) {
      try {
        const quote = await getStockQuote(holding.symbol);
        if (!quote) continue;

        const ltp = quote.price;
        holding.currentLTP = ltp;
        holding.pnl = (ltp - holding.avgPrice) * holding.quantity;
        holding.pnlPercent = ((ltp - holding.avgPrice) / holding.avgPrice) * 100;

        // Check Target (6.28%)
        if (holding.pnlPercent >= 6.28) {
          log(`Target Hit for ${holding.symbol}: ${holding.pnlPercent.toFixed(2)}%`);
          if (executeTrades) {
             // Logic to sell via Shoonya API would go here
             // For now, we simulate sell
             this.state.targetLogs.push({
               symbol: holding.symbol,
               buyDate: holding.entryDate,
               sellDate: new Date().toISOString(),
               buyPrice: holding.avgPrice,
               sellPrice: ltp,
               pnl: holding.pnl,
               pnlPercent: holding.pnlPercent,
             });
             sellList.push(holding);
             // Will remove from holdings later
          }
        }

        // Check Quarantine (-20%)
        if (!holding.isQuarantine && holding.pnlPercent <= -20) {
          log(`Quarantine Triggered for ${holding.symbol}: ${holding.pnlPercent.toFixed(2)}%`);
          holding.isQuarantine = true;
          // Trigger SIP immediately? Or wait for next SIP cycle?
          // "Start SIP averaging. Invest 1/15th of original allocation monthly."
          // We mark it, and the SIP logic below handles the buying.
        }
        
        // SIP Logic for Quarantine Stocks
        if (holding.isQuarantine) {
            quarantineList.push(holding);
            // Check if monthly SIP is due
            const lastSip = holding.lastSipDate ? new Date(holding.lastSipDate) : null;
            const now = new Date();
            const isSipDue = !lastSip || (now.getTime() - lastSip.getTime() > 30 * 24 * 60 * 60 * 1000); // > 30 days
            
            if (isSipDue) {
                // Invest 1/15th of original allocation (1 part)
                const sipAmount = this.state.capital.perPart / 15;
                if (this.state.capital.remaining >= sipAmount) {
                    if (executeTrades) {
                        const qty = Math.floor(sipAmount / ltp) || 1;
                        const cost = qty * ltp;
                        
                        // Update Avg Price
                        const totalCost = holding.investedAmount + cost;
                        const totalQty = holding.quantity + qty;
                        holding.avgPrice = totalCost / totalQty;
                        holding.quantity = totalQty;
                        holding.investedAmount = totalCost;
                        holding.sipCount += 1;
                        holding.lastSipDate = now.toISOString();
                        
                        this.state.capital.remaining -= cost;
                        this.state.capital.used += cost;
                        log(`SIP Executed for ${holding.symbol}: ${qty} shares at ${ltp}`);
                    } else {
                        log(`SIP Due for ${holding.symbol} (Simulated)`);
                    }
                } else {
                    log(`SIP Skipped for ${holding.symbol}: Insufficient Capital`);
                }
            }
        }

      } catch (e: any) {
        log(`Error updating holding ${holding.symbol}: ${e.message}`);
      }
    }

    // Remove sold holdings
    if (executeTrades && sellList.length > 0) {
        this.state.holdings = this.state.holdings.filter(h => !sellList.find(s => s.symbol === h.symbol));
        // Re-calculate capital used
        const used = this.state.holdings.reduce((sum, h) => sum + h.investedAmount, 0);
        this.state.capital.used = used;
        this.state.capital.remaining = this.state.capital.total - used;
    }

    // 2. Scan for New Buys (Only if we have remaining parts)
    // "Buy sequentially until capital parts finish."
    // We check how many full parts are used.
    // Actually, capital.remaining logic handles partial parts, but strategy says "50 equal parts".
    // Let's assume we buy 1 part if we have enough capital for 1 part.
    
    // Fetch History for all symbols (Batch)
    // We need 500 days (approx 24 months)
    
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        await Promise.all(batch.map(async (symbol) => {
            // Skip if already held
            if (this.state.holdings.find(h => h.symbol === symbol)) return;

            try {
                const [quote, history] = await Promise.all([
                    getStockQuote(symbol),
                    getHistoricalData(symbol, 24) // 24 months ~ 500 days
                ]);
                
                if (!quote || !history || history.length < 40) return;
                
                const ltp = quote.price;
                const ma50 = calculateDMA(history, 50);
                const ma100 = calculateDMA(history, 100);
                const ma200 = calculateDMA(history, 200);
                
                if (isBullRun(ltp, ma50, ma100, ma200)) {
                    buyList.push({
                        symbol,
                        name: quote.name,
                        ltp,
                        ma50, ma100, ma200,
                        dist200: ((ltp - ma200) / ma200) * 100
                    });
                }
            } catch (e) {
                // ignore error
            }
        }));
    }

    // Sort by lowest CMP first
    buyList.sort((a, b) => a.ltp - b.ltp);
    
    // Save Scan Results to State for persistence
    this.state.lastScanResults = {
        buyList,
        sellList,
        quarantineList
    };

    // Execute Buys
    if (executeTrades) {
        for (const stock of buyList) {
            if (this.state.capital.remaining >= this.state.capital.perPart) {
                const qty = Math.floor(this.state.capital.perPart / stock.ltp);
                if (qty > 0) {
                    const cost = qty * stock.ltp;
                    this.state.holdings.push({
                        symbol: stock.symbol,
                        name: stock.name,
                        quantity: qty,
                        avgPrice: stock.ltp,
                        investedAmount: cost,
                        currentLTP: stock.ltp,
                        pnl: 0,
                        pnlPercent: 0,
                        isQuarantine: false,
                        sipCount: 0,
                        lastSipDate: null,
                        targetPrice: stock.ltp * 1.0628,
                        entryDate: new Date().toISOString()
                    });
                    this.state.capital.remaining -= cost;
                    this.state.capital.used += cost;
                    log(`Bought ${stock.symbol}: ${qty} shares at ${stock.ltp}`);
                }
            }
        }
    }

    this.state.lastScanDate = new Date().toISOString();
    saveState(this.state);

    return {
        state: this.state,
        scanResults: {
            buyList,
            sellList,
            quarantineList
        }
    };
  }
}

export const niftyDmaService = new NiftyDmaService();
