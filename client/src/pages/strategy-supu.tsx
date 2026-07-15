import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Calculator, TrendingUp, IndianRupee, BarChart3, Percent, Split, RotateCcw,
  Coins, PiggyBank, Users, ArrowRight,
} from "lucide-react";

export default function StrategySupu() {
  const [start, setStart] = useState("3000");
  const [profit, setProfit] = useState("6");
  const [brokerage, setBrokerage] = useState("0.8");
  const [tax, setTax] = useState("15");
  const [split, setSplit] = useState("50");
  const [cycles, setCycles] = useState("344");
  const [shouldFetch, setShouldFetch] = useState(false);

  const params = { start, profit, brokerage, tax, split, cycles };

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/compound/projection", params],
    queryFn: () =>
      fetch(
        `/api/compound/projection?start=${params.start}&profit=${params.profit}&brokerage=${params.brokerage}&tax=${params.tax}&split=${params.split}&cycles=${params.cycles}`
      ).then((r) => r.json()),
    enabled: shouldFetch,
  });

  function handleCalculate() {
    setShouldFetch(false);
    setTimeout(() => setShouldFetch(true), 0);
  }

  const formatCurrency = (v: number) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toFixed(2)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-strategy-heading">
            Supu Compounding Engine
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1" data-testid="text-strategy-description">
            6% profit booking with half-dividend reinvestment — start from ₹3,000 and compound to ₹1 Crore over 344 cycles.
          </p>
        </div>


        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-3">Strategy Rules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {[
              { text: "Gross Profit = Capital × 6%", icon: Percent },
              { text: "Brokerage ~0.8%, Tax 15% on net profit", icon: IndianRupee },
              { text: "50/50 Split: Half as dividend, half reinvested", icon: Split },
              { text: "Next Trade = Previous Capital + Reinvest amount", icon: RotateCcw },
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2" data-testid={`text-rule-${i + 1}`}>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] sm:text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <rule.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs sm:text-sm">{rule.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h2 className="font-semibold text-sm sm:text-base">Capital Configuration</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { label: "Start Capital (₹)", value: start, setter: setStart, id: "start-capital" },
              { label: "Profit %", value: profit, setter: setProfit, id: "profit-pct" },
              { label: "Brokerage %", value: brokerage, setter: setBrokerage, id: "brokerage-pct" },
              { label: "Tax %", value: tax, setter: setTax, id: "tax-pct" },
              { label: "Dividend Split %", value: split, setter: setSplit, id: "split-pct" },
              { label: "Total Cycles", value: cycles, setter: setCycles, id: "total-cycles" },
            ].map((field) => (
              <div key={field.id}>
                <label className="text-[10px] sm:text-xs text-muted-foreground mb-1 block">
                  {field.label}
                </label>
                <Input
                  type="number"
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  data-testid={`input-${field.id}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button
              onClick={handleCalculate}
              disabled={isLoading}
              data-testid="button-calculate"
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate Projection
                </>
              )}
            </Button>
          </div>
        </div>

        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
              {[
                { label: "Start Capital", value: `₹${Number(data.startCapital).toLocaleString("en-IN")}`, id: "start" },
                { label: "Final Capital", value: formatCurrency(data.finalCapital), id: "final" },
                { label: "Growth Multiple", value: `${data.growthMultiple}x`, id: "growth" },
                { label: "Total Dividend Earned", value: formatCurrency(data.totalDividendEarned), id: "dividend" },
                { label: "Total Reinvested", value: formatCurrency(data.totalReinvested), id: "reinvested" },
              ].map((card) => (
                <Card key={card.id} className="p-3 sm:p-4 text-center" data-testid={`card-summary-${card.id}`}>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">{card.label}</div>
                  <div className="text-sm sm:text-lg font-bold">{card.value}</div>
                </Card>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                <h2 className="font-semibold text-sm sm:text-base">{data.totalCycles}-Cycle Projection Chart</h2>
              </div>
              <div className="h-64 sm:h-80" data-testid="chart-projection">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.projection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="cycle"
                      tick={{ fontSize: 10 }}
                      label={{ value: "Cycle #", position: "insideBottomRight", offset: -5, fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => formatCurrency(v)}
                    />
                    <Tooltip
                      formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Trade Amount"]}
                      labelFormatter={(label: number) => `Cycle ${label}`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tradeAmount"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#greenGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <h2 className="text-base sm:text-lg font-semibold">Projection Table</h2>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="block sm:hidden divide-y divide-border">
                  {data.projection.map((row: any) => (
                    <div key={row.cycle} className="p-3 space-y-1" data-testid={`card-cycle-${row.cycle}`}>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">Cycle {row.cycle}</Badge>
                        <span className="text-sm font-bold font-mono">₹{row.tradeAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                        <div>Gross: <span className="text-foreground font-mono">₹{row.grossProfit.toLocaleString("en-IN")}</span></div>
                        <div>Div: <span className="text-green-500 font-mono">₹{row.dividend.toLocaleString("en-IN")}</span></div>
                        <div>Reinv: <span className="text-blue-500 font-mono">₹{row.reinvest.toLocaleString("en-IN")}</span></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-projection">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Cycle #</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Trade Amount</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Gross Profit</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Brokerage</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Net After Tax</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Dividend</th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Reinvest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.projection.map((row: any) => (
                        <tr key={row.cycle} className="border-b border-border last:border-0" data-testid={`row-cycle-${row.cycle}`}>
                          <td className="px-4 py-3 font-medium">{row.cycle}</td>
                          <td className="px-4 py-3 text-right font-mono font-medium">₹{row.tradeAmount.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-right font-mono">₹{row.grossProfit.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">₹{row.brokerage.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-right font-mono">₹{row.netAfterTax.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-right font-mono text-green-500">₹{row.dividend.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-right font-mono text-blue-500">₹{row.reinvest.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5" data-testid="section-10-sons">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h2 className="font-semibold text-sm sm:text-base">10 Sons Capital Model</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Total capital of ₹2,10,000 is systematically divided across 7 stocks, each allocated ₹30,000. Each stock allocation is further split into 10 equal parts, giving you ₹3,000 per trade.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4 text-center flex-1 w-full">
              <PiggyBank className="w-6 h-6 mx-auto text-primary mb-1" />
              <div className="text-lg sm:text-xl font-bold">₹2,10,000</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Total Capital</div>
            </Card>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 rotate-90 sm:rotate-0" />
            <Card className="p-3 sm:p-4 text-center flex-1 w-full">
              <TrendingUp className="w-6 h-6 mx-auto text-primary mb-1" />
              <div className="text-lg sm:text-xl font-bold">7 Stocks</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">₹30,000 each</div>
            </Card>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 rotate-90 sm:rotate-0" />
            <Card className="p-3 sm:p-4 text-center flex-1 w-full">
              <Users className="w-6 h-6 mx-auto text-primary mb-1" />
              <div className="text-lg sm:text-xl font-bold">10 Parts</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">per stock</div>
            </Card>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 rotate-90 sm:rotate-0" />
            <Card className="p-3 sm:p-4 text-center flex-1 w-full">
              <IndianRupee className="w-6 h-6 mx-auto text-green-500 mb-1" />
              <div className="text-lg sm:text-xl font-bold text-green-500">₹3,000</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">per trade</div>
            </Card>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-[10px] sm:text-xs text-muted-foreground" data-testid="text-disclaimer">
          Educational purposes only. Not financial advice. Past performance does not guarantee future results. The compounding projections shown are mathematical models and actual trading results may vary due to market conditions, slippage, and other factors.
        </div>
      </div>
    </DashboardLayout>
  );
}
