import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Turtle, TrendingDown, Target, AlertCircle } from "lucide-react";

// Helper function to normalize data from scanResult or signals
function normalizeItem(item: any) {
  return {
    id: item.id || item.symbol,
    symbol: item.symbol,
    name: item.name || item.companyName || "ETF",
    price: item.price || item.currentPrice,
    signal: item.signal,
    // ScanResult fields
    weeklyCandle: item.weeklyCandle,
    bearishWeeksLast12: item.bearishWeeksLast12,
    simAvgPrice: item.simAvgPrice,
    target3pct: item.target3pct,
    rsi: item.rsi,
    // Signals fallback fields
    companyName: item.companyName,
    target: item.target,
    details: item.details,
    // Status for old signals
    status: item.status,
  };
}

function StatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase();
  if (upper === "ACCUMULATE") {
    return (
      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs">
        <TrendingDown className="w-3 h-3 mr-1" />
        ACCUMULATE
      </Badge>
    );
  }
  if (upper === "TARGET HIT") {
    return (
      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] sm:text-xs">
        <Target className="w-3 h-3 mr-1" />
        TARGET HIT
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs">
      <AlertCircle className="w-3 h-3 mr-1" />
      WAITING
    </Badge>
  );
}

function CandleTypeBadge({ type }: { type: string }) {
  const upper = type?.toUpperCase() || "";
  if (upper === "BEARISH") {
    return (
      <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs">
        Bearish
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs">
      Bullish
    </Badge>
  );
}

function CapitalSlots({ parts = 12, filled = 0 }: { parts?: number; filled?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: parts }).map((_, i) => (
        <div
          key={i}
          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-sm border border-border flex items-center justify-center text-[10px] font-semibold ${
            i < filled
              ? "bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}

export default function StrategyWeeklyETF() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "weekly-etf"],
    queryFn: () =>
      fetch("/api/signals?limit=200&strategy=weekly-etf").then((r) => r.json()),
  });

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/weekly-etf");
      const result = await response.json();
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "weekly-etf"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Weekly ETF Scan Complete",
        description: result.message || "Scan finished successfully",
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

  // Use scanResult when available, fall back to signals
  const allResults = scanResult?.all_results || signals || [];
  const accumulateSignals = allResults.filter((s: any) => s.signal === "BUY") ?? [];
  const targetHitSignals = allResults.filter((s: any) => s.signal === "SELL") ?? [];
  const waitingSignals = allResults.filter((s: any) => s.signal === "WATCH") ?? [];

  const totalScanned = scanResult?.total_scanned ?? scanResult?.accumulate ?? signals?.length ?? 0;
  const accumulateCount = scanResult?.accumulate ?? accumulateSignals.length ?? 0;
  const targetHitCount = scanResult?.target_hit ?? targetHitSignals.length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3">
            <Turtle className="w-6 h-6 sm:w-7 sm:h-7 text-primary mt-1 shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">
                Weekly ETF Contrarian
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                Accumulate ETFs on bearish weekly candles, book at 3% above average price. 12-part capital control, no stop
                loss.
              </p>
            </div>
          </div>
          <Button
            onClick={handleScan}
            disabled={isScanning}
            data-testid="button-scan-weekly"
            className="w-full sm:w-auto shrink-0"
            size="lg"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning ETFs...
              </>
            ) : (
              <>
                <Turtle className="w-4 h-4 mr-2" />
                Run Weekly Scan
              </>
            )}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-3">Strategy Rules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {[
              "Buy only on bearish weekly candles (contrarian buying)",
              "12-part capital allocation (max 12 installments per ETF)",
              "Exit at 3% above average price (target booking)",
              "No stop loss — hold until target or capital exhausted",
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">ETFs Scanned</div>
            <div className="text-base sm:text-xl font-bold" data-testid="text-etfs-scanned">
              {totalScanned}
            </div>
          </div>
          <div className="bg-card border border-green-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-green-500 mb-1">Accumulate</div>
            <div className="text-base sm:text-xl font-bold text-green-500" data-testid="text-accumulate-count">
              {accumulateCount}
            </div>
          </div>
          <div className="bg-card border border-blue-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-blue-500 mb-1">Target Hit</div>
            <div className="text-base sm:text-xl font-bold text-blue-500" data-testid="text-target-count">
              {targetHitCount}
            </div>
          </div>
          <div className="bg-card border border-yellow-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-yellow-500 mb-1">Waiting</div>
            <div className="text-base sm:text-xl font-bold text-yellow-500" data-testid="text-waiting-count">
              {waitingSignals.length}
            </div>
          </div>
        </div>


        {accumulateSignals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              <h2 className="text-base sm:text-lg font-semibold text-green-500">
                Accumulate ({accumulateCount})
              </h2>
            </div>
            <div className="bg-card border border-green-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {accumulateSignals.map((item: any, i: number) => {
                  const norm = normalizeItem(item);
                  const isScanResult = !!norm.weeklyCandle;
                  return (
                    <div key={norm.id} className="p-3 space-y-1.5" data-testid={`card-accumulate-${norm.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{norm.symbol}</div>
                          <div className="text-[10px] text-muted-foreground">{norm.name}</div>
                        </div>
                        {isScanResult && (
                          <div className="flex items-center gap-1.5">
                            <CandleTypeBadge type={norm.weeklyCandle} />
                          </div>
                        )}
                      </div>
                      {isScanResult ? (
                        <>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              Avg Price: <span className="font-mono text-foreground">₹{Number(norm.simAvgPrice).toFixed(2)}</span>
                            </span>
                            <span>
                              Target: <span className="font-mono text-green-500">₹{Number(norm.target3pct).toFixed(2)}</span>
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Bearish Weeks: <span className="font-semibold text-foreground">{norm.bearishWeeksLast12}/12</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Current: <span className="font-mono text-foreground">₹{Number(norm.price).toFixed(2)}</span> | RSI:{" "}
                            <span className="font-semibold">{Number(norm.rsi).toFixed(1)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              Price: <span className="font-mono text-foreground">₹{Number(norm.price).toFixed(2)}</span>
                            </span>
                            <span>
                              Target: <span className="font-mono text-green-500">₹{Number(norm.target).toFixed(2)}</span>
                            </span>
                          </div>
                          {norm.details && (
                            <div className="text-xs text-muted-foreground">{norm.details}</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-accumulate-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                      {accumulateSignals.length > 0 && normalizeItem(accumulateSignals[0]).weeklyCandle && (
                        <>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Candle Type</th>
                          <th className="text-center px-4 py-3 text-muted-foreground font-medium">Bearish Weeks</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Avg Price</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">3% Target</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Current Price</th>
                          <th className="text-center px-4 py-3 text-muted-foreground font-medium">RSI</th>
                        </>
                      )}
                      {accumulateSignals.length > 0 && !normalizeItem(accumulateSignals[0]).weeklyCandle && (
                        <>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Price</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Target</th>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Details</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {accumulateSignals.map((item: any) => {
                      const norm = normalizeItem(item);
                      const isScanResult = !!norm.weeklyCandle;
                      return (
                        <tr key={norm.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-medium">{norm.symbol}</div>
                            <div className="text-xs text-muted-foreground">{norm.name}</div>
                          </td>
                          {isScanResult ? (
                            <>
                              <td className="px-4 py-3">
                                <CandleTypeBadge type={norm.weeklyCandle} />
                              </td>
                              <td className="px-4 py-3 text-center font-semibold">
                                {norm.bearishWeeksLast12}/{12}
                              </td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(norm.simAvgPrice).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono text-green-500">₹{Number(norm.target3pct).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(norm.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-center">{Number(norm.rsi).toFixed(1)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(norm.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(norm.target).toFixed(2)}</td>
                              <td className="px-4 py-3 text-left text-muted-foreground">{norm.details || "-"}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {targetHitSignals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              <h2 className="text-base sm:text-lg font-semibold text-blue-500">
                Target Hit ({targetHitCount})
              </h2>
            </div>
            <div className="bg-card border border-blue-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {targetHitSignals.map((item: any) => {
                  const norm = normalizeItem(item);
                  const isScanResult = !!norm.weeklyCandle;
                  return (
                    <div key={norm.id} className="p-3 space-y-1.5" data-testid={`card-target-${norm.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{norm.symbol}</div>
                          <div className="text-[10px] text-muted-foreground">{norm.name}</div>
                        </div>
                      </div>
                      {isScanResult ? (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            Avg Price: <span className="font-mono text-foreground">₹{Number(norm.simAvgPrice).toFixed(2)}</span>
                          </span>
                          <span>
                            Target: <span className="font-mono text-blue-500">₹{Number(norm.target3pct).toFixed(2)}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            Price: <span className="font-mono text-foreground">₹{Number(norm.price).toFixed(2)}</span>
                          </span>
                          <span>
                            Target: <span className="font-mono text-blue-500">₹{Number(norm.target).toFixed(2)}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-target-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                      {targetHitSignals.length > 0 && normalizeItem(targetHitSignals[0]).weeklyCandle ? (
                        <>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Avg Price</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">3% Target</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Current Price</th>
                        </>
                      ) : (
                        <>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Price</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Target</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {targetHitSignals.map((item: any) => {
                      const norm = normalizeItem(item);
                      const isScanResult = !!norm.weeklyCandle;
                      return (
                        <tr key={norm.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-medium">{norm.symbol}</div>
                            <div className="text-xs text-muted-foreground">{norm.name}</div>
                          </td>
                          {isScanResult ? (
                            <>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(norm.simAvgPrice).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono text-blue-500">₹{Number(norm.target3pct).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(norm.price).toFixed(2)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(norm.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono text-blue-500">₹{Number(norm.target).toFixed(2)}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {waitingSignals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              <h2 className="text-base sm:text-lg font-semibold text-yellow-500">
                Waiting ({waitingSignals.length})
              </h2>
            </div>
            <div className="bg-card border border-yellow-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {waitingSignals.map((item: any) => {
                  const norm = normalizeItem(item);
                  return (
                    <div key={norm.id} className="p-3 space-y-1.5" data-testid={`card-waiting-${norm.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{norm.symbol}</div>
                          <div className="text-[10px] text-muted-foreground">{norm.name}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Current: <span className="font-mono text-foreground">₹{Number(norm.price).toFixed(2)}</span>
                      </div>
                      {norm.details && (
                        <div className="text-xs text-muted-foreground">{norm.details}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-waiting-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Price</th>
                      {waitingSignals.length > 0 && normalizeItem(waitingSignals[0]).details && (
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Details</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {waitingSignals.map((item: any) => {
                      const norm = normalizeItem(item);
                      return (
                        <tr key={norm.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-medium">{norm.symbol}</div>
                            <div className="text-xs text-muted-foreground">{norm.name}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">₹{Number(norm.price).toFixed(2)}</td>
                          {waitingSignals.length > 0 && normalizeItem(waitingSignals[0]).details && (
                            <td className="px-4 py-3 text-left text-muted-foreground">{norm.details || "-"}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !signals?.length && !isScanning && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Turtle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm" data-testid="text-no-signals">
              No scan results yet. Click "Run Weekly Scan" to analyze ETFs for bearish weekly candles.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              The scan identifies ETFs with bearish weekly candles for contrarian accumulation opportunities.
            </p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold text-sm sm:text-base mb-4">Capital Control: 12-Part Rule</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            The 12-part capital control system divides your allocation into 12 equal installments. Each bearish weekly
            candle triggers one installment purchase at that week's price. Once all 12 parts are deployed, no more
            purchases are made. Exit when price reaches 3% above the average accumulated price.
          </p>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium mb-2">Example: Nifty 50 ETF with bearish weeks</div>
              <CapitalSlots parts={12} filled={7} />
              <div className="text-[10px] text-muted-foreground mt-2">
                7 of 12 parts deployed. Each filled slot = 1 bearish week purchase. Capital remaining: 5 parts.
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                <div className="font-medium text-green-600 dark:text-green-400 mb-1">Filled Slot</div>
                <div className="text-muted-foreground">Buy signal executed on bearish weekly candle</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="font-medium mb-1">Empty Slot</div>
                <div className="text-muted-foreground">Waiting for next bearish weekly candle</div>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">Target Booking</div>
                <div className="text-muted-foreground">Exit at avg price × 1.03 (3% profit)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-[10px] sm:text-xs text-muted-foreground">
          Educational purposes only. Not financial advice. Based on weekly candle analysis. Always perform your own
          research before investing.
        </div>
      </div>
    </DashboardLayout>
  );
}
