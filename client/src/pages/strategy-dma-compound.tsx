import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Coins, TrendingUp, Target, Calculator, ArrowUpRight, Download } from "lucide-react";

export default function StrategyDMACompound() {
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [startingCapital, setStartingCapital] = useState(15000);
  const [brokerage, setBrokerage] = useState(20);
  const [targetPercent, setTargetPercent] = useState(6.28);
  const [profitSplit, setProfitSplit] = useState(50);
  const [goalCapital, setGoalCapital] = useState(10000000);

  async function handleCalculate() {
    setIsCalculating(true);
    setResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/dma-compound", {
        startingCapital, brokeragePerTrade: brokerage, targetPercent, profitSplitPercent: profitSplit, goalCapital,
      });
      const data = await response.json();
      setResult(data);
      toast({ title: "Compounding Calculated", description: `${data.stepsRequired} trades to reach ₹${(goalCapital / 100000).toFixed(0)} Lakh` });
    } catch (error: any) {
      toast({ title: "Calculation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsCalculating(false);
    }
  }

  function exportCSV() {
    if (!result?.steps?.length) return;
    const headers = "Step,Capital,Gross Profit,Tax,Net Profit,Withdrawn,Reinvested\n";
    const rows = result.steps.map((s: any) => `${s.step},${s.capital},${s.grossProfit},${s.tax},${s.netProfit},${s.withdrawn},${s.reinvested}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "dma_compounding.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function formatINR(val: number) {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString("en-IN")}`;
  }

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 shrink-0" />
            <span className="truncate">DMA Compounding Engine</span>
          </h1>
          <p className="text-[11px] sm:text-xs lg:text-sm text-muted-foreground mt-1">Class 16 — 6.28% target compounding with tax, brokerage, and 50% self-dividend</p>
        </div>

        <div className="rounded-xl border bg-card p-2.5 sm:p-3 lg:p-4">
          <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-2"><Calculator className="w-4 h-4 shrink-0" />Compounding Configuration</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <label className="text-[10px] sm:text-xs text-muted-foreground mb-1 block">Starting Capital (₹)</label>
              <Input type="number" value={startingCapital} onChange={e => setStartingCapital(Number(e.target.value))} className="h-8 sm:h-9 text-xs sm:text-sm" data-testid="input-capital" />
            </div>
            <div>
              <label className="text-[10px] sm:text-xs text-muted-foreground mb-1 block">Brokerage/Trade (₹)</label>
              <Input type="number" value={brokerage} onChange={e => setBrokerage(Number(e.target.value))} className="h-8 sm:h-9 text-xs sm:text-sm" data-testid="input-brokerage" />
            </div>
            <div>
              <label className="text-[10px] sm:text-xs text-muted-foreground mb-1 block">Target %</label>
              <Input type="number" step="0.01" value={targetPercent} onChange={e => setTargetPercent(Number(e.target.value))} className="h-8 sm:h-9 text-xs sm:text-sm" data-testid="input-target" />
            </div>
            <div>
              <label className="text-[10px] sm:text-xs text-muted-foreground mb-1 block">Profit Split %</label>
              <Input type="number" value={profitSplit} onChange={e => setProfitSplit(Number(e.target.value))} className="h-8 sm:h-9 text-xs sm:text-sm" data-testid="input-split" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] sm:text-xs text-muted-foreground mb-1 block">Goal Capital (₹)</label>
              <Input type="number" value={goalCapital} onChange={e => setGoalCapital(Number(e.target.value))} className="h-8 sm:h-9 text-xs sm:text-sm" data-testid="input-goal" />
            </div>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <Button onClick={handleCalculate} disabled={isCalculating} className="w-full sm:w-auto" data-testid="button-calculate">
              {isCalculating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Calculating...</> : <><TrendingUp className="w-4 h-4 mr-2" />Calculate Growth</>}
            </Button>
            {result && <Button variant="outline" size="sm" onClick={exportCSV} className="w-full sm:w-auto" data-testid="button-export"><Download className="w-3 h-3 mr-1" />Export CSV</Button>}
          </div>
        </div>

        {result && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              <div className="rounded-xl border bg-card p-2.5 sm:p-3 text-center">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Trades</div>
                <div className="text-lg sm:text-xl font-bold text-blue-600" data-testid="stat-steps">{result.stepsRequired}</div>
              </div>
              <div className="rounded-xl border bg-card p-2.5 sm:p-3 text-center">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Years Required</div>
                <div className="text-lg sm:text-xl font-bold text-purple-600" data-testid="stat-years">{result.yearsRequired}</div>
              </div>
              <div className="rounded-xl border bg-card p-2.5 sm:p-3 text-center">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Final Capital</div>
                <div className="text-lg sm:text-xl font-bold text-green-600" data-testid="stat-final">{formatINR(result.finalCapital)}</div>
              </div>
              <div className="rounded-xl border bg-card p-2.5 sm:p-3 text-center">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Withdrawn</div>
                <div className="text-lg sm:text-xl font-bold text-orange-600" data-testid="stat-withdrawn">{formatINR(result.totalWithdrawn)}</div>
              </div>
              <div className="rounded-xl border bg-card p-2.5 sm:p-3 text-center col-span-2 sm:col-span-1">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">CAGR</div>
                <div className="text-lg sm:text-xl font-bold text-emerald-600" data-testid="stat-cagr">{result.cagr}%</div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-2.5 sm:p-3 lg:p-4">
              <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3">Compounding Formula</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground">
                <div className="flex items-start gap-2"><Target className="w-3 h-3 mt-0.5 text-green-500 shrink-0" /><span>Gross Profit = Capital × {targetPercent}%</span></div>
                <div className="flex items-start gap-2"><Target className="w-3 h-3 mt-0.5 text-red-500 shrink-0" /><span>Tax = 20% Income Tax + 4% Cess</span></div>
                <div className="flex items-start gap-2"><Target className="w-3 h-3 mt-0.5 text-blue-500 shrink-0" /><span>Net = Gross − Brokerage − Tax</span></div>
                <div className="flex items-start gap-2"><ArrowUpRight className="w-3 h-3 mt-0.5 text-orange-500 shrink-0" /><span>Withdraw {profitSplit}% | Reinvest {100 - profitSplit}%</span></div>
                <div className="flex items-start gap-2"><ArrowUpRight className="w-3 h-3 mt-0.5 text-purple-500 shrink-0" /><span>1 trade per week assumed</span></div>
                <div className="flex items-start gap-2"><Coins className="w-3 h-3 mt-0.5 text-yellow-500 shrink-0" /><span>Goal: ₹{(goalCapital / 10000000).toFixed(0)} Crore</span></div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-2.5 sm:p-3 lg:p-4">
              <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3">Growth Table (showing milestones)</h3>
              <div className="overflow-x-auto -mx-2.5 sm:mx-0 px-2.5 sm:px-0">
                <table className="w-full text-[11px] sm:text-xs lg:text-sm min-w-[320px]">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-2 sm:pr-3 font-medium">Trade #</th>
                      <th className="pb-2 pr-2 sm:pr-3 font-medium text-right">Capital</th>
                      <th className="pb-2 pr-2 sm:pr-3 font-medium text-right hidden sm:table-cell">Gross Profit</th>
                      <th className="pb-2 pr-2 sm:pr-3 font-medium text-right hidden md:table-cell">Tax</th>
                      <th className="pb-2 pr-2 sm:pr-3 font-medium text-right">Net Profit</th>
                      <th className="pb-2 pr-2 sm:pr-3 font-medium text-right hidden sm:table-cell">Withdrawn</th>
                      <th className="pb-2 font-medium text-right">Reinvested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.steps
                      .filter((_: any, i: number) => i < 10 || i % Math.max(1, Math.floor(result.steps.length / 30)) === 0 || i === result.steps.length - 1)
                      .map((s: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30" data-testid={`row-step-${i}`}>
                          <td className="py-1.5 sm:py-2 pr-2 sm:pr-3 font-medium">{s.step}</td>
                          <td className="py-1.5 sm:py-2 pr-2 sm:pr-3 text-right font-medium text-green-600">{formatINR(s.capital)}</td>
                          <td className="py-1.5 sm:py-2 pr-2 sm:pr-3 text-right hidden sm:table-cell">{formatINR(s.grossProfit)}</td>
                          <td className="py-1.5 sm:py-2 pr-2 sm:pr-3 text-right hidden md:table-cell text-red-500">{formatINR(s.tax)}</td>
                          <td className="py-1.5 sm:py-2 pr-2 sm:pr-3 text-right">{formatINR(s.netProfit)}</td>
                          <td className="py-1.5 sm:py-2 pr-2 sm:pr-3 text-right hidden sm:table-cell text-orange-600">{formatINR(s.withdrawn)}</td>
                          <td className="py-1.5 sm:py-2 text-right text-blue-600">{formatINR(s.reinvested)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-[10px] sm:text-xs text-muted-foreground">Showing milestone steps from {result.steps.length} total trades</div>
            </div>
          </>
        )}

        {!result && !isCalculating && (
          <div className="rounded-xl border bg-card p-4 sm:p-6 lg:p-8 text-center">
            <Coins className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-sm sm:text-base mb-1">Compounding Simulator</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">Configure your starting capital, brokerage, and targets above, then click "Calculate Growth" to simulate your path to wealth</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
