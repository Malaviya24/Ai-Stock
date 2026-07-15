import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CandlestickChart, TrendingDown, Search, Target, Shield } from "lucide-react";

function SignalBadge({ signal }: { signal: string }) {
  const upper = signal.toUpperCase();
  if (upper === "BUY") return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs"><CandlestickChart className="w-3 h-3 mr-1" />BULLISH</Badge>;
  if (upper === "SELL") return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs"><TrendingDown className="w-3 h-3 mr-1" />BEARISH</Badge>;
  return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs">NO TRADE</Badge>;
}

function parseMonthlyDetails(details: string) {
  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

export default function StrategyMonthlyCandle() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "monthly-candle"],
    queryFn: () => fetch("/api/signals?limit=200&strategy=monthly-candle").then(r => r.json()),
  });

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/monthly-candle");
      const result = await response.json();
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "monthly-candle"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Monthly Scan Complete",
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

  const processedSignals = (signals || []).map(s => {
    const details = parseMonthlyDetails(s.details);
    return {
      ...s,
      ...details, // Merge parsed details into the item
      id: s.id,
      symbol: s.symbol,
      price: s.price,
      signal: s.signal,
      target: s.target,
    };
  });

  // Use scanResult when available, fallback to processedSignals
  const dataSource = scanResult?.all_results ? scanResult.all_results : processedSignals;
  
  const bullishData = dataSource.filter((r: any) => r.signal === "BUY");
  const bearishData = dataSource.filter((r: any) => r.signal === "SELL");
  const noTradeData = dataSource.filter((r: any) => r.signal !== "BUY" && r.signal !== "SELL");

  const totalScanned = scanResult?.total_scanned ?? signals?.length ?? 0;
  const bullishCount = scanResult?.bullish_count ?? bullishData.length ?? 0;
  const bearishCount = scanResult?.bearish_count ?? bearishData.length ?? 0;
  const noTradeCount = noTradeData.length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">Monthly Candle Trading</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Nifty 50 monthly OHLC analysis — enter on bullish monthly candles with 3% target, exit on bearish reversals.
            </p>
          </div>
          <Button
            onClick={handleScan}
            disabled={isScanning}
            data-testid="button-scan-monthly"
            className="w-full sm:w-auto shrink-0"
            size="lg"
          >
            {isScanning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning Monthly Data...</>
            ) : (
              <><Search className="w-4 h-4 mr-2" />Run Monthly Scan</>
            )}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-4">Step-by-Step Strategy Execution</h2>
          <div className="space-y-4">
            
            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
              <h3 className="text-sm font-semibold mb-1">Monthly Candle Analysis</h3>
              <p className="text-xs text-muted-foreground mb-2">
                We analyze the latest completed monthly candle for Nifty 50 stocks.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-green-500/5 border border-green-500/20 rounded p-2">
                  <span className="text-xs font-semibold text-green-600 block mb-0.5">BULLISH CANDLE (Green)</span>
                  <span className="text-[10px] text-muted-foreground">Close price is HIGHER than Open price. Buyers are in control.</span>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded p-2">
                  <span className="text-xs font-semibold text-red-600 block mb-0.5">BEARISH CANDLE (Red)</span>
                  <span className="text-[10px] text-muted-foreground">Close price is LOWER than Open price. Sellers are dominating.</span>
                </div>
              </div>
            </div>

            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
              <h3 className="text-sm font-semibold mb-1">Entry Logic (Buy Signal)</h3>
              <p className="text-xs text-muted-foreground">
                <strong>BUY</strong> if the last completed month was <strong>BULLISH</strong> (Green Candle).
                <br />Enter at the current market price (CMP) or on a slight pullback.
              </p>
            </div>

            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
              <h3 className="text-sm font-semibold mb-1">Profit Target</h3>
              <p className="text-xs text-muted-foreground">
                Set a fixed target of <strong>3%</strong> above your entry price.
                <br />Exit immediately once the stock hits this 3% gain.
              </p>
            </div>

            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">4</span>
              <h3 className="text-sm font-semibold mb-1">Stop Loss & Exit Rule</h3>
              <p className="text-xs text-muted-foreground">
                <strong>Stop Loss:</strong> The Low price of the entry monthly candle.
                <br /><strong>Early Exit:</strong> If the monthly candle turns BEARISH (Red) before hitting the target, exit the trade to protect capital.
              </p>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Stocks Scanned</div>
            <div className="text-base sm:text-xl font-bold" data-testid="text-scanned-count">{totalScanned || "—"}</div>
          </div>
          <div className="bg-card border border-green-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-green-500 mb-1">Bullish Entry</div>
            <div className="text-base sm:text-xl font-bold text-green-500" data-testid="text-bullish-count">{bullishCount}</div>
          </div>
          <div className="bg-card border border-red-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-red-500 mb-1">Bearish Exit</div>
            <div className="text-base sm:text-xl font-bold text-red-500" data-testid="text-bearish-count">{bearishCount}</div>
          </div>
          <div className="bg-card border border-yellow-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-yellow-500 mb-1">No Trade</div>
            <div className="text-base sm:text-xl font-bold text-yellow-500" data-testid="text-notrade-count">{noTradeCount}</div>
          </div>
        </div>


        {bullishCount > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <CandlestickChart className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              <h2 className="text-base sm:text-lg font-semibold text-green-500">Bullish Entries ({bullishCount})</h2>
            </div>
            <div className="bg-card border border-green-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {bullishData.map((item: any, i: number) => {
                  const isScanResult = !!item.currentMonth;
                  return (
                    <div key={item.id || i} className="p-3 space-y-1.5" data-testid={`card-bullish-${item.id || i}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{item.symbol.replace(".NS", "")}</div>
                          <div className="text-[10px] text-muted-foreground">{isScanResult ? item.name : item.companyName}</div>
                        </div>
                        <SignalBadge signal={item.signal} />
                      </div>
                      {isScanResult ? (
                        <>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Month: <span className="font-mono text-foreground">{item.currentMonth || "—"}</span></span>
                            <span>Type: <span className="font-mono text-foreground">{item.candleType || "—"}</span></span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Entry: <span className="font-mono text-foreground">₹{Number(item.price).toFixed(2)}</span></span>
                            <span>Target: <span className="font-mono text-green-500">₹{Number(item.target).toFixed(2)}</span></span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Entry: <span className="font-mono text-foreground">₹{Number(item.price).toFixed(2)}</span></span>
                            <span>Target: <span className="font-mono text-green-500">₹{Number(item.target).toFixed(2)}</span></span>
                          </div>
                          {item.details && <div className="text-[10px] text-muted-foreground leading-relaxed">{item.details}</div>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm rows-cv" data-testid="table-bullish-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                      {scanResult?.all_results ? (
                        <>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Month</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Open</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">High</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Low</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Close</th>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Candle</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Buying Rate</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Target</th>
                        </>
                      ) : (
                        <>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Price (₹)</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Target (₹)</th>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Details</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {bullishData.map((item: any, i: number) => {
                      // Check if we have structured data or legacy string details
                      const hasStructuredData = item.currentMonth !== undefined;
                      
                      return (
                        <tr key={item.id || i} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.symbol.replace(".NS", "")}</div>
                            <div className="text-xs text-muted-foreground">{item.name || item.companyName}</div>
                          </td>
                          {hasStructuredData ? (
                            <>
                              <td className="px-4 py-3 text-sm">
                                <div className="text-[12px] text-foreground">{item.monthRange}</div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.open).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.high).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.low).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.close).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm">{item.candleType || "—"}</td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.entryPrice || item.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono text-green-500">₹{Number(item.target).toFixed(2)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-sm" colSpan={8}>
                                <div className="text-xs text-muted-foreground">Legacy data format. Please run a new scan.</div>
                              </td>
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

        {bearishCount > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              <h2 className="text-base sm:text-lg font-semibold text-red-500">Bearish Exits ({bearishCount})</h2>
            </div>
            <div className="bg-card border border-red-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {bearishData.map((item: any, i: number) => {
                  const isScanResult = !!item.currentMonth;
                  return (
                    <div key={item.id || i} className="p-3 space-y-1.5" data-testid={`card-bearish-${item.id || i}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{item.symbol.replace(".NS", "")}</div>
                          <div className="text-[10px] text-muted-foreground">{isScanResult ? item.name : item.companyName}</div>
                        </div>
                        <SignalBadge signal={item.signal} />
                      </div>
                      {isScanResult ? (
                        <>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Month: <span className="font-mono text-foreground">{item.currentMonth || "—"}</span></span>
                            <span>Type: <span className="font-mono text-foreground">{item.candleType || "—"}</span></span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Price: <span className="font-mono text-foreground">₹{Number(item.price).toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-muted-foreground">
                            Price: <span className="font-mono text-foreground">₹{Number(item.price).toFixed(2)}</span>
                          </div>
                          {item.details && <div className="text-[10px] text-muted-foreground leading-relaxed">{item.details}</div>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm rows-cv" data-testid="table-bearish-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                      {scanResult?.all_results ? (
                        <>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Month</th>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Candle Type</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Price (₹)</th>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                        </>
                      ) : (
                        <>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Price (₹)</th>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Details</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {bearishData.map((item: any, i: number) => {
                      const isScanResult = !!item.currentMonth;
                      return (
                        <tr key={item.id || i} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.symbol.replace(".NS", "")}</div>
                            <div className="text-xs text-muted-foreground">{isScanResult ? item.name : item.companyName}</div>
                          </td>
                          {isScanResult ? (
                            <>
                              <td className="px-4 py-3 text-sm">{item.currentMonth || "—"}</td>
                              <td className="px-4 py-3 text-sm">{item.candleType || "—"}</td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm">{item.status || "—"}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{item.details || "—"}</td>
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

        {!isLoading && !signals?.length && !isScanning && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <CandlestickChart className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm" data-testid="text-no-signals">
              No scan results yet. Click "Run Monthly Scan" to analyze Nifty 50 monthly candles.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              The scan applies monthly OHLC analysis and identifies bullish/bearish candle patterns.
            </p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold text-sm sm:text-base mb-2">Risk Management Rules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {[
              { icon: Target, color: "text-green-500", text: "Target: Entry Price × 1.03 (3% profit)" },
              { icon: Shield, color: "text-red-500", text: "Stop Loss: Monthly Low of the candle" },
            ].map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <rule.icon className={`w-4 h-4 ${rule.color} shrink-0`} />
                <span className="text-xs sm:text-sm">{rule.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-[10px] sm:text-xs text-muted-foreground">
          Educational purposes only. Not financial advice. Scan results are based on Nifty 50 monthly candlestick patterns. Always verify before trading.
        </div>
      </div>
    </DashboardLayout>
  );
}
