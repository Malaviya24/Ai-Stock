import { useState } from "react";
import { formatDetails } from "@/lib/format-details";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Turtle, TrendingUp, ArrowUpRight, Target, Shield, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

function SignalBadge({ signal }: { signal: string }) {
  if (signal === "BUY") return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs" data-testid="badge-buy">BUY</Badge>;
  if (signal === "SELL") return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs" data-testid="badge-sell">SELL</Badge>;
  return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs" data-testid="badge-watch">WAIT</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  if (type === "ETF") return <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-600 dark:text-blue-400">ETF</Badge>;
  return <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-600 dark:text-purple-400">Stock</Badge>;
}

export default function StrategyTurtle55() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [capitalPerStock, setCapitalPerStock] = useState(20000);
  const [symbol, setSymbol] = useState("NIFTYBEES.NS");
  const [breakoutDays, setBreakoutDays] = useState(55);
  const [profitPct, setProfitPct] = useState(6.28);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [backtest, setBacktest] = useState<any>(null);

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "turtle-55"],
    queryFn: () => fetch("/api/signals?limit=200&strategy=turtle-55").then(r => r.json()),
  });

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/turtle-55", { capitalPerStock, includeEtfs: true });
      const result = await response.json();
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/signals", "turtle-55"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Turtle-55 Scan Complete", description: `Scanned ${result.total_scanned} instruments, ${result.breakout_count} breakouts found` });
    } catch (error: any) {
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  }

  async function handleBacktest() {
    setIsScanning(true);
    setBacktest(null);
    try {
      const body: any = { symbol, totalCapital: capitalPerStock, parts: 15, breakoutDays, profitPct };
      if (startDate) body.startDate = startDate;
      if (endDate) body.endDate = endDate;
      const response = await apiRequest("POST", "/api/backtest/turtle-55", body);
      const result = await response.json();
      setBacktest(result);
      toast({ title: "Backtest Complete", description: `${result.metrics.rotations} rotations, CAGR ${result.metrics.cagr}%` });
    } catch (error: any) {
      toast({ title: "Backtest Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  }

  const hasScannedData = scanResult?.all_results?.length > 0;
  const dataSource = hasScannedData ? scanResult.all_results : [];
  const breakouts = hasScannedData ? dataSource.filter((r: any) => r.isBreakout55) : signals?.filter(s => s.signal === "BUY") ?? [];
  const waiting = hasScannedData ? dataSource.filter((r: any) => !r.isBreakout55) : signals?.filter(s => s.signal === "WATCH") ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6" data-testid="page-turtle-55">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">Updated Turtle Trading</h2>
            <p className="text-sm text-muted-foreground mt-1">Class 13 — 55-Day High Breakout + 15-Part Capital + 6.28% Target</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Symbol:</span>
              <input type="text" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} className="w-28 h-8 text-xs border rounded px-2 bg-background" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Capital/Stock:</span>
              <input type="number" value={capitalPerStock} onChange={e => setCapitalPerStock(+e.target.value)} className="w-24 h-8 text-xs border rounded px-2 bg-background" data-testid="input-capital" />
            </div>
            <Button onClick={handleScan} disabled={isScanning} size="sm" data-testid="button-scan-turtle55">
              {isScanning ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Scanning...</> : <><Turtle className="w-4 h-4 mr-1" />Run Scan</>}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><BarChart3 className="w-4 h-4" /><span className="text-xs">Total Scanned</span></div>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-scanned">{scanResult?.total_scanned ?? signals?.length ?? "—"}</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><ArrowUpRight className="w-4 h-4 text-green-500" /><span className="text-xs">Breakouts</span></div>
            <div className="text-xl sm:text-2xl font-bold text-green-600" data-testid="stat-breakouts">{scanResult?.breakout_count ?? breakouts.length}</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Target className="w-4 h-4" /><span className="text-xs">Per Order</span></div>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-per-order">₹{scanResult?.per_order?.toLocaleString() ?? Math.round(capitalPerStock / 15).toLocaleString()}</div>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Shield className="w-4 h-4" /><span className="text-xs">Max Entries</span></div>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-parts">15 Parts</div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-3">Backtest (2-Year Example)</h3>
          <div className="grid sm:grid-cols-5 gap-2 mb-3">
            <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">Symbol</span><input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} className="h-8 text-xs border rounded px-2 bg-background w-full" /></div>
            <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">Breakout</span><input type="number" value={breakoutDays} onChange={e => setBreakoutDays(+e.target.value)} className="h-8 text-xs border rounded px-2 bg-background w-full" /></div>
            <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">Target %</span><input type="number" step="0.01" value={profitPct} onChange={e => setProfitPct(+e.target.value)} className="h-8 text-xs border rounded px-2 bg-background w-full" /></div>
            <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">Start</span><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs border rounded px-2 bg-background w-full" /></div>
            <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">End</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs border rounded px-2 bg-background w-full" /></div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleBacktest} disabled={isScanning} size="sm">
              {isScanning ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Backtesting...</> : <><BarChart3 className="w-4 h-4 mr-1" />Run Backtest</>}
            </Button>
          </div>

          {backtest && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border bg-card p-3">
                  <div className="text-[10px] text-muted-foreground">Rotations</div>
                  <div className="text-lg font-bold">{backtest.metrics.rotations}</div>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <div className="text-[10px] text-muted-foreground">Win Rate</div>
                  <div className="text-lg font-bold">{backtest.metrics.winRate}%</div>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <div className="text-[10px] text-muted-foreground">CAGR</div>
                  <div className="text-lg font-bold">{backtest.metrics.cagr}%</div>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <div className="text-[10px] text-muted-foreground">Max Drawdown</div>
                  <div className="text-lg font-bold">{backtest.metrics.maxDrawdown}%</div>
                </div>
              </div>
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={backtest.equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" hide />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="equity" name="Equity" stroke="#10b981" dot={false} />
                    <Line type="monotone" dataKey="cash" name="Cash" stroke="#64748b" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3">Buy Date</th>
                      <th className="pb-2 pr-3">Sell Date</th>
                      <th className="pb-2 pr-3">Avg Price</th>
                      <th className="pb-2 pr-3">Exit Price</th>
                      <th className="pb-2 pr-3">Return %</th>
                      <th className="pb-2 pr-3">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backtest.rotations.map((r: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 pr-3">{r.buyDate}</td>
                        <td className="py-2 pr-3">{r.sellDate}</td>
                        <td className="py-2 pr-3">₹{r.avgPrice}</td>
                        <td className="py-2 pr-3">₹{r.exitPrice}</td>
                        <td className="py-2 pr-3">{r.returnPct}%</td>
                        <td className="py-2 pr-3">₹{r.pnl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>


        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-3">Strategy Rules (Mahesh Method)</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-blue-500 shrink-0" /><span>Divide capital into 15 equal parts</span></div>
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-green-500 shrink-0" /><span>Buy 1 part when Close ≥ 55-Day High</span></div>
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-purple-500 shrink-0" /><span>Max 15 entries per stock</span></div>
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-orange-500 shrink-0" /><span>Target: Average Price × 1.0628 (6.28%)</span></div>
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-red-500 shrink-0" /><span>No stop loss — no breakout = no buy</span></div>
            <div className="flex items-start gap-2"><Shield className="w-3 h-3 mt-0.5 text-cyan-500 shrink-0" /><span>Sell ALL when target hit, then reset</span></div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-3">Capital Allocation (15-Part System)</h3>
          <div className="grid grid-cols-5 sm:grid-cols-15 lg:grid-cols-15 gap-1">
            {Array.from({ length: 15 }, (_, i) => (
              <div key={i} className="rounded border p-1.5 sm:p-2 text-center bg-muted/50">
                <div className="text-[10px] sm:text-xs font-bold">P{i + 1}</div>
                <div className="text-[8px] sm:text-[10px] text-muted-foreground">₹{Math.round(capitalPerStock / 15).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {isLoading && !hasScannedData && (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        )}

        {breakouts.length > 0 && (
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-500" />55-Day Breakouts ({breakouts.length})
            </h3>
            <div className="block sm:hidden space-y-2">
              {breakouts.map((item: any, idx: number) => (
                <div key={idx} className="rounded-lg border p-3 space-y-1 bg-green-50/30 dark:bg-green-900/10" data-testid={`card-breakout-${idx}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.symbol?.replace(".NS", "")}</span>
                      {hasScannedData && <TypeBadge type={item.type} />}
                    </div>
                    <SignalBadge signal={item.signal || "BUY"} />
                  </div>
                  {hasScannedData ? (
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span>Price: ₹{item.price?.toLocaleString()}</span>
                      <span>55D High: ₹{item.high55}</span>
                      <span>Target: ₹{item.targetPrice}</span>
                      <span>Shares/Order: {item.sharesPerOrder}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">{formatDetails(item.details)}</div>
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
                        <th className="pb-2 pr-3">Type</th>
                        <th className="pb-2 pr-3">Price</th>
                        <th className="pb-2 pr-3">55D High</th>
                        <th className="pb-2 pr-3">Target (6.28%)</th>
                        <th className="pb-2 pr-3">Shares/Order</th>
                        <th className="pb-2 pr-3">Max Shares</th>
                        <th className="pb-2 pr-3">RSI</th>
                        <th className="pb-2">Signal</th>
                      </>
                    ) : (
                      <><th className="pb-2 pr-3">Price</th><th className="pb-2 pr-3">Details</th><th className="pb-2">Signal</th></>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {breakouts.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/50 bg-green-50/30 dark:bg-green-900/5" data-testid={`row-breakout-${idx}`}>
                      <td className="py-2 pr-3 font-medium">{item.symbol?.replace(".NS", "")}</td>
                      {hasScannedData ? (
                        <>
                          <td className="py-2 pr-3"><TypeBadge type={item.type} /></td>
                          <td className="py-2 pr-3">₹{item.price?.toLocaleString()}</td>
                          <td className="py-2 pr-3">₹{item.high55}</td>
                          <td className="py-2 pr-3 text-green-600 font-medium">₹{item.targetPrice}</td>
                          <td className="py-2 pr-3">{item.sharesPerOrder}</td>
                          <td className="py-2 pr-3">{item.maxShares}</td>
                          <td className="py-2 pr-3">{item.rsi}</td>
                          <td className="py-2"><SignalBadge signal={item.signal} /></td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 pr-3">₹{item.price?.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{formatDetails(item.details)}</td>
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

        {waiting.length > 0 && (
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Waiting for Breakout ({waiting.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Symbol</th>
                    <th className="pb-2 pr-3">Price</th>
                    <th className="pb-2 pr-3">{hasScannedData ? "55D High" : "Details"}</th>
                    {hasScannedData && <th className="pb-2 pr-3">Distance</th>}
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {waiting.slice(0, 20).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/50" data-testid={`row-waiting-${idx}`}>
                      <td className="py-2 pr-3 font-medium">{item.symbol?.replace(".NS", "")}</td>
                      <td className="py-2 pr-3">₹{item.price?.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{hasScannedData ? `₹${item.high55}` : item.details}</td>
                      {hasScannedData && (
                        <td className="py-2 pr-3 text-muted-foreground">{((item.high55 - item.price) / item.price * 100).toFixed(1)}% away</td>
                      )}
                      <td className="py-2"><SignalBadge signal="WATCH" /></td>
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
              <li>Works well in strong uptrends</li>
              <li>Controlled capital exposure (15 parts)</li>
              <li>No premature stop loss exits</li>
              <li>Auto-stops in falling markets (no breakout = no buy)</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <h3 className="font-semibold text-sm mb-2 text-red-500">Risks</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>No downside protection in sharp crashes</li>
              <li>Dead capital in sideways markets</li>
              <li>Requires ETF liquidity for smooth execution</li>
              <li>Not classic Turtle — rotation-based system</li>
            </ul>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">Updated Turtle Trading — Class 13 Strategy. For educational purposes only. Not financial advice.</p>
      </div>
    </DashboardLayout>
  );
}
