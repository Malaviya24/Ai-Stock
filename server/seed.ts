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
    const existing = await storage.getWatchlist();
    if (existing.length > 0) {
      log("Watchlist already has items, skipping seed", "seed");
      return;
    }

    for (const item of DEFAULT_WATCHLIST) {
      await storage.addToWatchlist(item);
    }

    log(`Seeded watchlist with ${DEFAULT_WATCHLIST.length} stocks`, "seed");
  } catch (error: any) {
    log(`Error seeding database: ${error.message}`, "seed");
  }
}
