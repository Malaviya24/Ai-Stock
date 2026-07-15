import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";

function RsiValueBadge({ rsi }: { rsi: number }) {
  if (rsi < 35) {
    return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-xs"><TrendingDown className="w-3 h-3 mr-1" />{rsi.toFixed(1)}</Badge>;
  }
  if (rsi > 65) {
    return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-xs"><TrendingUp className="w-3 h-3 mr-1" />{rsi.toFixed(1)}</Badge>;
  }
  return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-xs">{rsi.toFixed(1)}</Badge>;
}

function ActionBadge({ action }: { action: string }) {
  if (action.startsWith("Buy")) {
    return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-xs"><TrendingDown className="w-3 h-3 mr-1" />{action}</Badge>;
  }
  if (action.startsWith("Sell")) {
    return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-xs"><TrendingUp className="w-3 h-3 mr-1" />{action}</Badge>;
  }
  return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-xs">{action}</Badge>;
}

export default function StrategyRsiLadder() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "rsi-ladder"],
    queryFn: () => fetch("/api/signals?limit=200&strategy=rsi-ladder").then(r => r.json()),
  });

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/rsi-ladder");
      const result = await response.json();
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "rsi-ladder"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "RSI Ladder Scan Complete",
        description: result.message || "Scan finished",
      });
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message || "An error occurred while scanning.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }

  const buyZoneSignals = signals?.filter(s => s.signal === "BUY") ?? [];
  const sellZoneSignals = signals?.filter(s => s.signal === "SELL") ?? [];
  const neutralSignals = signals?.filter(s => s.signal === "WATCH") ?? [];

  const buyLevels = [
    { level: 1, threshold: 35, label: "RSI < 35" },
    { level: 2, threshold: 30, label: "RSI < 30" },
    { level: 3, threshold: 25, label: "RSI < 25" },
    { level: 4, threshold: 20, label: "RSI < 20" },
    { level: 5, threshold: 15, label: "RSI < 15" },
    { level: 6, threshold: 10, label: "RSI < 10" },
  ];

  const sellLevels = [
    { level: 1, threshold: 65, label: "RSI > 65" },
    { level: 2, threshold: 70, label: "RSI > 70" },
    { level: 3, threshold: 75, label: "RSI > 75" },
    { level: 4, threshold: 80, label: "RSI > 80" },
    { level: 5, threshold: 85, label: "RSI > 85" },
    { level: 6, threshold: 90, label: "RSI > 90" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">RSI Ladder Strategy</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              6-level buy/sell ladder for Nifty 50 — accumulate on RSI drops below 35/30/25/20/15/10, distribute on RSI rises above 65/70/75/80/85/90.
            </p>
          </div>
          <Button
            onClick={handleScan}
            disabled={isScanning}
            data-testid="button-scan-rsi"
            className="w-full sm:w-auto shrink-0"
            size="lg"
          >
            {isScanning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
            ) : (
              <>Run RSI Scan</>
            )}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-3">Strategy Rules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {[
              "Buy Ladder: RSI < 35 = Lot 1, RSI < 30 = Lot 2, ..., RSI < 10 = Lot 6",
              "Sell Ladder: RSI > 65 = Lot 1, RSI > 70 = Lot 2, ..., RSI > 90 = Lot 6",
              "Cycle resets when RSI crosses 50 (middle ground)",
              "Apply only to Nifty 50 stocks",
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] sm:text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <div className="text-xs sm:text-sm">{rule}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-card border border-green-500/20 rounded-xl p-4 sm:p-5">
            <h2 className="font-semibold text-sm sm:text-base mb-3 text-green-500">Buy Ladder</h2>
            <div className="space-y-2">
              {buyLevels.map((item) => (
                <div key={item.level} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-green-500">L{item.level}</span>
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Lot {item.level}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-red-500/20 rounded-xl p-4 sm:p-5">
            <h2 className="font-semibold text-sm sm:text-base mb-3 text-red-500">Sell Ladder</h2>
            <div className="space-y-2">
              {sellLevels.map((item) => (
                <div key={item.level} className="flex items-center justify-between p-3 bg-gradient-to-r from-red-500/10 to-red-500/5 rounded-lg border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-red-500">L{item.level}</span>
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Lot {item.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Stocks Scanned</div>
            <div className="text-base sm:text-xl font-bold" data-testid="text-stocks-scanned">{scanResult?.total_scanned ?? signals?.length ?? "—"}</div>
          </div>
          <div className="bg-card border border-green-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-green-500 mb-1">Buy Zone</div>
            <div className="text-base sm:text-xl font-bold text-green-500" data-testid="text-buy-zone">{buyZoneSignals.length}</div>
            <div className="text-[8px] sm:text-[10px] text-green-500/70">RSI &lt; 35</div>
          </div>
          <div className="bg-card border border-red-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-red-500 mb-1">Sell Zone</div>
            <div className="text-base sm:text-xl font-bold text-red-500" data-testid="text-sell-zone">{sellZoneSignals.length}</div>
            <div className="text-[8px] sm:text-[10px] text-red-500/70">RSI &gt; 65</div>
          </div>
          <div className="bg-card border border-yellow-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-yellow-500 mb-1">Neutral</div>
            <div className="text-base sm:text-xl font-bold text-yellow-500" data-testid="text-neutral">{neutralSignals.length}</div>
            <div className="text-[8px] sm:text-[10px] text-yellow-500/70">35-65</div>
          </div>
        </div>


        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3" data-testid="text-results-heading">RSI Ladder Results</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {isLoading && !signals ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading signals...</div>
            ) : !signals?.length ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">No signals yet. Click "Run RSI Scan" to analyze Nifty 50 stocks.</div>
            ) : (
              <>
                <div className="block sm:hidden divide-y divide-border">
                  {signals.map((sig, i) => (
                    <div key={sig.id || i} className="p-3 space-y-1.5" data-testid={`card-rsi-signal-${sig.id || i}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{sig.symbol.replace(".NS", "")}</div>
                          <div className="text-[10px] text-muted-foreground">{sig.companyName}</div>
                        </div>
                        <RsiValueBadge rsi={sig.price || 0} />
                      </div>
                      <div className="flex items-center gap-2">
                        <ActionBadge action={sig.details?.split(" | ")[1] || "Hold"} />
                        {sig.details?.includes("Above 200DMA") && (
                          <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-500">Above 200DMA</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Buy Lots: <span className="font-mono text-foreground">{sig.details?.match(/Buy Lots Active: (\d+)/)?.[1] || "—"}</span></span>
                        <span>Sell Lots: <span className="font-mono text-foreground">{sig.details?.match(/Sell Lots Active: (\d+)/)?.[1] || "—"}</span></span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm rows-cv" data-testid="table-rsi-results">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">RSI</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Action</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Buy Lots</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Sell Lots</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Next Levels</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signals.map((sig, i) => {
                        const rsiValue = parseFloat(sig.details?.match(/RSI: ([\d.]+)/)?.[1] || "50");
                        const action = sig.details?.split(" | ")[1] || "Hold";
                        const buyLots = sig.details?.match(/Buy Lots Active: (\d+)/)?.[1] || "0";
                        const sellLots = sig.details?.match(/Sell Lots Active: (\d+)/)?.[1] || "0";
                        const aboveDma = sig.details?.includes("Above 200DMA");
                        const nextBuy = sig.details?.match(/Next Buy: ([^\|]+)/)?.[1]?.trim() || "None";
                        const nextSell = sig.details?.match(/Next Sell: ([^\|]+)/)?.[1]?.trim() || "None";

                        return (
                          <tr key={sig.id || i} className="border-b border-border last:border-0" data-testid={`row-rsi-${sig.symbol}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium">{sig.symbol.replace(".NS", "")}</div>
                              <div className="text-xs text-muted-foreground">{sig.companyName}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <RsiValueBadge rsi={rsiValue} />
                            </td>
                            <td className="px-4 py-3">
                              <ActionBadge action={action} />
                            </td>
                            <td className="px-4 py-3 text-right font-mono">{buyLots}</td>
                            <td className="px-4 py-3 text-right font-mono">{sellLots}</td>
                            <td className="px-4 py-3">
                              {aboveDma ? (
                                <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-500">Above 200DMA</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-500">Below 200DMA</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground max-w-[250px]">
                              <div className="text-xs">Buy: {nextBuy}</div>
                              <div className="text-xs">Sell: {nextSell}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold text-sm sm:text-base mb-3">Cycle Reset Rules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {[
              { title: "Buy Cycle", desc: "Resets when RSI crosses above 50 (exit accumulation)" },
              { title: "Sell Cycle", desc: "Resets when RSI crosses below 50 (exit distribution)" },
              { title: "Lot Sizing", desc: "Each lot represents equal capital allocation" },
              { title: "Risk Management", desc: "Always exit distribution on cycle reset confirmation" },
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold text-primary">✓</span>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-medium">{rule.title}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{rule.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-[10px] sm:text-xs text-muted-foreground">
          Educational purposes only. Not financial advice. RSI Ladder Trading requires disciplined position management across multiple entry/exit levels. Results based on end-of-day data from Yahoo Finance.
        </div>
      </div>
    </DashboardLayout>
  );
}
