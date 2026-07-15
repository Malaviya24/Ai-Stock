import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const watchlistItems = pgTable("watchlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  exchange: text("exchange").notNull().default("NSE"),
  addedAt: timestamp("added_at").defaultNow(),
});

export const portfolioPositions = pgTable("portfolio_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  entryPrice: real("entry_price").notNull(),
  quantity: integer("quantity").notNull(),
  strategyUsed: text("strategy_used").notNull(),
  targetPrice: real("target_price"),
  stopLoss: real("stop_loss"),
  isActive: boolean("is_active").notNull().default(true),
  enteredAt: timestamp("entered_at").defaultNow(),
});

export const signals = pgTable("signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  companyName: text("company_name").notNull(),
  strategy: text("strategy").notNull(),
  signal: text("signal").notNull(),
  price: real("price").notNull(),
  target: real("target"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  pnl: real("pnl"),
  strategy: text("strategy").notNull(),
  type: text("type").notNull().default("BUY"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const compoundingTrades = pgTable("compounding_trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  companyName: text("company_name").notNull(),
  slotIndex: integer("slot_index").notNull(),
  cycleNumber: integer("cycle_number").notNull(),
  tradeAmount: real("trade_amount").notNull(),
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  grossProfit: real("gross_profit"),
  brokerage: real("brokerage"),
  netBeforeTax: real("net_before_tax"),
  tax: real("tax"),
  netAfterTax: real("net_after_tax"),
  dividendAmount: real("dividend_amount"),
  reinvestAmount: real("reinvest_amount"),
  nextTradeAmount: real("next_trade_amount"),
  status: text("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const capitalSlots = pgTable("capital_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stockSymbol: text("stock_symbol").notNull(),
  stockName: text("stock_name").notNull(),
  totalCapitalPerStock: real("total_capital_per_stock").notNull(),
  perSlotAmount: real("per_slot_amount").notNull(),
  slotsUsed: integer("slots_used").notNull().default(0),
  currentTradeAmount: real("current_trade_amount").notNull(),
  totalCyclesCompleted: integer("total_cycles_completed").notNull().default(0),
  totalDividendEarned: real("total_dividend_earned").notNull().default(0),
  totalReinvested: real("total_reinvested").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompoundingTradeSchema = createInsertSchema(compoundingTrades).omit({ id: true, createdAt: true, closedAt: true });
export const insertCapitalSlotSchema = createInsertSchema(capitalSlots).omit({ id: true, createdAt: true });

export type InsertCompoundingTrade = z.infer<typeof insertCompoundingTradeSchema>;
export type CompoundingTrade = typeof compoundingTrades.$inferSelect;
export type InsertCapitalSlot = z.infer<typeof insertCapitalSlotSchema>;
export type CapitalSlot = typeof capitalSlots.$inferSelect;

export const insertWatchlistSchema = createInsertSchema(watchlistItems).omit({ id: true, addedAt: true });
export const insertPortfolioSchema = createInsertSchema(portfolioPositions).omit({ id: true, enteredAt: true });
export const insertSignalSchema = createInsertSchema(signals).omit({ id: true, createdAt: true });
export const insertTradeSchema = createInsertSchema(trades).omit({ id: true, createdAt: true });

export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type PortfolioPosition = typeof portfolioPositions.$inferSelect;
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signals.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface StockIndicators {
  symbol: string;
  rsi: number;
  dma124: number;
  srtv: number;
  darvasHigh: number;
  isBreakout: boolean;
  currentPrice: number;
}

export interface AIScore {
  symbol: string;
  name: string;
  totalScore: number;
  rsiScore: number;
  srtvScore: number;
  breakoutScore: number;
  volumeScore: number;
  signal: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  currentPrice: number;
  rsi: number;
  srtv: number;
  isBreakout: boolean;
}

export interface CapitalSuggestion {
  totalCapital: number;
  perLotSize: number;
  maxExposure: number;
  currentExposure: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  suggestedPositions: number;
}

export interface MarketOverview {
  quote: StockQuote;
  indicators: StockIndicators;
}
