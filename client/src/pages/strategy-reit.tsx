import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Radar, Building2, TrendingUp, TrendingDown } from "lucide-react";

const UNIVERSE = [
  { symbol: "IRBINVIT.NS", name: "IRB InvIT Fund", type: "INVIT", bseCode: "BOM:540526" },
  { symbol: "PGINVIT.NS", name: "PowerGrid Infrastructure Investment Trust", type: "INVIT", bseCode: "BOM:543290" },
  { symbol: "NXST.NS", name: "Nexus Select Trust", type: "INVIT", bseCode: "BOM:543913" },
  { symbol: "EMBASSY.NS", name: "Embassy Office Parks REIT", type: "REIT", bseCode: "BOM:542602" },
  { symbol: "BIRET.NS", name: "Brookfield India Real Estate Trust", type: "REIT", bseCode: "BOM:543261" },
  { symbol: "INDUSINVIT.BO", name: "Bharat Highways InvIT", type: "INVIT", bseCode: "BOM:543317" },
  { symbol: "INDIGRID.NS", name: "India Grid Trust", type: "INVIT", bseCode: "BOM:540565" },
  { symbol: "MINDSPACE.NS", name: "Mindspace Business Parks REIT", type: "REIT", bseCode: "BOM:543217" },
];

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

type ReitDetails = {
  bseCode?: string;
  cmp?: number;
  high52?: number;
  highDate?: string;
  low52?: number;
  lowDate?: string;
  output?: string;
  zone?: string;
  last5High?: number;
  suggestedBuyPrice?: number | null;
  avoidUpper?: number | null;
  avoidLower?: number | null;
  target?: number | null;
  capitalPerTrade?: number;
  riskWarning?: string;
};

function parseReitDetails(details?: string): ReitDetails {
  if (!details) return {};
  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
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

export default function StrategyReit() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "reit-invit"],
    queryFn: () => fetch("/api/signals?limit=100&strategy=reit-invit").then(r => r.json()),
  });

  const rows = (signals || []).map((sig) => {
    const details = parseReitDetails(sig.details);
    const universeMatch = UNIVERSE.find((item) => item.symbol === sig.symbol);
    const bseCode = details.bseCode || universeMatch?.bseCode || "—";
    const output = details.output || (sig.signal === "GREEN" ? "Stock in green zone" : sig.signal === "RED" ? "Stock in red zone" : "—");
    return {
      id: sig.id,
      symbol: sig.symbol,
      name: sig.companyName || universeMatch?.name || sig.symbol.replace(".NS", ""),
      bseCode,
      cmp: details.cmp ?? sig.price,
      high52: details.high52,
      highDate: details.highDate,
      low52: details.low52,
      lowDate: details.lowDate,
      output,
      zone: details.zone || sig.signal,
      last5High: details.last5High,
      suggestedBuyPrice: details.suggestedBuyPrice ?? null,
      avoidUpper: details.avoidUpper ?? null,
      avoidLower: details.avoidLower ?? null,
      target: details.target ?? null,
      capitalPerTrade: details.capitalPerTrade,
      riskWarning: details.riskWarning,
    };
  });

  const rowsBySymbol = new Map(rows.map((row) => [row.symbol, row]));
  const orderedRows = [
    ...UNIVERSE.map((item) => rowsBySymbol.get(item.symbol)).filter(Boolean),
    ...rows.filter((row) => !rowsBySymbol.has(row.symbol) || !UNIVERSE.find((item) => item.symbol === row.symbol)),
  ] as typeof rows;

  async function handleScan() {
    setIsScanning(true);
    try {
      const response = await apiRequest("POST", "/api/scan/reit");
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "reit-invit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "REIT/INVIT Scan Complete",
        description: result.message || `Scanned ${result.count ?? 0} instruments.`,
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
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">REIT & INVIT Strategy</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Breakout-based trading on Indian REITs and INVITs with volume confirmation, 50 DMA trend filter, and defined risk management.
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Zone must be checked before every new weekly order.
            </p>
          </div>
          <Button
            onClick={handleScan}
            disabled={isScanning}
            data-testid="button-scan-reit"
            className="w-full sm:w-auto shrink-0"
          >
            {isScanning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
            ) : (
              <><Radar className="w-4 h-4 mr-2" />Scan REIT/INVIT</>
            )}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-3">Universe</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {UNIVERSE.map((item) => (
              <div key={item.symbol} className="flex items-center gap-2.5 border border-border rounded-lg px-3 py-2.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-medium truncate">{item.symbol.replace(".NS", "")}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{item.name}</div>
                </div>
                <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">{item.type}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-3">BUY Conditions (All Must Be True)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {[
              "Close > Highest High of last 5 trading days (box breakout)",
              "Breakout day volume > 1.5 × average volume of last 5 days",
              "Close > 50-day Moving Average (trend confirmation)",
              "Not within 2% of major 1-year resistance level",
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] sm:text-xs font-bold text-green-500">{i + 1}</span>
                </div>
                <div className="text-xs sm:text-sm">{rule}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-4">Step-by-Step Strategy Execution</h2>
          <div className="space-y-4">
            
            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
              <h3 className="text-sm font-semibold mb-1">Zone Classification</h3>
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
                If you already hold this instrument:
                <br />Check your previous buy price. If the new breakout is within <strong>±2.75%</strong> of your last entry, <strong>SKIP</strong> the trade to avoid clustering orders at the same level.
              </p>
            </div>

            <div className="border-l-2 border-primary/20 pl-4 relative">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">4</span>
              <h3 className="text-sm font-semibold mb-1">Capital Management Rule</h3>
              <p className="text-xs text-muted-foreground">
                Divide total capital into 10 equal parts. Deploy only 1 part per trade. Maximum 1 order per instrument per week.
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
            { label: "Breakout Window", value: "5 Days" },
            { label: "Volume Threshold", value: "1.5×" },
            { label: "Trend Filter", value: "50 DMA" },
            { label: "Resistance Check", value: "2% Zone" },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
              <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className="text-base sm:text-xl font-bold">{item.value}</div>
            </div>
          ))}
        </div>


        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">REIT and INVIT</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading signals...</div>
            ) : !orderedRows.length ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm" data-testid="text-no-signals">
                No signals yet. Click "Scan REIT/INVIT" to analyze all instruments.
              </div>
            ) : (
              <>
                <div className="block sm:hidden divide-y divide-border">
                  {orderedRows.map((row, i) => (
                    <div key={row.id || i} className="p-3 space-y-2" data-testid={`card-signal-${row.id || i}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{row.name}</div>
                          <div className="text-[10px] text-muted-foreground">{row.bseCode}</div>
                        </div>
                        <ZoneBadge output={row.output || "—"} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>CMP: <span className="font-mono text-foreground">{row.cmp ? `₹${Number(row.cmp).toFixed(2)}` : "—"}</span></div>
                        <div>52W High: <span className="font-mono text-foreground">{row.high52 ? `₹${Number(row.high52).toFixed(2)}` : "—"}</span></div>
                        <div>52W High Date: <span className="font-mono text-foreground">{formatDate(row.highDate)}</span></div>
                        <div>52W Low: <span className="font-mono text-foreground">{row.low52 ? `₹${Number(row.low52).toFixed(2)}` : "—"}</span></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-signals">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name of REIT and InVIT</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">BSE Code</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">CMP</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">52 Weeks High</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">52 Weeks High Date</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">52 Weeks Low</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Output for GTT Order Starting</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedRows.map((row, i) => (
                        <tr key={row.id || i} className="border-b border-border last:border-0" data-testid={`row-signal-${row.id || i}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-xs text-muted-foreground">{row.symbol.replace(".NS", "")}</div>
                          </td>
                          <td className="px-4 py-3">{row.bseCode}</td>
                          <td className="px-4 py-3 text-right font-mono">{row.cmp ? `₹${Number(row.cmp).toFixed(2)}` : "—"}</td>
                          <td className="px-4 py-3 text-right font-mono">{row.high52 ? `₹${Number(row.high52).toFixed(2)}` : "—"}</td>
                          <td className="px-4 py-3">{formatDate(row.highDate)}</td>
                          <td className="px-4 py-3 text-right font-mono">{row.low52 ? `₹${Number(row.low52).toFixed(2)}` : "—"}</td>
                          <td className="px-4 py-3"><ZoneBadge output={row.output || "—"} /></td>
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
          Educational purposes only. Not financial advice. REIT/INVIT investments carry market risk. Past performance does not guarantee future results.
        </div>
      </div>
    </DashboardLayout>
  );
}
