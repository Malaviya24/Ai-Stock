import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and } from "drizzle-orm";
import pg from "pg";
import { randomUUID } from "crypto";
import { MongoStorage } from "./mongoStorage"; // Import MongoStorage
import {
  watchlistItems,
  portfolioPositions,
  signals,
  trades,
  compoundingTrades,
  capitalSlots,
  savedAnalyses,
  type WatchlistItem,
  type InsertWatchlist,
  type PortfolioPosition,
  type InsertPortfolio,
  type Signal,
  type InsertSignal,
  type Trade,
  type InsertTrade,
  type CompoundingTrade,
  type InsertCompoundingTrade,
  type CapitalSlot,
  type InsertCapitalSlot,
  type SavedAnalysis,
  type InsertSavedAnalysis,
} from "@shared/schema";

// Only init Postgres if NOT using Mongo
const isMongo = process.env.DATABASE_URL?.startsWith("mongodb");
let pool: pg.Pool | null = null;
let db: any = null;

if (!isMongo && process.env.DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  db = drizzle(pool);
}

export { db };

export interface IStorage {
  // Watchlist/portfolio/trades are scoped per-user (Clerk userId, or "local"
  // when auth isn't configured) so one signed-in user never sees another's data.
  getWatchlist(userId: string): Promise<WatchlistItem[]>;
  addToWatchlist(userId: string, item: InsertWatchlist): Promise<WatchlistItem>;
  removeFromWatchlist(userId: string, id: string): Promise<void>;
  getPortfolioPositions(userId: string): Promise<PortfolioPosition[]>;
  addPortfolioPosition(userId: string, position: InsertPortfolio): Promise<PortfolioPosition>;
  deletePortfolioPosition(userId: string, id: string): Promise<void>;
  // Signals are market-wide scan results, not user-owned, so they stay global.
  getSignals(limit?: number, strategy?: string): Promise<Signal[]>;
  addSignal(signal: InsertSignal): Promise<Signal>;
  clearSignals(): Promise<void>;
  clearSignalsByStrategy(strategy: string): Promise<void>;
  getLastBuySignal(symbol: string, strategy: string): Promise<Signal | null>;
  getTrades(userId: string, limit?: number): Promise<Trade[]>;
  addTrade(userId: string, trade: InsertTrade): Promise<Trade>;
  // AI Analyst: saved shortlists, scoped per user.
  getSavedAnalyses(userId: string): Promise<SavedAnalysis[]>;
  saveAnalysis(userId: string, data: InsertSavedAnalysis): Promise<SavedAnalysis>;
  deleteSavedAnalysis(userId: string, id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getWatchlist(userId: string): Promise<WatchlistItem[]> {
    return db.select().from(watchlistItems).where(eq(watchlistItems.userId, userId));
  }

  async addToWatchlist(userId: string, item: InsertWatchlist): Promise<WatchlistItem> {
    const [result] = await db.insert(watchlistItems).values({ ...item, userId }).returning();
    return result;
  }

  async removeFromWatchlist(userId: string, id: string): Promise<void> {
    await db.delete(watchlistItems).where(and(eq(watchlistItems.id, id), eq(watchlistItems.userId, userId)));
  }

  async getPortfolioPositions(userId: string): Promise<PortfolioPosition[]> {
    return db.select().from(portfolioPositions).where(eq(portfolioPositions.userId, userId));
  }

  async addPortfolioPosition(userId: string, position: InsertPortfolio): Promise<PortfolioPosition> {
    const [result] = await db.insert(portfolioPositions).values({ ...position, userId }).returning();
    return result;
  }

  async deletePortfolioPosition(userId: string, id: string): Promise<void> {
    await db.delete(portfolioPositions).where(and(eq(portfolioPositions.id, id), eq(portfolioPositions.userId, userId)));
  }

  async getSignals(limit: number = 100, strategy?: string): Promise<Signal[]> {
    if (strategy) {
      return db.select().from(signals).where(eq(signals.strategy, strategy)).orderBy(desc(signals.createdAt)).limit(limit);
    }
    return db.select().from(signals).orderBy(desc(signals.createdAt)).limit(limit);
  }

  async addSignal(signal: InsertSignal): Promise<Signal> {
    const [result] = await db.insert(signals).values(signal).returning();
    return result;
  }

  async clearSignals(): Promise<void> {
    await db.delete(signals);
  }

  async clearSignalsByStrategy(strategy: string): Promise<void> {
    await db.delete(signals).where(eq(signals.strategy, strategy));
  }

  async getLastBuySignal(symbol: string, strategy: string): Promise<Signal | null> {
    const results = await db
      .select()
      .from(signals)
      .where(eq(signals.symbol, symbol))
      .orderBy(desc(signals.createdAt))
      .limit(20);
    const match = results.find(
      (s: Signal) => s.strategy === strategy && s.signal === "BUY" && s.price
    );
    return match || null;
  }

  async getTrades(userId: string, limit: number = 50): Promise<Trade[]> {
    return db.select().from(trades).where(eq(trades.userId, userId)).orderBy(desc(trades.createdAt)).limit(limit);
  }

  async addTrade(userId: string, trade: InsertTrade): Promise<Trade> {
    const [result] = await db.insert(trades).values({ ...trade, userId }).returning();
    return result;
  }

  async getSavedAnalyses(userId: string): Promise<SavedAnalysis[]> {
    return db.select().from(savedAnalyses).where(eq(savedAnalyses.userId, userId)).orderBy(desc(savedAnalyses.createdAt));
  }

  async saveAnalysis(userId: string, data: InsertSavedAnalysis): Promise<SavedAnalysis> {
    const [result] = await db.insert(savedAnalyses).values({ ...data, userId }).returning();
    return result;
  }

  async deleteSavedAnalysis(userId: string, id: string): Promise<void> {
    await db.delete(savedAnalyses).where(and(eq(savedAnalyses.id, id), eq(savedAnalyses.userId, userId)));
  }
}

class MemoryStorage implements IStorage {
  // userId stored alongside each record (not part of the public type) so we
  // can filter per-user without changing the shape returned to callers.
  _watchlist: (WatchlistItem & { userId: string })[] = [];
  _portfolio: (PortfolioPosition & { userId: string })[] = [];
  _signals: Signal[] = [];
  _trades: (Trade & { userId: string })[] = [];

  async getWatchlist(userId: string): Promise<WatchlistItem[]> {
    return this._watchlist.filter((w) => w.userId === userId);
  }

  async addToWatchlist(userId: string, item: InsertWatchlist): Promise<WatchlistItem> {
    const record: WatchlistItem & { userId: string } = {
      id: randomUUID(),
      userId,
      addedAt: new Date(),
      exchange: item.exchange ?? "NSE",
      name: item.name,
      symbol: item.symbol,
    };
    this._watchlist.push(record);
    return record;
  }

  async removeFromWatchlist(userId: string, id: string): Promise<void> {
    this._watchlist = this._watchlist.filter((w) => !(w.id === id && w.userId === userId));
  }

  async getPortfolioPositions(userId: string): Promise<PortfolioPosition[]> {
    return this._portfolio.filter((p) => p.userId === userId);
  }

  async addPortfolioPosition(userId: string, position: InsertPortfolio): Promise<PortfolioPosition> {
    const rec: PortfolioPosition & { userId: string } = {
      id: randomUUID(),
      userId,
      enteredAt: new Date(),
      isActive: position.isActive ?? true,
      name: position.name,
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      symbol: position.symbol,
      strategyUsed: position.strategyUsed,
      stopLoss: position.stopLoss ?? null,
      targetPrice: position.targetPrice ?? null,
    };
    this._portfolio.push(rec);
    return rec;
  }

  async deletePortfolioPosition(userId: string, id: string): Promise<void> {
    this._portfolio = this._portfolio.filter((p) => !(p.id === id && p.userId === userId));
  }

  async getSignals(limit: number = 100, strategy?: string): Promise<Signal[]> {
    let list = [...this._signals].sort(
      (a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0),
    );
    if (strategy) {
      list = list.filter((s) => s.strategy === strategy);
    }
    return list.slice(0, limit);
  }

  async addSignal(signal: InsertSignal): Promise<Signal> {
    const rec: Signal = {
      id: randomUUID(),
      createdAt: new Date(),
      details: signal.details ?? null,
      price: signal.price,
      signal: signal.signal,
      strategy: signal.strategy,
      symbol: signal.symbol,
      companyName: signal.companyName,
      target: signal.target ?? null,
    };
    this._signals.push(rec);
    return rec;
  }

  async clearSignals(): Promise<void> {
    this._signals = [];
  }

  async clearSignalsByStrategy(strategy: string): Promise<void> {
    this._signals = this._signals.filter((s) => s.strategy !== strategy);
  }

  async getLastBuySignal(symbol: string, strategy: string): Promise<Signal | null> {
    const results = [...this._signals]
      .filter((s) => s.symbol === symbol)
      .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0))
      .slice(0, 20);
    const match = results.find(
      (s) => s.strategy === strategy && s.signal === "BUY" && s.price,
    );
    return match || null;
  }

  async getTrades(userId: string, limit: number = 50): Promise<Trade[]> {
    return this._trades
      .filter((t) => t.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0))
      .slice(0, limit);
  }

  async addTrade(userId: string, trade: InsertTrade): Promise<Trade> {
    const rec: Trade & { userId: string } = {
      id: randomUUID(),
      userId,
      createdAt: new Date(),
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice ?? null,
      name: trade.name,
      pnl: trade.pnl ?? null,
      quantity: trade.quantity,
      strategy: trade.strategy,
      symbol: trade.symbol,
      type: trade.type ?? "BUY",
    };
    this._trades.push(rec);
    return rec;
  }

  _savedAnalyses: (SavedAnalysis & { userId: string })[] = [];

  async getSavedAnalyses(userId: string): Promise<SavedAnalysis[]> {
    return this._savedAnalyses
      .filter((a) => a.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
  }

  async saveAnalysis(userId: string, data: InsertSavedAnalysis): Promise<SavedAnalysis> {
    const rec: SavedAnalysis & { userId: string } = {
      id: randomUUID(),
      userId,
      createdAt: new Date(),
      generatedAt: data.generatedAt,
      picks: data.picks,
    };
    this._savedAnalyses.push(rec);
    return rec;
  }

  async deleteSavedAnalysis(userId: string, id: string): Promise<void> {
    this._savedAnalyses = this._savedAnalyses.filter((a) => !(a.id === id && a.userId === userId));
  }
}

export const storage: IStorage =
  process.env.DATABASE_URL?.startsWith("mongodb")
    ? new MongoStorage()
    : process.env.DATABASE_URL
      ? new DatabaseStorage()
      : new MemoryStorage();
