import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Award, Trophy, BarChart3, Star, Hash } from "lucide-react";

function RankBadge({ rank, total }: { rank: number; total: number }) {
  const pct = (rank / total) * 100;
  if (pct <= 33) return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs"><Trophy className="w-3 h-3 mr-1" />#{rank}</Badge>;
  if (pct <= 66) return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs">#{rank}</Badge>;
  return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs">#{rank}</Badge>;
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold w-14 text-right">{score}/{max}</span>
    </div>
  );
}

export default function StrategyMarking() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [universeSize, setUniverseSize] = useState(15);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "marking"],
    queryFn: () => fetch("/api/signals?limit=200&strategy=marking").then(r => r.json()),
  });

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/marking", { universeSize });
      const result = await response.json();
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "marking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Marking Scan Complete", description: `Ranked ${result.total_scanned} stocks` });
    } catch (error: any) {
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  }

  const hasScannedData = scanResult?.all_results?.length > 0;
  const dataSource = hasScannedData ? scanResult.all_results : [];
  const n = dataSource.length;
  const bestBuy = scanResult?.best_buy;
  const mostExpensive = scanResult?.most_expensive;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6" data-testid="page-marking">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">Relative Valuation Marking</h2>
            <p className="text-sm text-muted-foreground mt-1">Class 11 — PE + PB + PS + EV/EBITDA Rank-Based Scoring</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Universe:</span>
              <select value={universeSize} onChange={e => setUniverseSize(+e.target.value)} className="h-8 text-xs border rounded px-2 bg-background" data-testid="select-universe">
                <option value={15}>Top 15</option>
                <option value={30}>Top 30</option>
                <option value={50}>Top 50</option>
              </select>
            </div>
            <Button onClick={handleScan} disabled={isScanning} size="sm" data-testid="button-scan-marking">
              {isScanning ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Scanning...</> : <><Award className="w-4 h-4 mr-1" />Run Marking</>}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Hash className="w-4 h-4" /><span className="text-xs">Stocks Ranked</span></div>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-ranked">{scanResult?.total_scanned ?? signals?.length ?? "—"}</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Star className="w-4 h-4 text-yellow-500" /><span className="text-xs">Max Marks</span></div>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-max">{n > 0 ? n * 4 : "—"}</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Trophy className="w-4 h-4 text-green-500" /><span className="text-xs">#1 Stock</span></div>
            <div className="text-lg sm:text-xl font-bold text-green-600" data-testid="stat-top">{bestBuy?.symbol?.replace(".NS", "") ?? dataSource[0]?.symbol?.replace(".NS", "") ?? "—"}</div>
            <div className="text-[10px] text-muted-foreground">Best Buy (Most Undervalued)</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><BarChart3 className="w-4 h-4" /><span className="text-xs">#1 Score</span></div>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-top-score">{(bestBuy?.totalScore ?? dataSource[0]?.totalScore ?? dataSource[0]?.totalMarks) ?? "—"}{(bestBuy || dataSource[0]) ? `/${(bestBuy?.maxScore ?? dataSource[0]?.maxScore ?? dataSource[0]?.maxMarks)}` : ""}</div>
            <div className="text-[10px] text-muted-foreground">Lowest Rank = Most Expensive</div>
          </div>
        </div>


        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-3">Marking System Logic</h3>
          <div className="bg-muted/50 rounded-lg p-3 text-xs sm:text-sm space-y-2">
            <p>For each valuation ratio (PE, PB, PS, EV/EBITDA):</p>
            <p className="font-mono">Sort ascending → Lowest ratio = N marks, Highest ratio = 1 mark</p>
            <p className="font-mono">Total Marks = PE_Marks + PB_Marks + PS_Marks + EV/EBITDA_Marks</p>
            <p>Maximum possible = N × 4 | <span className="text-green-600 font-semibold">Highest score = Most undervalued (relative)</span></p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-2">Key Concept</h3>
          <p className="text-xs text-muted-foreground">This is a <span className="font-bold text-foreground">relative valuation</span> system. It does NOT say a stock is cheap historically — it identifies which stocks are cheapest <span className="font-bold text-foreground">relative to peers</span> in the same index. Compare across the same universe only.</p>
        </div>

        {isLoading && !hasScannedData && (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        )}

        {(hasScannedData || (signals && signals.length > 0)) && (
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              {hasScannedData ? `Valuation Rankings (${n} stocks)` : `Signals (${signals?.length})`}
            </h3>
            <div className="block sm:hidden space-y-2">
              {(hasScannedData ? dataSource : signals)?.map((item: any, idx: number) => (
                <div key={idx} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.symbol?.replace(".NS", "")}</span>
                    {hasScannedData ? <RankBadge rank={item.rank} total={n} /> : <Badge variant="outline" className="text-[10px]">{item.signal}</Badge>}
                  </div>
                  {hasScannedData ? (
                    <>
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                      <div className="flex items-center justify-between">
                        <ScoreBar score={item.totalScore ?? item.totalMarks} max={item.maxScore ?? item.maxMarks} />
                        {idx === 0 && <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs">Best Buy</Badge>}
                        {idx === n - 1 && <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs">Most Expensive</Badge>}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                        <span>PE: {item.pe}</span>
                        <span>PB: {item.pb}</span>
                        <span>PS: {item.ps}</span>
                        <span>EV/EBITDA: {item.evEbitda}</span>
                      </div>
                    </>
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
                    {hasScannedData ? (
                      <>
                        <th className="pb-2 pr-3">Company Name</th>
                        <th className="pb-2 pr-3">Symbol</th>
                        <th className="pb-2 pr-3">P/E</th>
                        <th className="pb-2 pr-3">P/E based marking</th>
                        <th className="pb-2 pr-3">P/B</th>
                        <th className="pb-2 pr-3">P/B based marking</th>
                        <th className="pb-2 pr-3">P/S</th>
                        <th className="pb-2 pr-3">P/S based marking</th>
                        <th className="pb-2 pr-3">EV/EBITDA</th>
                        <th className="pb-2 pr-3">EV/EBITDA based marking</th>
                        <th className="pb-2 pr-3">Total Marks</th>
                      </>
                    ) : (
                      <>
                        <th className="pb-2 pr-3">Symbol</th>
                        <th className="pb-2 pr-3">Price</th>
                        <th className="pb-2 pr-3">Signal</th>
                        <th className="pb-2">Details</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(hasScannedData ? dataSource : signals)?.map((item: any, idx: number) => (
                    <tr key={idx} className={`border-b border-border/50 ${hasScannedData && idx === 0 ? "bg-green-50/50 dark:bg-green-900/10" : idx === n - 1 ? "bg-red-50/50 dark:bg-red-900/10" : ""}`} data-testid={`row-marking-${idx}`}>
                      {hasScannedData ? (
                        <>
                          <td className="py-2 pr-3 font-medium">{item.name}
                            {idx === 0 && <span className="ml-2 text-[10px] text-green-600 font-bold">(Best Buy)</span>}
                            {idx === n - 1 && <span className="ml-2 text-[10px] text-red-600 font-bold">(Most Expensive)</span>}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">{item.symbol?.replace(".NS", "")}</td>
                          <td className="py-2 pr-3">{item.pe}</td>
                          <td className="py-2 pr-3 font-semibold text-blue-600">{item.peMarks}</td>
                          <td className="py-2 pr-3">{item.pb}</td>
                          <td className="py-2 pr-3 font-semibold text-blue-600">{item.pbMarks}</td>
                          <td className="py-2 pr-3">{item.ps}</td>
                          <td className="py-2 pr-3 font-semibold text-blue-600">{item.psMarks}</td>
                          <td className="py-2 pr-3">{item.evEbitda}</td>
                          <td className="py-2 pr-3 font-semibold text-blue-600">{item.evEbitdaMarks}</td>
                          <td className="py-2 pr-3 font-bold text-lg">{item.totalScore ?? item.totalMarks}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 pr-3 font-medium">{item.symbol?.replace(".NS", "")}</td>
                          <td className="py-2 pr-3">₹{item.price?.toLocaleString()}</td>
                          <td className="py-2 pr-3"><Badge variant="outline" className="text-[10px]">{item.signal}</Badge></td>
                          <td className="py-2 text-muted-foreground">{item.details}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">Relative Valuation Marking System — Class 11 Strategy. For educational purposes only.</p>
      </div>
    </DashboardLayout>
  );
}
