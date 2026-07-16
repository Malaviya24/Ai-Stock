import { storage } from "./storage";
import { log } from "./index";

const DEFAULT_WATCHLIST = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", exchange: "NSE" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", exchange: "NSE" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", exchange: "NSE" },
  { symbol: "INFY.NS", name: "Infosys", exchange: "NSE" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank", exchange: "NSE" },
];

export async function seedDatabase() {
  try {
    // Seed under the "local" pseudo-user (used when Clerk is disabled, and
    // as a sensible default watchlist for demo purposes either way).
    const existing = await storage.getWatchlist("local");
    if (existing.length > 0) {
      log("Watchlist already has items, skipping seed", "seed");
      return;
    }

    for (const item of DEFAULT_WATCHLIST) {
      await storage.addToWatchlist("local", item);
    }

    log(`Seeded watchlist with ${DEFAULT_WATCHLIST.length} stocks`, "seed");
  } catch (error: any) {
    log(`Error seeding database: ${error.message}`, "seed");
  }
}
