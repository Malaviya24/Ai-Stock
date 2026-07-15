import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, TrendingUp, ArrowUpRight, Target, Shield, Clock, BarChart3 } from "lucide-react";

function SignalBadge({ signal }: { signal: string }) {
  if (signal === "BUY") return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs" data-testid="badge-buy">BUY</Badge>;
  if (signal === "SELL") return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs" data-testid="badge-sell">SELL</Badge>;
  return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs" data-testid="badge-watch">WATCH</Badge>;
}

function GapBadge({ gap }: { gap: number }) {
  if (gap >= 3.14) return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs">{gap.toFixed(2)}%</Badge>;
  if (gap >= 1) return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs">{gap.toFixed(2)}%</Badge>;
  if (gap > 0) return <Badge variant="outline" className="text-[10px]">{gap.toFixed(2)}%</Badge>;
  return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs">{gap.toFixed(2)}%</Badge>;
}

export default function StrategyGapUp() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "gap-up-open"],
    queryFn: () => fetch("/api/signals?limit=200&strategy=gap-up-open").then(r => r.json()),
  });

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/gap-up");
      const result = await response.json();
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "gap-up-open"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Gap Up Scan Complete", description: `Found ${result.valid_gaps} valid gaps, ${result.confirmed_buys} confirmed` });
    } catch (error: any) {
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  }

  const hasScannedData = scanResult?.all_results?.length > 0;
  const dataSource = hasScannedData ? scanResult.all_results : [];
  const validGaps = hasScannedData ? dataSource.filter((r: any) => r.isValidGap) : [];
  const confirmedBuys = hasScannedData ? dataSource.filter((r: any) => r.signal === "BUY") : signals?.filter(s => s.signal === "BUY") ?? [];
  const awaitingConfirmation = hasScannedData ? dataSource.filter((r: any) => r.isValidGap && r.signal === "WATCH") : [];
  const allGaps = hasScannedData ? dataSource.filter((r: any) => r.gapPercent > 0) : [];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6" data-testid="page-gap-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">Gap Up Open Strategy</h2>
            <p className="text-sm text-muted-foreground mt-1">Class 14 — Nifty 100 Gap Scanner + 3PM Confirmation + 6.28% Target</p>
          </div>
          <Button onClick={handleScan} disabled={isScanning} size="sm" data-testid="button-scan-gap-up">
            {isScanning ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Scanning...</> : <><Rocket className="w-4 h-4 mr-1" />Run Gap Scan</>}
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><BarChart3 className="w-4 h-4" /><span className="text-xs">Stocks Scanned</span></div>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-scanned">{scanResult?.total_scanned ?? signals?.length ?? "—"}</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><ArrowUpRight className="w-4 h-4 text-green-500" /><span className="text-xs">Valid Gaps (≥3.14%)</span></div>
            <div className="text-xl sm:text-2xl font-bold text-green-600" data-testid="stat-valid-gaps">{scanResult?.valid_gaps ?? validGaps.length}</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingUp className="w-4 h-4 text-blue-500" /><span className="text-xs">Confirmed Buys</span></div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600" data-testid="stat-confirmed">{scanResult?.confirmed_buys ?? confirmedBuys.length}</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="w-4 h-4 text-yellow-500" /><span className="text-xs">Awaiting 3PM</span></div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600" data-testid="stat-awaiting">{scanResult?.awaiting_confirmation ?? awaitingConfirmation.length}</div>
          </div>
        </div>


        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-3">Strategy Rules</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-blue-500 shrink-0" /><span>Universe: Nifty 100 stocks only</span></div>
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-green-500 shrink-0" /><span>Gap must be ≥ 3.14% above previous close</span></div>
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-purple-500 shrink-0" /><span>3PM Confirmation: Price must be above today's open</span></div>
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-orange-500 shrink-0" /><span>Conservative Target: 6.28% | Aggressive: 3.14%</span></div>
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-red-500 shrink-0" /><span>No stop loss — hold until target or manual exit</span></div>
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-cyan-500 shrink-0" /><span>Average down if another valid gap occurs</span></div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-2">Gap Calculation</h3>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs sm:text-sm text-center">
            Gap% = ((Today Open − Previous Close) / Previous Close) × 100 <span className="text-green-600 ml-2">≥ 3.14% = Valid</span>
          </div>
        </div>

        {isLoading && !hasScannedData && (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        )}

        {confirmedBuys.length > 0 && (
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />Confirmed Buy Signals ({confirmedBuys.length})
            </h3>
            <div className="block sm:hidden space-y-2">
              {confirmedBuys.map((item: any, idx: number) => (
                <div key={idx} className="rounded-lg border p-3 space-y-1 bg-green-50/30 dark:bg-green-900/10" data-testid={`card-buy-${idx}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.symbol?.replace(".NS", "")}</span>
                    <SignalBadge signal="BUY" />
                  </div>
                  {hasScannedData ? (
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span>Gap: <GapBadge gap={item.gapPercent} /></span>
                      <span>Price: ₹{item.price?.toLocaleString()}</span>
                      <span>Target: ₹{item.targetConservative}</span>
                      <span>Vol: {item.volumeRatio}x</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">{item.details}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Symbol</th>
                    {hasScannedData ? (
                      <>
                        <th className="pb-2 pr-3">Gap %</th>
                        <th className="pb-2 pr-3">Prev Close</th>
                        <th className="pb-2 pr-3">Open</th>
                        <th className="pb-2 pr-3">CMP</th>
                        <th className="pb-2 pr-3">Target 6.28%</th>
                        <th className="pb-2 pr-3">Target 3.14%</th>
                        <th className="pb-2 pr-3">Vol</th>
                        <th className="pb-2">RSI</th>
                      </>
                    ) : (
                      <><th className="pb-2 pr-3">Price</th><th className="pb-2 pr-3">Details</th><th className="pb-2">Signal</th></>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {confirmedBuys.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/50 bg-green-50/30 dark:bg-green-900/5" data-testid={`row-buy-${idx}`}>
                      <td className="py-2 pr-3 font-medium">{item.symbol?.replace(".NS", "")}</td>
                      {hasScannedData ? (
                        <>
                          <td className="py-2 pr-3"><GapBadge gap={item.gapPercent} /></td>
                          <td className="py-2 pr-3">₹{item.previousClose?.toLocaleString()}</td>
                          <td className="py-2 pr-3">₹{item.todayOpen?.toLocaleString()}</td>
                          <td className="py-2 pr-3 font-medium">₹{item.price?.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-green-600">₹{item.targetConservative}</td>
                          <td className="py-2 pr-3 text-blue-600">₹{item.targetAggressive}</td>
                          <td className="py-2 pr-3">{item.volumeRatio}x</td>
                          <td className="py-2">{item.rsi}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 pr-3">₹{item.price?.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{item.details}</td>
                          <td className="py-2"><SignalBadge signal={item.signal} /></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {hasScannedData && allGaps.length > 0 && (
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <h3 className="font-semibold text-sm mb-3">All Gap Up Stocks ({allGaps.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Symbol</th>
                    <th className="pb-2 pr-3">Gap %</th>
                    <th className="pb-2 pr-3">Prev Close</th>
                    <th className="pb-2 pr-3">Open</th>
                    <th className="pb-2 pr-3">CMP</th>
                    <th className="pb-2 pr-3">Valid?</th>
                    <th className="pb-2 pr-3">Above Open?</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allGaps.slice(0, 30).map((item: any, idx: number) => (
                    <tr key={idx} className={`border-b border-border/50 ${item.isValidGap ? "bg-green-50/20 dark:bg-green-900/5" : ""}`} data-testid={`row-gap-${idx}`}>
                      <td className="py-2 pr-3 font-medium">{item.symbol?.replace(".NS", "")}</td>
                      <td className="py-2 pr-3"><GapBadge gap={item.gapPercent} /></td>
                      <td className="py-2 pr-3">₹{item.previousClose?.toFixed(2)}</td>
                      <td className="py-2 pr-3">₹{item.todayOpen?.toFixed(2)}</td>
                      <td className="py-2 pr-3 font-medium">₹{item.price?.toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={`text-[9px] ${item.isValidGap ? "text-green-600 border-green-500/30" : "text-muted-foreground"}`}>
                          {item.isValidGap ? "Yes" : "No"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={`text-[9px] ${item.priceAboveOpen ? "text-green-600 border-green-500/30" : "text-red-500 border-red-500/30"}`}>
                          {item.priceAboveOpen ? "Yes" : "No"}
                        </Badge>
                      </td>
                      <td className="py-2"><SignalBadge signal={item.signal} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <h3 className="font-semibold text-sm mb-2 text-green-600">Strengths</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Filters fake gaps with 3PM confirmation</li>
              <li>Event-driven, not prediction-based</li>
              <li>Works well with strong momentum stocks</li>
              <li>Simple mechanical rules, no subjectivity</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <h3 className="font-semibold text-sm mb-2 text-red-500">Risks</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>No stop loss — possible 20-25% drawdown</li>
              <li>Gap frequency is low in some markets</li>
              <li>Requires capital discipline</li>
              <li>Should combine with volume/RSI filters</li>
            </ul>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">Gap Up Open Strategy — Class 14. For educational purposes only. Not financial advice.</p>
      </div>
    </DashboardLayout>
  );
}
