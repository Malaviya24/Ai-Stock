
import mongoose, { Schema, Document } from "mongoose";
import {
  type WatchlistItem,
  type InsertWatchlist,
  type PortfolioPosition,
  type InsertPortfolio,
  type Signal,
  type InsertSignal,
  type Trade,
  type InsertTrade,
} from "@shared/schema";
import { IStorage } from "./storage";
import { randomUUID } from "crypto";
import { log } from "./index";

// Schemas
const WatchlistSchema = new Schema({
  id: { type: String, default: () => randomUUID() },
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  exchange: { type: String, default: "NSE" },
  addedAt: { type: Date, default: Date.now },
});

const PortfolioSchema = new Schema({
  id: { type: String, default: () => randomUUID() },
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  entryPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  strategyUsed: { type: String, required: true },
  targetPrice: Number,
  stopLoss: Number,
  isActive: { type: Boolean, default: true },
  enteredAt: { type: Date, default: Date.now },
});

const SignalSchema = new Schema({
  id: { type: String, default: () => randomUUID() },
  symbol: { type: String, required: true },
  companyName: { type: String, required: true },
  strategy: { type: String, required: true },
  signal: { type: String, required: true },
  price: { type: Number, required: true },
  target: Number,
  details: String,
  createdAt: { type: Date, default: Date.now },
});

const TradeSchema = new Schema({
  id: { type: String, default: () => randomUUID() },
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  entryPrice: { type: Number, required: true },
  exitPrice: Number,
  pnl: Number,
  strategy: { type: String, required: true },
  type: { type: String, default: "BUY" },
  createdAt: { type: Date, default: Date.now },
});

// Models
const WatchlistModel = mongoose.model("Watchlist", WatchlistSchema);
const PortfolioModel = mongoose.model("Portfolio", PortfolioSchema);
const SignalModel = mongoose.model("Signal", SignalSchema);
const TradeModel = mongoose.model("Trade", TradeSchema);

export class MongoStorage implements IStorage {
  constructor() {
    this.connect();
  }

  async connect() {
    try {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined");
      }
      await mongoose.connect(process.env.DATABASE_URL);
      log("Connected to MongoDB", "mongo");
    } catch (err: any) {
      log(`MongoDB connection error: ${err.message}`, "mongo");
    }
  }

  async getWatchlist(): Promise<WatchlistItem[]> {
    const items = await WatchlistModel.find().lean();
    return items.map(this.mapWatchlist);
  }

  async addToWatchlist(item: InsertWatchlist): Promise<WatchlistItem> {
    const doc = await WatchlistModel.create(item);
    return this.mapWatchlist(doc.toObject());
  }

  async removeFromWatchlist(id: string): Promise<void> {
    await WatchlistModel.deleteOne({ id });
  }

  async getPortfolioPositions(): Promise<PortfolioPosition[]> {
    const items = await PortfolioModel.find().lean();
    return items.map(this.mapPortfolio);
  }

  async addPortfolioPosition(position: InsertPortfolio): Promise<PortfolioPosition> {
    const doc = await PortfolioModel.create(position);
    return this.mapPortfolio(doc.toObject());
  }

  async deletePortfolioPosition(id: string): Promise<void> {
    await PortfolioModel.deleteOne({ id });
  }

  async getSignals(limit: number = 100, strategy?: string): Promise<Signal[]> {
    const query = strategy ? { strategy } : {};
    const items = await SignalModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return items.map(this.mapSignal);
  }

  async addSignal(signal: InsertSignal): Promise<Signal> {
    const doc = await SignalModel.create(signal);
    return this.mapSignal(doc.toObject());
  }

  async clearSignals(): Promise<void> {
    await SignalModel.deleteMany({});
  }

  async clearSignalsByStrategy(strategy: string): Promise<void> {
    await SignalModel.deleteMany({ strategy });
  }

  async getLastBuySignal(symbol: string, strategy: string): Promise<Signal | null> {
    const doc = await SignalModel.findOne({
      symbol,
      strategy,
      signal: "BUY",
      price: { $exists: true },
    })
      .sort({ createdAt: -1 })
      .lean();
    return doc ? this.mapSignal(doc) : null;
  }

  async getTrades(limit: number = 50): Promise<Trade[]> {
    const items = await TradeModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return items.map(this.mapTrade);
  }

  async addTrade(trade: InsertTrade): Promise<Trade> {
    const doc = await TradeModel.create(trade);
    return this.mapTrade(doc.toObject());
  }

  // Mappers to match Shared Schema types
  private mapWatchlist(doc: any): WatchlistItem {
    return {
      id: doc.id,
      symbol: doc.symbol,
      name: doc.name,
      exchange: doc.exchange,
      addedAt: doc.addedAt,
    };
  }

  private mapPortfolio(doc: any): PortfolioPosition {
    return {
      id: doc.id,
      symbol: doc.symbol,
      name: doc.name,
      entryPrice: doc.entryPrice,
      quantity: doc.quantity,
      strategyUsed: doc.strategyUsed,
      targetPrice: doc.targetPrice || null,
      stopLoss: doc.stopLoss || null,
      isActive: doc.isActive,
      enteredAt: doc.enteredAt,
    };
  }

  private mapSignal(doc: any): Signal {
    return {
      id: doc.id,
      symbol: doc.symbol,
      companyName: doc.companyName,
      strategy: doc.strategy,
      signal: doc.signal,
      price: doc.price,
      target: doc.target || null,
      details: doc.details || null,
      createdAt: doc.createdAt,
    };
  }

  private mapTrade(doc: any): Trade {
    return {
      id: doc.id,
      symbol: doc.symbol,
      name: doc.name,
      quantity: doc.quantity,
      entryPrice: doc.entryPrice,
      exitPrice: doc.exitPrice || null,
      pnl: doc.pnl || null,
      strategy: doc.strategy,
      type: doc.type,
      createdAt: doc.createdAt,
    };
  }
}
