import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Radar, TrendingUp, TrendingDown } from "lucide-react";

type BohDetails = {
  indexInclusion?: string[];
  cmp?: number;
  high52?: number;
  highDate?: string;
  low52?: number;
  lowDate?: string;
  output?: string;
  zone?: string;
  action?: string;
  last5High?: number;
  lastBuyPrice?: number | null;
  suggestedBuyPrice?: number | null;
  avoidUpper?: number | null;
  avoidLower?: number | null;
  target?: number | null;
  capitalPerTrade?: number;
  riskWarning?: string;
};

function parseBohDetails(details?: string): BohDetails {
  if (!details) return {};
  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

function toTime(value?: string) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function actionRank(action?: string) {
  switch (action) {
    case "BUY":
      return 0;
    case "WATCH":
      return 1;
    case "AVOID_2_75":
      return 2;
    case "SKIP_WEEKLY_LIMIT":
      return 3;
    case "HOLD":
      return 4;
    case "SELL":
      return 5;
    case "EXIT":
      return 6;
    default:
      return 99;
  }
}

function ZoneBadge({ output }: { output: string }) {
  const isGreen = output.toLowerCase().includes("green");
  if (isGreen) {
    return (
      <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs">
        <TrendingUp className="w-3 h-3 mr-1" />{output}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs">
      <TrendingDown className="w-3 h-3 mr-1" />{output}
    </Badge>
  );
}

export default function StrategyBoh() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"stocks" | "etfs">("stocks");
  const [isScanningStocks, setIsScanningStocks] = useState(false);
  const [isScanningEtfs, setIsScanningEtfs] = useState(false);

  const strategyName = viewMode === "stocks" ? "boh-filter" : "boh-etf";
  const isScanning = viewMode === "stocks" ? isScanningStocks : isScanningEtfs;

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", strategyName],
    queryFn: () => fetch(`/api/signals?limit=500&strategy=${strategyName}`).then(r => r.json()),
    refetchInterval: isScanning ? 2000 : false,
  });

  async function handleScan() {
    setIsScanningStocks(true);
    setViewMode("stocks");
    try {
      const response = await apiRequest("POST", "/api/scan/boh-darvas");
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "boh-filter"] });
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "darvas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "BOH Scan Complete",
        description: result.message || `Analyzed ${result.bohCount ?? 0} stocks`,
      });
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message || "An error occurred while scanning.",
        variant: "destructive",
      });
    } finally {
      setIsScanningStocks(false);
    }
  }

  async function handleEtfScan() {
    setIsScanningEtfs(true);
    setViewMode("etfs");
    try {
      const response = await apiRequest("POST", "/api/scan/boh-etf");
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "boh-etf"] });
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "darvas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "ETF Scan Complete",
        description: result.message || `Analyzed ${result.bohCount ?? 0} ETFs`,
      });
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message || "An error occurred while scanning.",
        variant: "destructive",
      });
    } finally {
      setIsScanningEtfs(false);
    }
  }

  const rows = (signals || []).map((sig) => {
    const details = parseBohDetails(sig.details);
    const output = details.output || (sig.signal === "GREEN" ? "Stock in green zone" : "Stock in red zone");
    return {
      id: sig.id,
      symbol: sig.symbol,
      name: sig.companyName || sig.symbol.replace(".NS", ""),
      cmp: details.cmp ?? sig.price,
      high52: details.high52,
      highDate: details.highDate,
      low52: details.low52,
      lowDate: details.lowDate,
      output,
      zone: details.zone || sig.signal,
      action: details.action,
      last5High: details.last5High,
      lastBuyPrice: details.lastBuyPrice ?? null,
      suggestedBuyPrice: details.suggestedBuyPrice ?? null,
      avoidUpper: details.avoidUpper ?? null,
      avoidLower: details.avoidLower ?? null,
      target: details.target ?? null,
      capitalPerTrade: details.capitalPerTrade,
      riskWarning: details.riskWarning,
    };
  });

  function entryRank(row: { action?: string; lastBuyPrice?: number | null }) {
    if (row.action === "BUY") return 0;
    if (row.lastBuyPrice !== null && row.lastBuyPrice !== undefined) return 1;
    return 2;
  }

  const greenCount = rows.filter(r => r.zone === "GREEN").length;
  const redCount = rows.filter(r => r.zone === "RED").length;
  const displayedRows = [...rows].sort((a, b) => {
    const entryDiff = entryRank(a) - entryRank(b);
    if (entryDiff !== 0) return entryDiff;

    const zoneDiff = (a.zone === "GREEN" ? 0 : 1) - (b.zone === "GREEN" ? 0 : 1);
    if (zoneDiff !== 0) return zoneDiff;

    const actionDiff = actionRank(a.action) - actionRank(b.action);
    if (actionDiff !== 0) return actionDiff;

    const primaryDateDiff = a.zone === "GREEN"
      ? toTime(b.lowDate) - toTime(a.lowDate)
      : toTime(b.highDate) - toTime(a.highDate);
    if (primaryDateDiff !== 0) return primaryDateDiff;

    return a.symbol.localeCompare(b.symbol);
  });

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">
              {viewMode === "stocks" ? "Nifty Large Midcap 250" : "NSE ETFs"}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Darvas zone filter — compares 52-week high/low dates to classify GREEN or RED zones.
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Zone must be checked before every new weekly order.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleScan}
              disabled={isScanningStocks || isScanningEtfs}
              variant={viewMode === "stocks" ? "default" : "secondary"}
              data-testid="button-scan-boh"
              className="w-full sm:w-auto shrink-0"
            >
              {isScanningStocks ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
              ) : (
                <><Radar className="w-4 h-4 mr-2" />Scan Nifty Large Midcap 250</>
              )}
            </Button>
            <Button
              onClick={handleEtfScan}
              disabled={isScanningStocks || isScanningEtfs}
              variant={viewMode === "etfs" ? "default" : "secondary"}
              className="w-full sm:w-auto shrink-0"
            >
              {isScanningEtfs ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
              ) : (
                <><Radar className="w-4 h-4 mr-2" />Scan ETFs</>
              )}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-4">Step-by-Step Strategy Execution</h2>
          <div className="space-y-4">
            
            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
              <h3 className="text-sm font-semibold mb-1">Zone Classification (BOH Filter)</h3>
              <p className="text-xs text-muted-foreground mb-2">
                We compare the 52-week High Date and 52-week Low Date.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-green-500/5 border border-green-500/20 rounded p-2">
                  <span className="text-xs font-semibold text-green-600 block mb-0.5">GREEN ZONE (Uptrend)</span>
                  <span className="text-[10px] text-muted-foreground">52W Low Date is MORE RECENT than High Date. Safe to trade.</span>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded p-2">
                  <span className="text-xs font-semibold text-red-600 block mb-0.5">RED ZONE (Downtrend)</span>
                  <span className="text-[10px] text-muted-foreground">52W High Date is MORE RECENT than Low Date. Avoid fresh entries.</span>
                </div>
              </div>
            </div>

            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
              <h3 className="text-sm font-semibold mb-1">Darvas Box Breakout Logic</h3>
              <p className="text-xs text-muted-foreground">
                For <strong>GREEN ZONE</strong> stocks only:
                <br />1. Identify the highest high of the last 5 trading days.
                <br />2. <strong>Buy Signal</strong> is generated if the price breaks above this Last 5-Day High.
              </p>
            </div>

            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
              <h3 className="text-sm font-semibold mb-1">Advanced Darvas 2.75% Avoid Rule</h3>
              <p className="text-xs text-muted-foreground">
                If you already hold this stock:
                <br />Check your previous buy price. If the new breakout is within <strong>±2.75%</strong> of your last entry, <strong>SKIP</strong> the trade to avoid clustering orders at the same level.
              </p>
            </div>

            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">4</span>
              <h3 className="text-sm font-semibold mb-1">Capital Management Rule</h3>
              <p className="text-xs text-muted-foreground">
                Divide total capital into 10 equal parts. Deploy only 1 part per trade. Maximum 1 order per stock per week.
              </p>
            </div>

            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">5</span>
              <h3 className="text-sm font-semibold mb-1">Profit Booking Rule</h3>
              <p className="text-xs text-muted-foreground">
                Set a target of <strong>6% above average price</strong>. Sell immediately when target is hit.
              </p>
            </div>

            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">6</span>
              <h3 className="text-sm font-semibold mb-1">Risk Exit Rule</h3>
              <p className="text-xs text-muted-foreground">
                Exit if price falls below Darvas support (Last 5-Day Low).
                <br />Do not start new trades if stock shifts from GREEN to RED zone.
              </p>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          {[
            { label: "Lookback", value: "52 Weeks" },
            { label: "Data Points", value: "1 Year" },
            { label: "Green Stocks", value: signals ? `${greenCount}` : "—" },
            { label: "Red Stocks", value: signals ? `${redCount}` : "—" },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
              <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className="text-base sm:text-xl font-bold">{item.value}</div>
            </div>
          ))}
        </div>


        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">{viewMode === "stocks" ? "Nifty Large Midcap 250" : "NSE ETFs"} (GREEN first)</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading signals...</div>
            ) : !rows.length ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm" data-testid="text-no-signals">
                No zone data yet. Click "{viewMode === "stocks" ? "Scan Nifty Large Midcap 250" : "Scan ETFs"}" to analyze.
              </div>
            ) : (
              <>
                <div className="block sm:hidden divide-y divide-border">
                  {displayedRows.map((row, i) => (
                    <div key={row.id || i} className="p-3 space-y-2" data-testid={`card-signal-${row.id || i}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">NSE:{row.symbol.replace(".NS", "").replace(".BO", "")}</div>
                          <div className="text-[10px] text-muted-foreground">{row.name}</div>
                        </div>
                        <ZoneBadge output={row.output} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Low Date: <span className="font-mono text-foreground">{formatDate(row.lowDate)}</span></div>
                        <div>CMP: <span className="font-mono text-foreground">{row.cmp ? `₹${Number(row.cmp).toFixed(2)}` : "—"}</span></div>
                        <div>52W High: <span className="font-mono text-foreground">{row.high52 ? `₹${Number(row.high52).toFixed(2)}` : "—"}</span></div>
                        <div>52W High Date: <span className="font-mono text-foreground">{formatDate(row.highDate)}</span></div>
                        <div>52W Low: <span className="font-mono text-foreground">{row.low52 ? `₹${Number(row.low52).toFixed(2)}` : "—"}</span></div>
                        <div>Output: <ZoneBadge output={row.output} /></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-signals">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">NSE Code of Stock</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">CMP</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">52 Weeks High</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">52 Weeks High Date</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">52 Weeks Low</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">52 Weeks Low Date</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Output for GTT Order Starting</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRows.map((row, i) => (
                        <tr key={row.id || i} className="border-b border-border last:border-0" data-testid={`row-signal-${row.id || i}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium">NSE:{row.symbol.replace(".NS", "").replace(".BO", "")}</div>
                            <div className="text-xs text-muted-foreground">{row.name}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{row.cmp ? `₹${Number(row.cmp).toFixed(2)}` : "—"}</td>
                          <td className="px-4 py-3 text-right font-mono">{row.high52 ? `₹${Number(row.high52).toFixed(2)}` : "—"}</td>
                          <td className="px-4 py-3">{formatDate(row.highDate)}</td>
                          <td className="px-4 py-3 text-right font-mono">{row.low52 ? `₹${Number(row.low52).toFixed(2)}` : "—"}</td>
                          <td className="px-4 py-3">{formatDate(row.lowDate)}</td>
                          <td className="px-4 py-3"><ZoneBadge output={row.output} /></td>
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
          Educational purposes only. Not financial advice. BIOS zones change as market conditions evolve.
        </div>
      </div>
    </DashboardLayout>
  );
}
