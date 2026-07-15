import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, TrendingDown, TrendingUp, AlertTriangle, Target, Shield, Search } from "lucide-react";
import { useEffect } from "react";

function SignalBadge({ signal }: { signal: string }) {
  if (signal === "BUY") return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs">BUY</Badge>;
  if (signal === "SELL") return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs">SELL</Badge>;
  return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs">HOLD</Badge>;
}

function LotBar({ activeLots }: { activeLots: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7].map(lot => (
        <div key={lot} className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm text-[8px] flex items-center justify-center font-bold ${lot <= activeLots ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
          {lot}
        </div>
      ))}
    </div>
  );
}

export default function StrategyNiftyShop() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [totalCapital, setTotalCapital] = useState(200000);
  const [universe, setUniverse] = useState<"ALL" | "NIFTY50" | "NEXT50">("ALL");
  const [sheetView, setSheetView] = useState(false);

  const { data: signals, isLoading: isLoadingSignals } = useQuery<any[]>({
    queryKey: ["/api/signals", "nifty-shop"],
    queryFn: () => fetch("/api/signals?limit=200&strategy=nifty-shop").then(r => r.json()),
  });

  const { data: positions, isLoading: isLoadingPos } = useQuery<any[]>({
    queryKey: ["/api/portfolio"],
    queryFn: () => fetch("/api/portfolio").then(r => r.json()),
  });

  const shopPositions = positions?.filter((p: any) => p.isActive && p.strategyUsed === "nifty-shop") || [];
  const capitalUsed = shopPositions.reduce((acc, p) => acc + (p.averagePrice * p.quantity), 0);
  const unrealizedProfit = shopPositions.reduce((acc, p) => acc + (p.pnl || 0), 0);
  const availableCapital = totalCapital - capitalUsed;

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/nifty-shop", { totalCapital });
      const result = await response.json();
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "nifty-shop"] });
      toast({ title: "Nifty Shop Scan Complete", description: `Scanned ${result.total_scanned} stocks` });
    } catch (error: any) {
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  }

  // Auto-run scan on first load
  useEffect(() => {
    if (!scanResult && !isScanning) {
      handleScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasScannedData = scanResult?.all_results?.length > 0;
  let dataSource = hasScannedData ? scanResult.all_results : [];
  if (universe !== "ALL") {
    dataSource = dataSource.filter((r: any) => r.index === universe);
  }
  if (sheetView) {
    dataSource = dataSource
      .filter((r: any) => r.signal === "BUY" || r.averageSignal)
      .sort((a: any, b: any) => (a.rsi ?? 999) - (b.rsi ?? 999));
  }

  const totalScanned = scanResult?.total_scanned || 0;
  const buyZoneCount = scanResult?.buy_zone || 0;
  const sellZoneCount = scanResult?.sell_zone || 0;
  const neutralCount = totalScanned - buyZoneCount - sellZoneCount;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">RSI Nifty Shop</h2>
            <p className="text-sm text-muted-foreground mt-1">Mean-Reversion Strategy — Nifty 50 + Next 50</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Capital:</span>
              <input type="number" value={totalCapital} onChange={e => setTotalCapital(+e.target.value)} className="w-24 sm:w-28 h-8 text-xs border rounded px-2 bg-background" />
            </div>
          <div className="flex items-center gap-2">
            <select value={universe} onChange={e => setUniverse(e.target.value as any)} className="h-8 text-xs border rounded px-2 bg-background">
              <option value="ALL">All (Nifty 100)</option>
              <option value="NIFTY50">Nifty 50</option>
              <option value="NEXT50">Next 50</option>
            </select>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={sheetView} onChange={e => setSheetView(e.target.checked)} />
              Sheet View
            </label>
          </div>
            <Button onClick={handleScan} disabled={isScanning} size="sm">
              {isScanning ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Scanning...</> : <><Search className="w-4 h-4 mr-1" />Analyze Market</>}
            </Button>
          </div>
        </div>

        {/* Strategy Rules Section (from Screenshot) */}
        <div className="rounded-xl border bg-card/30 p-4 sm:p-5">
          <h3 className="font-semibold text-sm mb-4">Strategy Rules</h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            <div className="flex items-start gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20 font-bold text-[10px]">1</span>
              <span>Buy Ladder: RSI &lt; 35 = Lot 1, RSI &lt; 30 = Lot 2, ..., RSI &lt; 10 = Lot 6</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20 font-bold text-[10px]">2</span>
              <span>Sell Ladder: RSI &gt; 65 = Lot 1, RSI &gt; 70 = Lot 2, ..., RSI &gt; 90 = Lot 6</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20 font-bold text-[10px]">3</span>
              <span>Cycle resets when RSI crosses 50 (middle ground)</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20 font-bold text-[10px]">4</span>
              <span>Apply to Nifty 100 stocks (Nifty 50 + Next 50)</span>
            </div>
          </div>
        </div>

        {/* Buy & Sell Ladders (from Screenshot) */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Buy Ladder */}
          <div className="rounded-xl border border-green-500/20 bg-green-500/[0.02] p-4">
            <h4 className="text-green-500 font-semibold text-sm mb-4">Buy Ladder</h4>
            <div className="space-y-2">
              {[
                { label: "L1", rsi: "RSI < 35", lot: "Lot 1" },
                { label: "L2", rsi: "RSI < 30", lot: "Lot 2" },
                { label: "L3", rsi: "RSI < 25", lot: "Lot 3" },
                { label: "L4", rsi: "RSI < 20", lot: "Lot 4" },
                { label: "L5", rsi: "RSI < 15", lot: "Lot 5" },
                { label: "L6", rsi: "RSI < 10", lot: "Lot 6" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-green-500/[0.05] border border-green-500/10">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center text-[10px] font-bold">{item.label}</span>
                    <span className="text-xs font-medium">{item.rsi}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.lot}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sell Ladder */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] p-4">
            <h4 className="text-red-500 font-semibold text-sm mb-4">Sell Ladder</h4>
            <div className="space-y-2">
              {[
                { label: "L1", rsi: "RSI > 65", lot: "Lot 1" },
                { label: "L2", rsi: "RSI > 70", lot: "Lot 2" },
                { label: "L3", rsi: "RSI > 75", lot: "Lot 3" },
                { label: "L4", rsi: "RSI > 80", lot: "Lot 4" },
                { label: "L5", rsi: "RSI > 85", lot: "Lot 5" },
                { label: "L6", rsi: "RSI > 90", lot: "Lot 6" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/[0.05] border border-red-500/10">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-600 flex items-center justify-center text-[10px] font-bold">{item.label}</span>
                    <span className="text-xs font-medium">{item.rsi}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.lot}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 border-t pt-6">
          <div className="rounded-xl border bg-card p-4">
            <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Total Capital</div>
            <div className="text-xl font-bold">₹{totalCapital.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Used Capital</div>
            <div className="text-xl font-bold text-blue-500">₹{capitalUsed.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Available</div>
            <div className="text-xl font-bold text-green-500">₹{availableCapital.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">PNL</div>
            <div className={`text-xl font-bold ${unrealizedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>₹{unrealizedProfit.toLocaleString()}</div>
          </div>
        </div>

        {/* Market Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="font-semibold text-sm tracking-tight">Strategy Execution - Live Signals</h3>
            <Badge variant="outline" className="text-[10px]">{dataSource.length} Stocks</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left rows-cv">
              <thead>
                <tr className="border-b bg-muted/20 text-muted-foreground uppercase tracking-wider">
                  <th className="p-3 font-semibold">Symbol</th>
                  <th className="p-3 text-right font-semibold">Price</th>
                  <th className="p-3 text-right font-semibold">RSI</th>
                  <th className="p-3 font-semibold">Zone</th>
                  <th className="p-3 font-semibold">When Buy</th>
                </tr>
              </thead>
              <tbody>
                {dataSource
                  .slice()
                  .sort((a: any, b: any) => {
                    const as = (a.recommendScore ?? 0);
                    const bs = (b.recommendScore ?? 0);
                    return bs - as || (a.rsi ?? 999) - (b.rsi ?? 999);
                  })
                  .map((r: any, idx: number) => (
                  <tr key={idx} className={`border-b border-border/50 hover:bg-muted/10 transition-colors ${r.recoveryMode ? "bg-red-500/[0.03]" : ""}`}>
                    <td className="p-3 font-bold text-blue-600">
                      {r.symbol.replace(".NS", "")}
                    </td>
                    <td className="p-3 text-right tabular-nums">₹{r.price.toLocaleString()}</td>
                    <td className={`p-3 text-right font-bold tabular-nums ${r.rsi < 35 ? "text-green-600" : r.rsi > 65 ? "text-red-500" : ""}`}>
                      {r.rsi}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${r.rsi < 35 ? "bg-green-500/10 text-green-600" : r.rsi > 65 ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"}`}>
                        {r.zone}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-[10px]">
                        {r.signal === "BUY" && !r.averageSignal ? "Now (New)" : r.averageSignal ? "Now (Avg)" : r.nextBuyLevel ? `RSI ≤ ${r.nextBuyLevel}` : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!hasScannedData && !isLoadingSignals && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground italic">
                      Initialize analysis to generate live strategy signals
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Summary Stats (from Screenshot) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-muted/20 p-6 text-center">
            <div className="text-xs text-muted-foreground mb-1 font-medium">Stocks Scanned</div>
            <div className="text-3xl font-bold">{totalScanned || "—"}</div>
          </div>
          <div className="rounded-xl border bg-green-500/[0.03] border-green-500/20 p-6 text-center">
            <div className="text-xs text-green-600 mb-1 font-bold">Buy Zone</div>
            <div className="text-3xl font-bold text-green-600">{buyZoneCount || "—"}</div>
            <div className="text-[9px] text-green-500 mt-1">RSI &lt; 35</div>
          </div>
          <div className="rounded-xl border bg-red-500/[0.03] border-red-500/20 p-6 text-center">
            <div className="text-xs text-red-600 mb-1 font-bold">Sell Zone</div>
            <div className="text-3xl font-bold text-red-600">{sellZoneCount || "—"}</div>
            <div className="text-[9px] text-red-500 mt-1">RSI &gt; 65</div>
          </div>
          <div className="rounded-xl border bg-yellow-500/[0.03] border-yellow-500/20 p-6 text-center">
            <div className="text-xs text-yellow-600 mb-1 font-bold">Neutral</div>
            <div className="text-3xl font-bold text-yellow-600">{neutralCount || "—"}</div>
            <div className="text-[9px] text-yellow-500 mt-1">35 - 65</div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
