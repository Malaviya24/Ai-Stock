import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, TreePine, TrendingUp, Wallet, PiggyBank, Calendar, DollarSign } from "lucide-react";

export default function StrategyMoneyTreeEtf() {
  const { toast } = useToast();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [weeklyInvestment, setWeeklyInvestment] = useState(5000);
  const [totalWeeks, setTotalWeeks] = useState(52);
  const [returnPct, setReturnPct] = useState(12);
  const [thresholdPct, setThresholdPct] = useState(20);

  async function handleSimulate() {
    setIsSimulating(true);
    setSimResult(null);
    try {
      const params = new URLSearchParams({
        weekly: weeklyInvestment.toString(),
        weeks: totalWeeks.toString(),
        returnPct: returnPct.toString(),
        threshold: thresholdPct.toString(),
      });
      const response = await fetch(`/api/money-tree/simulate?${params}`);
      const result = await response.json();
      setSimResult(result);
      toast({ title: "Simulation Complete", description: `${result.totalWeeks} weeks simulated` });
    } catch (error: any) {
      toast({ title: "Simulation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6" data-testid="page-money-tree-etf">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">Money Tree ETF Engine</h2>
            <p className="text-sm text-muted-foreground mt-1">Class 12 — Weekly SIP + Profit Booking at 20% Threshold</p>
          </div>
          <Button onClick={handleSimulate} disabled={isSimulating} size="sm" data-testid="button-simulate">
            {isSimulating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Simulating...</> : <><TreePine className="w-4 h-4 mr-1" />Run Simulation</>}
          </Button>
        </div>


        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-3">Configuration</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Weekly Investment (₹)</label>
              <input type="number" value={weeklyInvestment} onChange={e => setWeeklyInvestment(+e.target.value)} className="w-full h-8 text-xs border rounded px-2 bg-background" data-testid="input-weekly" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Total Weeks</label>
              <input type="number" value={totalWeeks} onChange={e => setTotalWeeks(+e.target.value)} className="w-full h-8 text-xs border rounded px-2 bg-background" data-testid="input-weeks" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Annual Return (%)</label>
              <input type="number" value={returnPct} onChange={e => setReturnPct(+e.target.value)} className="w-full h-8 text-xs border rounded px-2 bg-background" data-testid="input-return" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Profit Threshold (%)</label>
              <input type="number" value={thresholdPct} onChange={e => setThresholdPct(+e.target.value)} className="w-full h-8 text-xs border rounded px-2 bg-background" data-testid="input-threshold" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-3">Strategy Rules</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2"><Calendar className="w-3 h-3 mt-0.5 text-blue-500 shrink-0" /><span>Buy fixed amount every Friday (Weekly SIP)</span></div>
            <div className="flex items-start gap-2"><TrendingUp className="w-3 h-3 mt-0.5 text-green-500 shrink-0" /><span>Track total units and principal invested</span></div>
            <div className="flex items-start gap-2"><DollarSign className="w-3 h-3 mt-0.5 text-yellow-500 shrink-0" /><span>Profit = (Units × Price) − Principal</span></div>
            <div className="flex items-start gap-2"><PiggyBank className="w-3 h-3 mt-0.5 text-purple-500 shrink-0" /><span>Book profit when ≥ 20% of weekly investment</span></div>
            <div className="flex items-start gap-2"><Wallet className="w-3 h-3 mt-0.5 text-orange-500 shrink-0" /><span>Sell only units worth the profit threshold</span></div>
            <div className="flex items-start gap-2"><TreePine className="w-3 h-3 mt-0.5 text-cyan-500 shrink-0" /><span>Never stop buying — even in bear market</span></div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-2">Profit Booking Formula</h3>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs sm:text-sm space-y-1">
            <p>threshold = weeklyInvestment × {thresholdPct}% = ₹{(weeklyInvestment * thresholdPct / 100).toLocaleString()}</p>
            <p>if profit ≥ threshold → sell units worth ₹{(weeklyInvestment * thresholdPct / 100).toLocaleString()}</p>
            <p className="text-muted-foreground">Principal stays constant in compounding model (not reduced)</p>
          </div>
        </div>

        {simResult && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded-xl border bg-card p-3 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Total Invested</div>
                <div className="text-lg sm:text-xl font-bold" data-testid="stat-invested">₹{simResult.totalPrincipalInvested?.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border bg-card p-3 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Portfolio Value</div>
                <div className="text-lg sm:text-xl font-bold text-green-600" data-testid="stat-portfolio">₹{simResult.finalPortfolioValue?.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border bg-card p-3 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Profit Withdrawn</div>
                <div className="text-lg sm:text-xl font-bold text-purple-600" data-testid="stat-withdrawn">₹{simResult.totalProfitWithdrawn?.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border bg-card p-3 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Bookings Made</div>
                <div className="text-lg sm:text-xl font-bold" data-testid="stat-bookings">{simResult.profitBookingCount}</div>
              </div>
              <div className="rounded-xl border bg-card p-3 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Net Gain</div>
                <div className={`text-lg sm:text-xl font-bold ${simResult.netGain >= 0 ? "text-green-600" : "text-red-500"}`} data-testid="stat-net-gain">₹{simResult.netGain?.toLocaleString()}</div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-3 sm:p-4">
              <h3 className="font-semibold text-sm mb-3">Weekly Projection</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm" data-testid="table-projection">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3">Week</th>
                      <th className="pb-2 pr-3">ETF Price</th>
                      <th className="pb-2 pr-3">Units Bought</th>
                      <th className="pb-2 pr-3">Total Units</th>
                      <th className="pb-2 pr-3">Principal</th>
                      <th className="pb-2 pr-3">Value</th>
                      <th className="pb-2 pr-3">Profit</th>
                      <th className="pb-2 pr-3">Booked</th>
                      <th className="pb-2">Total Withdrawn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simResult.projection?.map((row: any, idx: number) => (
                      <tr key={idx} className={`border-b border-border/50 ${row.profitBooked > 0 ? "bg-green-50/50 dark:bg-green-900/10" : ""}`} data-testid={`row-proj-${idx}`}>
                        <td className="py-2 pr-3 font-medium">W{row.week}</td>
                        <td className="py-2 pr-3">₹{row.price}</td>
                        <td className="py-2 pr-3">{row.unitsBought}</td>
                        <td className="py-2 pr-3">{row.totalUnits}</td>
                        <td className="py-2 pr-3">₹{row.totalPrincipal?.toLocaleString()}</td>
                        <td className="py-2 pr-3">₹{row.portfolioValue?.toLocaleString()}</td>
                        <td className={`py-2 pr-3 ${row.profit >= 0 ? "text-green-600" : "text-red-500"}`}>₹{row.profit?.toLocaleString()}</td>
                        <td className="py-2 pr-3">{row.profitBooked > 0 ? <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">₹{row.profitBooked}</Badge> : "—"}</td>
                        <td className="py-2">₹{row.totalWithdrawn?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <h3 className="font-semibold text-sm mb-2 text-green-600">Strengths</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Works in volatile upward markets</li>
              <li>Disciplined long-term compounding</li>
              <li>Emotion-free profit extraction</li>
              <li>Bear markets improve average cost</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <h3 className="font-semibold text-sm mb-2 text-red-500">Risks</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Long sideways market = low extraction</li>
              <li>Deep crash = capital drawdown</li>
              <li>ETF tracking error risk</li>
              <li>Requires strict automation discipline</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-2">Recommended ETFs</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">NIFTYBEES.NS</Badge>
            <Badge variant="outline">SBINIFTY.NS</Badge>
            <Badge variant="outline">SETFNIF50.NS</Badge>
            <Badge variant="outline">BANKBEES.NS</Badge>
            <Badge variant="outline">JUNIORBEES.NS</Badge>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">Money Tree ETF Engine — Class 12 Strategy. Simulation uses randomized price movement. For educational purposes only.</p>
      </div>
    </DashboardLayout>
  );
}
