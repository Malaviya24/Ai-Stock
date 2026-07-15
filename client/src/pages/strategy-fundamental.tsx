import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Shield, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";

function ClassificationBadge({ score }: { score: number }) {
  if (score >= 6) {
    return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs"><Shield className="w-3 h-3 mr-1" />Strong</Badge>;
  }
  if (score >= 4) {
    return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs"><TrendingUp className="w-3 h-3 mr-1" />Moderate</Badge>;
  }
  return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Weak</Badge>;
}

function BHZoneBadge({ bhZone }: { bhZone: string | boolean }) {
  if (bhZone === "GREEN" || bhZone === true) {
    return <Badge variant="outline" className="text-[9px] sm:text-[10px] border-purple-500/30 text-purple-500"><CheckCircle className="w-3 h-3 mr-1" />BH Zone</Badge>;
  }
  return null;
}

export default function StrategyFundamental() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "fundamental"],
    queryFn: () => fetch("/api/signals?limit=200&strategy=fundamental").then(r => r.json()),
  });

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/fundamental");
      const result = await response.json();
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "fundamental"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Fundamental Scan Complete",
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

  // Use scanResult when available, fallback to processedSignals (or legacy signals)
  const dataSource = scanResult?.all_results ? scanResult.all_results : signals ?? [];

  // Filter based on "passed" flag (Strong Candidates) vs Failed (Watchlist)
  // Or use finalVerdict
  const strongCandidates = dataSource.filter((s: any) => s.passed === true);
  const watchlistCandidates = dataSource.filter((s: any) => s.passed === false);

  const totalScanned = scanResult?.total_scanned ?? signals?.length ?? 0;
  const strongCount = strongCandidates.length;
  const watchlistCount = watchlistCandidates.length;

  // Count stocks whose live data could not be fetched (e.g. delisted BSE codes
  // or a Yahoo hiccup) so the user is informed instead of silently seeing 0.
  const dataErrorCount = dataSource.filter(
    (s: any) => typeof s.bohStatus === "string" && s.bohStatus.toLowerCase().includes("error"),
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
              <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">Fundamental Analysis + BOH Filter</h1>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Screen fundamentally strong stocks from Mahesh Kaushik's list using custom ratios (P/SPS, High/Low) and 6-step filter including BOH.
            </p>
          </div>
          <Button
            onClick={handleScan}
            disabled={isScanning}
            data-testid="button-scan-fundamental"
            className="w-full sm:w-auto shrink-0"
            size="lg"
          >
            {isScanning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
            ) : (
              <><BarChart3 className="w-4 h-4 mr-2" />Run Analysis</>
            )}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-3">Filter Statistics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="p-3 bg-muted/20 rounded-lg text-center border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
              <div className="text-lg font-bold mt-1">{scanResult?.stats?.total || 0}</div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg text-center border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">After F1 (BV)</div>
              <div className="text-lg font-bold mt-1">{scanResult?.stats?.afterF1 || 0}</div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg text-center border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">After F2 (ROE)</div>
              <div className="text-lg font-bold mt-1">{scanResult?.stats?.afterF2 || 0}</div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg text-center border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">After F3 (Pledge)</div>
              <div className="text-lg font-bold mt-1">{scanResult?.stats?.afterF3 || 0}</div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg text-center border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">After F4 (Profit)</div>
              <div className="text-lg font-bold mt-1">{scanResult?.stats?.afterF4 || 0}</div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg text-center border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">After F5 (EV)</div>
              <div className="text-lg font-bold mt-1">{scanResult?.stats?.afterF5 || 0}</div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg text-center border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">After F6 (Sales)</div>
              <div className="text-lg font-bold mt-1">{scanResult?.stats?.afterF6 || 0}</div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-center border border-green-500/20">
              <div className="text-[10px] text-green-600 uppercase tracking-wider font-semibold">After BOH</div>
              <div className="text-lg font-bold mt-1 text-green-600">{scanResult?.stats?.afterBOH || 0}</div>
            </div>
          </div>
        </div>

        {scanResult && (
          <div
            className={`rounded-xl p-4 text-xs sm:text-sm border flex items-start gap-2.5 ${
              dataErrorCount > 0
                ? "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400"
                : "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
            }`}
            data-testid="banner-scan-status"
          >
            {dataErrorCount > 0 ? (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div>
              <strong>Scan complete.</strong> Analyzed {totalScanned} stocks — {strongCount} strong candidate{strongCount === 1 ? "" : "s"}, {watchlistCount} on watchlist.
              {dataErrorCount > 0 && (
                <span className="block mt-1">
                  Note: live data for {dataErrorCount} stock{dataErrorCount === 1 ? "" : "s"} could not be fetched (likely delisted BSE codes or a temporary data-source limit). Those rows show a "data error" status and were skipped from live checks.
                </span>
              )}
              {strongCount === 0 && dataErrorCount === 0 && (
                <span className="block mt-1">
                  No stocks passed all filters this run — that is a valid result of the strict criteria, not an error.
                </span>
              )}
            </div>
          </div>
        )}

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-xs sm:text-sm text-yellow-700 dark:text-yellow-400">
          <strong>RISK NOTE:</strong> This is educational screening logic only. Not an investment recommendation. Please consult a financial advisor before trading.
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Scanned</div>
            <div className="text-base sm:text-xl font-bold" data-testid="text-total-scanned">{totalScanned}</div>
          </div>
          <div className="bg-card border border-green-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-green-500 mb-1">Strong Candidates</div>
            <div className="text-base sm:text-xl font-bold text-green-500" data-testid="text-strong-count">{strongCount}</div>
          </div>
          <div className="bg-card border border-yellow-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-yellow-500 mb-1">Watchlist (Failed)</div>
            <div className="text-base sm:text-xl font-bold text-yellow-500" data-testid="text-watchlist-count">{watchlistCount}</div>
          </div>
        </div>

        {strongCount > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              <h2 className="text-base sm:text-lg font-semibold text-green-500">Strong Candidates ({strongCount})</h2>
            </div>
            <div className="bg-card border border-green-500/20 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium">BSE Code</th>
                      <th className="text-left px-4 py-3 font-medium">Company Name</th>
                      <th className="text-left px-4 py-3 font-medium">Sector</th>
                      <th className="text-right px-4 py-3 font-medium">Face Value</th>
                      <th className="text-right px-4 py-3 font-medium">Total Equity</th>
                      <th className="text-right px-4 py-3 font-medium">Total Share (Cr)</th>
                      <th className="text-right px-4 py-3 font-medium">Book Value</th>
                      <th className="text-right px-4 py-3 font-medium">Sales (Cr)</th>
                      <th className="text-right px-4 py-3 font-medium">Net Sale/Share</th>
                      <th className="text-right px-4 py-3 font-medium">Net Profit (Cr)</th>
                      <th className="text-right px-4 py-3 font-medium">EPS</th>
                      <th className="text-right px-4 py-3 font-medium">Dividend</th>
                      <th className="text-right px-4 py-3 font-medium">P/E Ratio</th>
                      <th className="text-right px-4 py-3 font-medium">ROE %</th>
                      <th className="text-right px-4 py-3 font-medium">Promoter %</th>
                      <th className="text-right px-4 py-3 font-medium">Pledged %</th>
                      <th className="text-right px-4 py-3 font-medium">Inst. %</th>
                      <th className="text-right px-4 py-3 font-medium">Market Cap</th>
                      <th className="text-right px-4 py-3 font-medium">Price</th>
                      <th className="text-right px-4 py-3 font-medium">52W High</th>
                      <th className="text-right px-4 py-3 font-medium">52W Low</th>
                      <th className="text-right px-4 py-3 font-medium">52W H/L Ratio</th>
                      <th className="text-right px-4 py-3 font-medium">EV</th>
                      <th className="text-left px-4 py-3 font-medium">BOH Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strongCandidates.map((item: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-3 font-medium">{item.bseCode}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.sector}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.faceValue}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.totalEquity}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.totalShareCr}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.bookValue}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.salesCr}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.netSalePerShare}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.netProfit}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.eps}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.dividend}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.deRatio}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.roe}%</td>
                        <td className="px-4 py-3 text-right font-mono">{item.promoters}%</td>
                        <td className="px-4 py-3 text-right font-mono">{item.pledged}%</td>
                        <td className="px-4 py-3 text-right font-mono">{item.institutional}%</td>
                        <td className="px-4 py-3 text-right font-mono">{Number(item.marketCap).toFixed(0)}Cr</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">₹{item.price?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.fiftyTwoWeekHigh}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.fiftyTwoWeekLow}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.ratio52}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.ev}</td>
                        <td className="px-4 py-3 text-xs">
                          <Badge variant="outline" className="text-green-500 border-green-500/30">
                            {item.bohStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {watchlistCount > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              <h2 className="text-base sm:text-lg font-semibold text-yellow-500">Watchlist / Failed Filters ({watchlistCount})</h2>
            </div>
            <div className="bg-card border border-yellow-500/20 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium">BSE Code</th>
                      <th className="text-left px-4 py-3 font-medium">Company Name</th>
                      <th className="text-left px-4 py-3 font-medium">Sector</th>
                      <th className="text-left px-4 py-3 font-medium">Failed Reasons</th>
                      <th className="text-right px-4 py-3 font-medium">Face Value</th>
                      <th className="text-right px-4 py-3 font-medium">Total Equity</th>
                      <th className="text-right px-4 py-3 font-medium">Total Share (Cr)</th>
                      <th className="text-right px-4 py-3 font-medium">Book Value</th>
                      <th className="text-right px-4 py-3 font-medium">Sales (Cr)</th>
                      <th className="text-right px-4 py-3 font-medium">Net Sale/Share</th>
                      <th className="text-right px-4 py-3 font-medium">Net Profit (Cr)</th>
                      <th className="text-right px-4 py-3 font-medium">EPS</th>
                      <th className="text-right px-4 py-3 font-medium">Dividend</th>
                      <th className="text-right px-4 py-3 font-medium">P/E Ratio</th>
                      <th className="text-right px-4 py-3 font-medium">ROE %</th>
                      <th className="text-right px-4 py-3 font-medium">Promoter %</th>
                      <th className="text-right px-4 py-3 font-medium">Pledged %</th>
                      <th className="text-right px-4 py-3 font-medium">Inst. %</th>
                      <th className="text-right px-4 py-3 font-medium">Market Cap</th>
                      <th className="text-right px-4 py-3 font-medium">Price</th>
                      <th className="text-right px-4 py-3 font-medium">52W High</th>
                      <th className="text-right px-4 py-3 font-medium">52W Low</th>
                      <th className="text-right px-4 py-3 font-medium">52W H/L Ratio</th>
                      <th className="text-right px-4 py-3 font-medium">EV</th>
                      <th className="text-left px-4 py-3 font-medium">BOH Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlistCandidates.map((item: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-3 font-medium">{item.bseCode}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.sector}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {item.failedFilters?.map((reason: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] text-red-500 bg-red-500/10">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{item.faceValue}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.totalEquity}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.totalShareCr}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.bookValue}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.salesCr}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.netSalePerShare}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.netProfit}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.eps}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.dividend}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.deRatio}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.roe}%</td>
                        <td className="px-4 py-3 text-right font-mono">{item.promoters}%</td>
                        <td className="px-4 py-3 text-right font-mono">{item.pledged}%</td>
                        <td className="px-4 py-3 text-right font-mono">{item.institutional}%</td>
                        <td className="px-4 py-3 text-right font-mono">{Number(item.marketCap).toFixed(0)}Cr</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">₹{item.price?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.fiftyTwoWeekHigh}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.fiftyTwoWeekLow}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.ratio52}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.ev}</td>
                        <td className="px-4 py-3 text-xs">
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                            {item.bohStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
