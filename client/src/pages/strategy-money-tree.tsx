import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, TrendingDown, TrendingUp, Minus } from "lucide-react";

function SignalBadge({ signal }: { signal: string }) {
  const upper = signal.toUpperCase();
  if (upper === "SIP" || upper === "BUY") return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs"><TrendingDown className="w-3 h-3 mr-1" />SIP</Badge>;
  if (upper === "PROFIT" || upper === "SELL") return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs"><TrendingUp className="w-3 h-3 mr-1" />PROFIT</Badge>;
  return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs"><Minus className="w-3 h-3 mr-1" />NEUTRAL</Badge>;
}

// Helper to format price values - handles both scanResult and signals format
function formatPrice(value: any): string {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  return isNaN(num) ? "—" : num.toFixed(2);
}

// Helper to determine if data is from scanResult (has dma124) or signals (has details)
function isFromScanResult(item: any): boolean {
  return "dma124" in item || "srtv" in item;
}

export default function StrategyMoneyTree() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "srtv-etf"],
    queryFn: () => fetch("/api/signals?limit=500&strategy=srtv-etf").then(r => r.json()),
  });

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/srtv-etf");
      const result = await response.json();
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "srtv-etf"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "ETF Scan Complete",
        description: result.message || "SRTV ETF scan finished",
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

  // Unified data source: prefer scanResult, fall back to signals
  const sipItems = scanResult ? (scanResult.top_sip_candidates ?? []) : (signals?.filter(s => s.signal === "BUY") ?? []);
  const profitItems = scanResult ? (scanResult.profit_booking_candidates ?? []) : (signals?.filter(s => s.signal === "SELL") ?? []);
  const neutralItems = scanResult ? (scanResult.neutral_zone ?? []) : (signals?.filter(s => s.signal === "WATCH") ?? []);
  const hasData = (scanResult && (sipItems.length > 0 || profitItems.length > 0 || neutralItems.length > 0)) || (signals && signals.length > 0);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">SRTV ETF Scanner</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              124 DMA mean reversion strategy for ETF selection. Identify undervalued (SIP candidates) and overvalued (book profit) ETFs using SRTV ratio.
            </p>
          </div>
          <Button
            onClick={handleScan}
            disabled={isScanning}
            data-testid="button-scan-srtv"
            className="w-full sm:w-auto shrink-0"
            size="lg"
          >
            {isScanning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning ETFs...</>
            ) : (
              <><Search className="w-4 h-4 mr-2" />Run ETF Scan</>
            )}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-3">Strategy Rules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {[
              "SRTV < 0.96 = Start SIP (Undervalued)",
              "SRTV > 1.12 = Book Profit (Overvalued)",
              "Sort by lowest SRTV for SIP priority",
              "Volume filter: Average 20-day volume > 50k",
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </div>
                <div className="text-xs sm:text-sm">{rule}</div>
              </div>
            ))}
          </div>
        </div>


        {/* Start SIP Section */}
        {sipItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              <h2 className="text-base sm:text-lg font-semibold text-green-500">Start SIP ({sipItems.length})</h2>
            </div>
            <div className="bg-card border border-green-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {sipItems.map((item: any, i: number) => {
                  const isScan = isFromScanResult(item);
                  return (
                    <div key={item.id || i} className="p-3 space-y-1.5" data-testid={`card-sip-${item.id || i}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{item.symbol}</div>
                          <div className="text-[10px] text-muted-foreground">{isScan ? (item.name || "ETF") : (item.companyName || "ETF")}</div>
                        </div>
                        <SignalBadge signal={isScan ? "SIP" : (item.signal || "BUY")} />
                      </div>
                      {isScan ? (
                        <>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>SRTV: <span className="font-mono text-foreground">{Number(item.srtv).toFixed(4)}</span></span>
                            <span>DMA: <span className="font-mono text-foreground">₹{Number(item.dma124).toFixed(2)}</span></span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>CMP: <span className="font-mono text-foreground">₹{Number(item.price).toFixed(2)}</span></span>
                            <span>RSI: <span className="font-mono text-foreground">{Number(item.rsi).toFixed(2)}</span></span>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          <span>Price: <span className="font-mono text-foreground">₹{Number(item.price).toFixed(2)}</span></span>
                          {item.details && <p className="mt-1">{item.details}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-sip-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">ETF NSE CODE</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">UNDERLYING ASSET</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">CMP</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">124 DMA</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">SRTV</th>
                      <th className="text-center px-4 py-3 text-muted-foreground font-medium">Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sipItems.map((item: any, i: number) => {
                      const isScan = isFromScanResult(item);
                      return (
                        <tr key={item.id || i} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.symbol}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-muted-foreground">{isScan ? (item.name || "ETF") : (item.companyName || "ETF")}</div>
                          </td>
                          {isScan ? (
                            <>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.dma124).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">{Number(item.srtv).toFixed(4)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">—</td>
                              <td className="px-4 py-3 text-right font-mono">—</td>
                            </>
                          )}
                          <td className="px-4 py-3 text-center"><SignalBadge signal={isScan ? "SIP" : (item.signal || "BUY")} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {profitItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              <h2 className="text-base sm:text-lg font-semibold text-red-500">Book Profit ({profitItems.length})</h2>
            </div>
            <div className="bg-card border border-red-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {profitItems.map((item: any, i: number) => {
                  const isScan = isFromScanResult(item);
                  return (
                    <div key={item.id || i} className="p-3 space-y-1.5" data-testid={`card-profit-${item.id || i}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{item.symbol}</div>
                          <div className="text-[10px] text-muted-foreground">{isScan ? (item.name || "ETF") : (item.companyName || "ETF")}</div>
                        </div>
                        <SignalBadge signal={isScan ? "PROFIT" : (item.signal || "SELL")} />
                      </div>
                      {isScan ? (
                        <>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>SRTV: <span className="font-mono text-foreground">{Number(item.srtv).toFixed(4)}</span></span>
                            <span>DMA: <span className="font-mono text-foreground">₹{Number(item.dma124).toFixed(2)}</span></span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>CMP: <span className="font-mono text-foreground">₹{Number(item.price).toFixed(2)}</span></span>
                            <span>RSI: <span className="font-mono text-foreground">{Number(item.rsi).toFixed(2)}</span></span>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          <span>Price: <span className="font-mono text-foreground">₹{Number(item.price).toFixed(2)}</span></span>
                          {item.details && <p className="mt-1">{item.details}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-profit-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">ETF NSE CODE</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">UNDERLYING ASSET</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">CMP</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">124 DMA</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">SRTV</th>
                      <th className="text-center px-4 py-3 text-muted-foreground font-medium">Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitItems.map((item: any, i: number) => {
                      const isScan = isFromScanResult(item);
                      return (
                        <tr key={item.id || i} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.symbol}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-muted-foreground">{isScan ? (item.name || "ETF") : (item.companyName || "ETF")}</div>
                          </td>
                          {isScan ? (
                            <>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.dma124).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">{Number(item.srtv).toFixed(4)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">—</td>
                              <td className="px-4 py-3 text-right font-mono">—</td>
                            </>
                          )}
                          <td className="px-4 py-3 text-center"><SignalBadge signal={isScan ? "PROFIT" : (item.signal || "SELL")} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {neutralItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              <h2 className="text-base sm:text-lg font-semibold text-yellow-500">Neutral Zone ({neutralItems.length})</h2>
            </div>
            <div className="bg-card border border-yellow-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {neutralItems.map((item: any, i: number) => {
                  const isScan = isFromScanResult(item);
                  return (
                    <div key={item.id || i} className="p-3 space-y-1.5" data-testid={`card-neutral-${item.id || i}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{item.symbol}</div>
                          <div className="text-[10px] text-muted-foreground">{isScan ? (item.name || "ETF") : (item.companyName || "ETF")}</div>
                        </div>
                        <SignalBadge signal={isScan ? "NEUTRAL" : (item.signal || "WATCH")} />
                      </div>
                      {isScan ? (
                        <>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>SRTV: <span className="font-mono text-foreground">{Number(item.srtv).toFixed(4)}</span></span>
                            <span>DMA: <span className="font-mono text-foreground">₹{Number(item.dma124).toFixed(2)}</span></span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>CMP: <span className="font-mono text-foreground">₹{Number(item.price).toFixed(2)}</span></span>
                            <span>RSI: <span className="font-mono text-foreground">{Number(item.rsi).toFixed(2)}</span></span>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          <span>Price: <span className="font-mono text-foreground">₹{Number(item.price).toFixed(2)}</span></span>
                          {item.details && <p className="mt-1">{item.details}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-neutral-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">ETF NSE CODE</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">UNDERLYING ASSET</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">CMP</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">124 DMA</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">SRTV</th>
                      <th className="text-center px-4 py-3 text-muted-foreground font-medium">Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {neutralItems.map((item: any, i: number) => {
                      const isScan = isFromScanResult(item);
                      return (
                        <tr key={item.id || i} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.symbol}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-muted-foreground">{isScan ? (item.name || "ETF") : (item.companyName || "ETF")}</div>
                          </td>
                          {isScan ? (
                            <>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.dma124).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">{Number(item.srtv).toFixed(4)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-right font-mono">₹{Number(item.price).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">—</td>
                              <td className="px-4 py-3 text-right font-mono">—</td>
                            </>
                          )}
                          <td className="px-4 py-3 text-center"><SignalBadge signal={isScan ? "NEUTRAL" : (item.signal || "WATCH")} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!hasData && !isScanning && (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
            <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground mb-1">No ETF Signals Found</h3>
            <p className="max-w-sm mx-auto mb-6">
              Run a new scan to identify undervalued ETFs for SIP or overvalued ETFs for profit booking.
            </p>
            <Button onClick={handleScan} variant="outline">
              <Search className="w-4 h-4 mr-2" />
              Start New Scan
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
