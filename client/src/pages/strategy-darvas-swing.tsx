import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Radar, TrendingUp, TrendingDown, Eye, Shield, AlertTriangle, Target, Ban } from "lucide-react";

function SignalBadge({ signal }: { signal: string }) {
  const upper = signal.toUpperCase();
  if (upper === "BUY") return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs"><TrendingUp className="w-3 h-3 mr-1" />BUY</Badge>;
  if (upper === "SELL") return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs"><TrendingDown className="w-3 h-3 mr-1" />RED ZONE</Badge>;
  return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs"><Eye className="w-3 h-3 mr-1" />WATCH</Badge>;
}

function CategoryBadge({ details }: { details: string }) {
  if (details?.includes("REIT")) return <Badge variant="outline" className="text-[9px] sm:text-[10px] border-blue-500/30 text-blue-500">REIT</Badge>;
  if (details?.includes("INVIT")) return <Badge variant="outline" className="text-[9px] sm:text-[10px] border-purple-500/30 text-purple-500">INVIT</Badge>;
  return <Badge variant="outline" className="text-[9px] sm:text-[10px] border-muted-foreground/30">NIFTY LM250</Badge>;
}

export default function StrategyDarvasSwing() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "darvas-swing"],
    queryFn: () => fetch("/api/signals?limit=200&strategy=darvas-swing").then(r => r.json()),
  });

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/darvas-swing");
      const result = await response.json();
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "darvas-swing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Full Universe Scan Complete",
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

  const buySignals = signals?.filter(s => s.signal === "BUY") ?? [];
  const avoidSignals = signals?.filter(s => s.signal === "WATCH" && s.details?.includes("2.75% avoid")) ?? [];
  const watchSignals = signals?.filter(s => s.signal === "WATCH" && !s.details?.includes("2.75% avoid")) ?? [];
  const redSignals = signals?.filter(s => s.signal === "SELL") ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">Darvas Box Swing Trading</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Daily auto-scan of the full universe — REIT/INVIT + Nifty LargeMidcap 250. Applies BIOS filter, Darvas breakout, and 2.75% avoid rule to return only actionable stocks.
            </p>
          </div>
          <Button
            onClick={handleScan}
            disabled={isScanning}
            data-testid="button-scan-swing"
            className="w-full sm:w-auto shrink-0"
            size="lg"
          >
            {isScanning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning Universe...</>
            ) : (
              <><Radar className="w-4 h-4 mr-2" />Run Full Universe Scan</>
            )}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-3">Scan Universe</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="border border-blue-500/20 bg-blue-500/5 rounded-lg p-3">
              <div className="text-xs sm:text-sm font-medium text-blue-500 mb-1">REIT</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Embassy, Mindspace, Brookfield</div>
            </div>
            <div className="border border-purple-500/20 bg-purple-500/5 rounded-lg p-3">
              <div className="text-xs sm:text-sm font-medium text-purple-500 mb-1">INVIT</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">IndiGrid, PowerGrid INVIT</div>
            </div>
            <div className="border border-primary/20 bg-primary/5 rounded-lg p-3">
              <div className="text-xs sm:text-sm font-medium text-primary mb-1">Nifty LargeMidcap 250</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Full Nifty 100 + LargeMidcap constituents</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-3">Scan Pipeline</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            {[
              { step: "1", title: "Fetch Data", desc: "1-year daily from Yahoo Finance" },
              { step: "2", title: "BIOS Filter", desc: "52W high/low date comparison" },
              { step: "3", title: "Darvas Breakout", desc: "5-day high + 1.5x volume" },
              { step: "4", title: "2.75% Avoid", desc: "Skip if inside avoid range" },
              { step: "5", title: "Target & Risk", desc: "+6% target, -4% stop loss" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-2 bg-muted/30 rounded-lg p-2.5 sm:p-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-medium">{item.title}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-4">
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Scanned</div>
            <div className="text-base sm:text-xl font-bold" data-testid="text-total-scanned">{scanResult?.total_scanned ?? signals?.length ?? "—"}</div>
          </div>
          <div className="bg-card border border-green-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-green-500 mb-1">BUY Candidates</div>
            <div className="text-base sm:text-xl font-bold text-green-500" data-testid="text-buy-count">{buySignals.length}</div>
          </div>
          <div className="bg-card border border-yellow-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-yellow-500 mb-1">Watchlist</div>
            <div className="text-base sm:text-xl font-bold text-yellow-500" data-testid="text-watch-count">{watchSignals.length}</div>
          </div>
          <div className="bg-card border border-orange-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-orange-500 mb-1">Avoid Range</div>
            <div className="text-base sm:text-xl font-bold text-orange-500" data-testid="text-avoid-count">{avoidSignals.length}</div>
          </div>
          <div className="bg-card border border-red-500/20 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs text-red-500 mb-1">Red Zone</div>
            <div className="text-base sm:text-xl font-bold text-red-500" data-testid="text-red-count">{redSignals.length}</div>
          </div>
        </div>


        {buySignals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              <h2 className="text-base sm:text-lg font-semibold text-green-500">BUY Candidates ({buySignals.length})</h2>
            </div>
            <div className="bg-card border border-green-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {buySignals.map((sig, i) => (
                  <div key={sig.id || i} className="p-3 space-y-1.5" data-testid={`card-buy-${sig.id || i}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{sig.symbol.replace(".NS", "")}</div>
                        <div className="text-[10px] text-muted-foreground">{sig.companyName}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CategoryBadge details={sig.details} />
                        <SignalBadge signal={sig.signal} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Entry: <span className="font-mono text-foreground">₹{Number(sig.price).toFixed(2)}</span></span>
                      <span>Target: <span className="font-mono text-green-500">₹{Number(sig.target).toFixed(2)}</span></span>
                      <span>SL: <span className="font-mono text-red-500">₹{(Number(sig.price) * 0.96).toFixed(2)}</span></span>
                    </div>
                    {sig.details && <div className="text-[10px] text-muted-foreground leading-relaxed">{sig.details}</div>}
                  </div>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-buy-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Category</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Entry</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Target (+6%)</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Stop Loss (-4%)</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Analysis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buySignals.map((sig, i) => (
                      <tr key={sig.id || i} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium">{sig.symbol.replace(".NS", "")}</div>
                          <div className="text-xs text-muted-foreground">{sig.companyName}</div>
                        </td>
                        <td className="px-4 py-3"><CategoryBadge details={sig.details} /></td>
                        <td className="px-4 py-3 text-right font-mono">₹{Number(sig.price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-green-500">₹{Number(sig.target).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-red-500">₹{(Number(sig.price) * 0.96).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[300px]">{sig.details || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {avoidSignals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Ban className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              <h2 className="text-base sm:text-lg font-semibold text-orange-500">Avoid Range ({avoidSignals.length})</h2>
            </div>
            <div className="bg-card border border-orange-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {avoidSignals.map((sig, i) => (
                  <div key={sig.id || i} className="p-3 space-y-1.5" data-testid={`card-avoid-${sig.id || i}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{sig.symbol.replace(".NS", "")}</div>
                        <div className="text-[10px] text-muted-foreground">{sig.companyName}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CategoryBadge details={sig.details} />
                        <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px]"><Ban className="w-3 h-3 mr-1" />AVOID</Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Price: <span className="font-mono text-foreground">₹{Number(sig.price).toFixed(2)}</span>
                    </div>
                    {sig.details && <div className="text-[10px] text-muted-foreground leading-relaxed">{sig.details}</div>}
                  </div>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-avoid-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Category</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Price</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Avoid Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {avoidSignals.map((sig, i) => (
                      <tr key={sig.id || i} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium">{sig.symbol.replace(".NS", "")}</div>
                          <div className="text-xs text-muted-foreground">{sig.companyName}</div>
                        </td>
                        <td className="px-4 py-3"><CategoryBadge details={sig.details} /></td>
                        <td className="px-4 py-3 text-right font-mono">₹{Number(sig.price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[350px]">{sig.details || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {watchSignals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              <h2 className="text-base sm:text-lg font-semibold text-yellow-500">Watchlist ({watchSignals.length})</h2>
            </div>
            <div className="bg-card border border-yellow-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {watchSignals.map((sig, i) => (
                  <div key={sig.id || i} className="p-3 space-y-1.5" data-testid={`card-watch-${sig.id || i}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{sig.symbol.replace(".NS", "")}</div>
                        <div className="text-[10px] text-muted-foreground">{sig.companyName}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CategoryBadge details={sig.details} />
                        <SignalBadge signal={sig.signal} />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Price: <span className="font-mono text-foreground">₹{Number(sig.price).toFixed(2)}</span>
                    </div>
                    {sig.details && <div className="text-[10px] text-muted-foreground leading-relaxed">{sig.details}</div>}
                  </div>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-watch-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Category</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Price</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchSignals.map((sig, i) => (
                      <tr key={sig.id || i} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium">{sig.symbol.replace(".NS", "")}</div>
                          <div className="text-xs text-muted-foreground">{sig.companyName}</div>
                        </td>
                        <td className="px-4 py-3"><CategoryBadge details={sig.details} /></td>
                        <td className="px-4 py-3 text-right font-mono">₹{Number(sig.price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[350px]">{sig.details || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {redSignals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              <h2 className="text-base sm:text-lg font-semibold text-red-500">Red Zone ({redSignals.length})</h2>
            </div>
            <div className="bg-card border border-red-500/20 rounded-xl overflow-hidden">
              <div className="block sm:hidden divide-y divide-border">
                {redSignals.map((sig, i) => (
                  <div key={sig.id || i} className="p-3 space-y-1.5" data-testid={`card-red-${sig.id || i}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{sig.symbol.replace(".NS", "")}</div>
                        <div className="text-[10px] text-muted-foreground">{sig.companyName}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CategoryBadge details={sig.details} />
                        <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">RED</Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Price: <span className="font-mono text-foreground">₹{Number(sig.price).toFixed(2)}</span>
                    </div>
                    {sig.details && <div className="text-[10px] text-muted-foreground leading-relaxed">{sig.details}</div>}
                  </div>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-red-signals">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Category</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Price</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Zone Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redSignals.map((sig, i) => (
                      <tr key={sig.id || i} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium">{sig.symbol.replace(".NS", "")}</div>
                          <div className="text-xs text-muted-foreground">{sig.companyName}</div>
                        </td>
                        <td className="px-4 py-3"><CategoryBadge details={sig.details} /></td>
                        <td className="px-4 py-3 text-right font-mono">₹{Number(sig.price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[350px]">{sig.details || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !signals?.length && !isScanning && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Radar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm" data-testid="text-no-signals">
              No scan results yet. Click "Run Full Universe Scan" to analyze REIT/INVIT + Nifty LargeMidcap 250 stocks.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              The scan applies BIOS filter, Darvas breakout detection, and 2.75% avoid rule across the entire universe.
            </p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h3 className="font-semibold text-sm sm:text-base mb-2">Capital Allocation Rules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {[
              { icon: Target, color: "text-green-500", text: "Target: Entry × 1.06 (+6% profit)" },
              { icon: Shield, color: "text-red-500", text: "Stop Loss: Entry × 0.96 (-4% risk)" },
              { icon: Ban, color: "text-yellow-500", text: "Max 10 capital parts — each trade consumes 1 part" },
              { icon: AlertTriangle, color: "text-orange-500", text: "2.75% avoid rule prevents capital clustering" },
            ].map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <rule.icon className={`w-4 h-4 ${rule.color} shrink-0`} />
                <span className="text-xs sm:text-sm">{rule.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-[10px] sm:text-xs text-muted-foreground">
          Educational purposes only. Not financial advice. Scan results are based on end-of-day data from Yahoo Finance. Run scan after 3:45 PM IST for latest data.
        </div>
      </div>
    </DashboardLayout>
  );
}
