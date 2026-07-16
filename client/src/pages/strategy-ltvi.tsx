import { useEffect, useState } from "react";
import { formatDetails } from "@/lib/format-details";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Trophy, TrendingUp, Star, ArrowUpDown } from "lucide-react";

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 5) return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs"><Trophy className="w-3 h-3 mr-1" />#{rank}</Badge>;
  if (rank <= 15) return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs">#{rank}</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-border text-[10px] sm:text-xs">#{rank}</Badge>;
}

export default function StrategyLtvi() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [universeSize, setUniverseSize] = useState(300);
  const [progress, setProgress] = useState<{ total: number; processed: number; percent: number; stage: string } | null>(null);
  const [sheetMode, setSheetMode] = useState(false);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "ltvi"],
    queryFn: () => fetch("/api/signals?limit=200&strategy=ltvi").then(r => r.json()),
  });

  async function handleScan() {
    if (isScanning) return;
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/ltvi", { universeSize, sheetMode });
      const result = await response.json();
      if (result?.message === "scan in progress") {
        // Another scan is running; keep spinner and rely on progress poller
        setProgress({ total: result.total || 0, processed: result.processed || 0, percent: result.percent || 0, stage: result.stage || "fetching" });
      } else {
        setScanResult(result);
        queryClient.invalidateQueries({ queryKey: ["/api/signals", "ltvi"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        toast({ title: "LTVI Scan Complete", description: `Ranked ${result.total_scanned} stocks by value` });
        setIsScanning(false);
        setProgress(null);
      }
    } catch (error: any) {
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
      setIsScanning(false);
      setProgress(null);
    } finally {
    }
  }

  const hasScannedData = scanResult?.all_results?.length > 0;
  const dataSource = hasScannedData ? scanResult.all_results : (signals ?? []);
  const top10 = hasScannedData ? scanResult.top_10 || dataSource.slice(0, 10) : [];

  // No auto-scan on mount; user clicks the button to run a scan

  // Poll progress while scanning
  useEffect(() => {
    let timer: any;
    let aborted = false;
    async function poll() {
      try {
        const res = await fetch("/api/ltvi/status");
        if (res.ok) {
          const j = await res.json();
          if (!aborted) {
            setProgress({ total: j.total || 0, processed: j.processed || 0, percent: j.percent || 0, stage: j.stage || "idle" });
            if (j.stage === "complete" || j.stage === "idle" || j.stage === "error") {
              setIsScanning(false);
              queryClient.invalidateQueries({ queryKey: ["/api/signals", "ltvi"] });
            }
          }
        }
      } catch {}
    }
    if (isScanning) {
      poll();
      timer = setInterval(poll, 2000);
    }
    return () => {
      aborted = true;
      if (timer) clearInterval(timer);
    };
  }, [isScanning]);

  // Stop polling when scanning ends

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6" data-testid="page-ltvi">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">Long Term Value Index</h2>
            <p className="text-sm text-muted-foreground mt-1">Class 10 â€” LTVI = PB + PE + P/NSPS + P/RONW (Lower = Better)</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Universe:</span>
              <input type="number" min={50} max={1000} value={universeSize} onChange={e => setUniverseSize(Math.max(50, Math.min(1000, +e.target.value)))} className="w-20 h-8 text-xs border rounded px-2 bg-background" />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={sheetMode} onChange={e => setSheetMode(e.target.checked)} />
              Sheet Mode
            </label>
            <Button onClick={handleScan} disabled={isScanning} size="sm" data-testid="button-scan-ltvi">
              {isScanning ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Scanning...</> : <><BarChart3 className="w-4 h-4 mr-1" />Run LTVI Scan</>}
            </Button>
          </div>
        </div>

        {isScanning && (
          <div className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Fetching live pricesâ€¦</span>
              <span>{progress ? `${progress.processed}/${progress.total} (${progress.percent || 0}%)` : "Startingâ€¦"}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded">
              <div className="h-2 bg-primary rounded" style={{ width: `${progress?.percent || 0}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><BarChart3 className="w-4 h-4" /><span className="text-xs">Stocks Analyzed</span></div>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-scanned">{scanResult?.total_scanned ?? signals?.length ?? "â€”"}</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Star className="w-4 h-4 text-green-500" /><span className="text-xs">SIP Candidates</span></div>
            <div className="text-xl sm:text-2xl font-bold text-green-600" data-testid="stat-sip">{scanResult?.sip_candidates ?? "â€”"}</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Trophy className="w-4 h-4 text-yellow-500" /><span className="text-xs">Best LTVI</span></div>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-best">{top10[0]?.ltvi ?? "â€”"}</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><ArrowUpDown className="w-4 h-4" /><span className="text-xs">Worst LTVI</span></div>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-worst">{dataSource.length > 0 ? dataSource[dataSource.length - 1]?.ltvi : "â€”"}</div>
          </div>
        </div>


        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-3">LTVI Formula</h3>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs sm:text-sm text-center">
            LTVI = P/B + P/E + P/NSPS + P/RONW <span className="text-muted-foreground ml-2">(Lower = More Undervalued)</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2"><span className="font-bold text-blue-500">P/B</span> Price / Book Value</div>
            <div className="flex items-start gap-2"><span className="font-bold text-green-500">P/E</span> Price / Earnings</div>
            <div className="flex items-start gap-2"><span className="font-bold text-purple-500">P/NSPS</span> Price / Net Sales Per Share</div>
            <div className="flex items-start gap-2"><span className="font-bold text-orange-500">P/RONW</span> Price / Return on Net Worth</div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-2">Filters Applied</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Book Value &gt; 0</Badge>
            <Badge variant="outline">EPS &gt; 0</Badge>
            <Badge variant="outline">RONW &gt; 0</Badge>
            <Badge variant="outline">Revenue &gt; 0</Badge>
            <Badge variant="outline">Sorted: LTVI Ascending</Badge>
            <Badge variant="outline">Top 10 â†’ SIP Portfolio</Badge>
          </div>
        </div>

        {isLoading && !hasScannedData && (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        )}

        {(hasScannedData || (signals && signals.length > 0)) && (
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              {hasScannedData ? `LTVI Rankings (${dataSource.length} stocks)` : `Signals (${signals?.length})`}
            </h3>
            <div className="block sm:hidden space-y-2">
              {(hasScannedData ? dataSource : signals)?.slice(0, 30).map((item: any, idx: number) => (
                <div key={idx} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.symbol?.replace(".NS", "")}</span>
                    {hasScannedData ? <RankBadge rank={item.rank} /> : <Badge variant="outline" className="text-[10px]">{item.signal}</Badge>}
                  </div>
                  {hasScannedData ? (
                    <>
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <span>LTVI: <span className="font-bold">{item.ltvi}</span></span>
                        <span>Price: â‚¹{item.price?.toLocaleString()}</span>
                        <span>P/B: {item.pb}</span>
                        <span>P/E: {item.pe}</span>
                        <span>P/NSPS: {item.pNsps}</span>
                        <span>P/RONW: {item.pRonw}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">{formatDetails(item.details)}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs sm:text-sm rows-cv">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {hasScannedData ? (
                      <>
                        <th className="pb-2 pr-3">BSE Code</th>
                        <th className="pb-2 pr-3">Company Name</th>
                        <th className="pb-2 pr-3">Sector</th>
                        <th className="pb-2 pr-3">Market Cap</th>
                        <th className="pb-2 pr-3">Price</th>
                        <th className="pb-2 pr-3">P/B</th>
                        <th className="pb-2 pr-3">P/E</th>
                        <th className="pb-2 pr-3">P/NSPS</th>
                        <th className="pb-2 pr-3">P/RONW</th>
                        <th className="pb-2 pr-3">LTVI</th>
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
                  {(hasScannedData ? dataSource : signals)?.slice(0, 50).map((item: any, idx: number) => (
                    <tr key={idx} className={`border-b border-border/50 ${hasScannedData && item.rank <= 10 ? "bg-green-50/50 dark:bg-green-900/10" : ""}`} data-testid={`row-ltvi-${idx}`}>
                      {hasScannedData ? (
                        <>
                          <td className="py-2 pr-3 font-medium">{(item.symbol || "").replace(".BO", "").replace(".NS", "")}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{item.name}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{item.sector}</td>
                          <td className="py-2 pr-3">â‚¹{item.marketCap ? (item.marketCap / 10000000).toFixed(0) + " Cr" : "â€”"}</td>
                          <td className="py-2 pr-3">â‚¹{item.price?.toLocaleString()}</td>
                          <td className="py-2 pr-3">{item.pb}</td>
                          <td className="py-2 pr-3">{item.pe}</td>
                          <td className="py-2 pr-3">{item.pNsps}</td>
                          <td className="py-2 pr-3">{item.pRonw}</td>
                          <td className="py-2 pr-3 font-bold">{item.ltvi}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 pr-3 font-medium">{item.symbol?.replace(".NS", "")}</td>
                          <td className="py-2 pr-3">â‚¹{item.price?.toLocaleString()}</td>
                          <td className="py-2 pr-3"><Badge variant="outline" className="text-[10px]">{item.signal}</Badge></td>
                          <td className="py-2 text-muted-foreground">{formatDetails(item.details)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-2">Annual Review Rule</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Every 12 months, recalculate LTVI for the full universe.</p>
            <p>If stock remains in Top 50 â†’ Continue SIP.</p>
            <p>If removed from Top 50 â†’ Consider booking profit and rotating capital to better-ranked stocks.</p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">Long Term Value Index â€” Class 10 Strategy. For educational purposes only.</p>
      </div>
    </DashboardLayout>
  );
}
