import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";
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
  getWatchlist(): Promise<WatchlistItem[]>;
  addToWatchlist(item: InsertWatchlist): Promise<WatchlistItem>;
  removeFromWatchlist(id: string): Promise<void>;
  getPortfolioPositions(): Promise<PortfolioPosition[]>;
  addPortfolioPosition(position: InsertPortfolio): Promise<PortfolioPosition>;
  deletePortfolioPosition(id: string): Promise<void>;
  getSignals(limit?: number, strategy?: string): Promise<Signal[]>;
  addSignal(signal: InsertSignal): Promise<Signal>;
  clearSignals(): Promise<void>;
  clearSignalsByStrategy(strategy: string): Promise<void>;
  getLastBuySignal(symbol: string, strategy: string): Promise<Signal | null>;
  getTrades(limit?: number): Promise<Trade[]>;
  addTrade(trade: InsertTrade): Promise<Trade>;
}

export class DatabaseStorage implements IStorage {
  async getWatchlist(): Promise<WatchlistItem[]> {
    return db.select().from(watchlistItems);
  }

  async addToWatchlist(item: InsertWatchlist): Promise<WatchlistItem> {
    const [result] = await db.insert(watchlistItems).values(item).returning();
    return result;
  }

  async removeFromWatchlist(id: string): Promise<void> {
    await db.delete(watchlistItems).where(eq(watchlistItems.id, id));
  }

  async getPortfolioPositions(): Promise<PortfolioPosition[]> {
    return db.select().from(portfolioPositions);
  }

  async addPortfolioPosition(position: InsertPortfolio): Promise<PortfolioPosition> {
    const [result] = await db.insert(portfolioPositions).values(position).returning();
    return result;
  }

  async deletePortfolioPosition(id: string): Promise<void> {
    await db.delete(portfolioPositions).where(eq(portfolioPositions.id, id));
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

  async getTrades(limit: number = 50): Promise<Trade[]> {
    return db.select().from(trades).orderBy(desc(trades.createdAt)).limit(limit);
  }

  async addTrade(trade: InsertTrade): Promise<Trade> {
    const [result] = await db.insert(trades).values(trade).returning();
    return result;
  }
}

class MemoryStorage implements IStorage {
  _watchlist: WatchlistItem[] = [];
  _portfolio: PortfolioPosition[] = [];
  _signals: Signal[] = [];
  _trades: Trade[] = [];

  async getWatchlist(): Promise<WatchlistItem[]> {
    return [...this._watchlist];
  }

  async addToWatchlist(item: InsertWatchlist): Promise<WatchlistItem> {
    const record: WatchlistItem = {
      id: randomUUID(),
      addedAt: new Date(),
      exchange: item.exchange ?? "NSE",
      name: item.name,
      symbol: item.symbol,
    };
    this._watchlist.push(record);
    return record;
  }

  async removeFromWatchlist(id: string): Promise<void> {
    this._watchlist = this._watchlist.filter((w) => w.id !== id);
  }

  async getPortfolioPositions(): Promise<PortfolioPosition[]> {
    return [...this._portfolio];
  }

  async addPortfolioPosition(position: InsertPortfolio): Promise<PortfolioPosition> {
    const rec: PortfolioPosition = {
      id: randomUUID(),
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

  async deletePortfolioPosition(id: string): Promise<void> {
    this._portfolio = this._portfolio.filter((p) => p.id !== id);
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

  async getTrades(limit: number = 50): Promise<Trade[]> {
    return [...this._trades]
      .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0))
      .slice(0, limit);
  }

  async addTrade(trade: InsertTrade): Promise<Trade> {
    const rec: Trade = {
      id: randomUUID(),
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
}

export const storage: IStorage =
  process.env.DATABASE_URL?.startsWith("mongodb")
    ? new MongoStorage()
    : process.env.DATABASE_URL
      ? new DatabaseStorage()
      : new MemoryStorage();
