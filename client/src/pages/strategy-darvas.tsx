import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Radar, TrendingUp, TrendingDown, Eye, Shield, AlertTriangle } from "lucide-react";

function SignalBadge({ signal }: { signal: string }) {
  const upper = signal.toUpperCase();
  if (upper === "BUY") {
    return (
      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs">
        <TrendingUp className="w-3 h-3 mr-1" />BUY
      </Badge>
    );
  }
  if (upper === "SELL") {
    return (
      <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs">
        <TrendingDown className="w-3 h-3 mr-1" />SELL
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs">
      <Eye className="w-3 h-3 mr-1" />WATCH
    </Badge>
  );
}

export default function StrategyDarvas() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "darvas"],
    queryFn: () => fetch("/api/signals?limit=50&strategy=darvas").then(r => r.json()),
  });

  async function handleScan() {
    setIsScanning(true);
    try {
      const response = await apiRequest("POST", "/api/scan/boh-darvas");
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "darvas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "boh-filter"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Advanced Darvas + BOH Scan Complete",
        description: result.message || `Generated ${result.darvasCount ?? 0} Darvas signals`,
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

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">Advanced Darvas Box + BOH</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              3-layer trading system: BIOS market direction filter, Darvas Box breakout entry, and 2.75% capital protection avoid rule.
            </p>
          </div>
          <Button
            onClick={handleScan}
            disabled={isScanning}
            data-testid="button-scan-darvas"
            className="w-full sm:w-auto shrink-0"
          >
            {isScanning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
            ) : (
              <><Radar className="w-4 h-4 mr-2" />Run BOH + Darvas Scan</>
            )}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-500">1</span>
            </div>
            <h2 className="font-semibold text-sm sm:text-base">Layer 1: BIOS (BOH) Filter — Market Direction</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="flex items-start gap-2 bg-green-500/5 border border-green-500/20 rounded-lg p-3">
              <Shield className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs sm:text-sm font-medium text-green-500">GREEN Zone (Uptrend)</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  52-week LOW date is older, HIGH date is recent. Stock moved LOW → HIGH. New Darvas trades allowed.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs sm:text-sm font-medium text-red-500">RED Zone (Downtrend)</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  52-week HIGH date is older, LOW date is recent. Stock moved HIGH → LOW. No new trades — exit at 6%.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-500">2</span>
            </div>
            <h2 className="font-semibold text-sm sm:text-base">Layer 2: Darvas Box Breakout Entry</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {[
              "Find Highest High of last 5 trading days (Darvas level / GTT trigger)",
              "BUY if Close > 5-day Highest High with volume > 1.5× average",
              "Only enter when BIOS zone is GREEN (uptrend confirmed)",
              "Stop loss at Box Bottom (lowest low of last 5 days)",
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

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-500">3</span>
            </div>
            <h2 className="font-semibold text-sm sm:text-base">Layer 3: Advanced 2.75% Avoid Rule</h2>
          </div>
          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-muted-foreground">
              When you buy at price ₹X, calculate the avoid zone:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="border border-border rounded-lg p-3">
                <div className="text-[10px] sm:text-xs text-muted-foreground">Upper Avoid</div>
                <div className="text-sm sm:text-base font-mono font-bold">Entry × 1.0275</div>
              </div>
              <div className="border border-border rounded-lg p-3">
                <div className="text-[10px] sm:text-xs text-muted-foreground">Lower Avoid</div>
                <div className="text-sm sm:text-base font-mono font-bold">Entry × 0.9725</div>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              If the next breakout price falls inside this ±2.75% range, the trade is SKIPPED. This prevents buying at clustered price levels (e.g. 343, 345, 346, 347) which trap capital.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
            <h3 className="font-semibold text-sm sm:text-base mb-2">Target & Stop Loss</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Target</span>
                <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-xs">Entry × 1.06 (+6%)</Badge>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Stop Loss</span>
                <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-xs">Box Bottom (5d Low)</Badge>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
            <h3 className="font-semibold text-sm sm:text-base mb-2">Sell Conditions (Any One)</h3>
            <div className="space-y-2">
              {[
                "Target hit (+6%)",
                "Close < Breakout level",
                "Close < 50 DMA",
                "BIOS zone turns RED",
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[8px] sm:text-[10px] font-bold text-red-500">{i + 1}</span>
                  </div>
                  <div className="text-xs sm:text-sm">{rule}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          {[
            { label: "Box Period", value: "5 Days" },
            { label: "Volume Threshold", value: "1.5×" },
            { label: "Avoid Zone", value: "±2.75%" },
            { label: "Target", value: "+6%" },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
              <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className="text-base sm:text-xl font-bold">{item.value}</div>
            </div>
          ))}
        </div>


        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Darvas Signals</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading signals...</div>
            ) : !signals?.length ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm" data-testid="text-no-signals">
                No signals yet. Click "Run BOH + Darvas Scan" to analyze NIFTY stocks.
              </div>
            ) : (
              <>
                <div className="block sm:hidden divide-y divide-border">
                  {signals.map((sig, i) => (
                    <div key={sig.id || i} className="p-3 space-y-1.5" data-testid={`card-signal-${sig.id || i}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{sig.symbol.replace(".NS", "")}</div>
                          <div className="text-[10px] text-muted-foreground">{sig.companyName}</div>
                        </div>
                        <SignalBadge signal={sig.signal} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Price: <span className="font-mono text-foreground">{sig.price ? `₹${Number(sig.price).toFixed(2)}` : "—"}</span></span>
                        {sig.target && <span>Target: <span className="font-mono text-foreground">₹{Number(sig.target).toFixed(2)}</span></span>}
                      </div>
                      {sig.details && <div className="text-[10px] text-muted-foreground leading-relaxed">{sig.details}</div>}
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-signals">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Signal</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Price</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Target</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Analysis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signals.map((sig, i) => (
                        <tr key={sig.id || i} className="border-b border-border last:border-0" data-testid={`row-signal-${sig.id || i}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium">{sig.symbol.replace(".NS", "")}</div>
                            <div className="text-xs text-muted-foreground">{sig.companyName}</div>
                          </td>
                          <td className="px-4 py-3"><SignalBadge signal={sig.signal} /></td>
                          <td className="px-4 py-3 text-right font-mono">{sig.price ? `₹${Number(sig.price).toFixed(2)}` : "—"}</td>
                          <td className="px-4 py-3 text-right font-mono">{sig.target ? `₹${Number(sig.target).toFixed(2)}` : "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground max-w-[350px]">{sig.details || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-[10px] sm:text-xs text-muted-foreground">
          Educational purposes only. Not financial advice. The 2.75% avoid rule and BIOS filter are capital protection mechanisms — they do not guarantee profits.
        </div>
      </div>
    </DashboardLayout>
  );
}
