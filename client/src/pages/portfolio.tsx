import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trash2, Plus, TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PortfolioPosition, Trade } from "@shared/schema";

const STRATEGY_OPTIONS = [
  "darvas",
  "rsi-nifty-shop",
  "gap-up",
  "turtle",
  "money-tree",
  "supu-model",
  "monthly-candle",
  "fundamental",
  "boh-filter",
  "reit-invit",
];

const STRATEGY_COLORS: Record<string, string> = {
  darvas: "bg-blue-500",
  "rsi-nifty-shop": "bg-emerald-500",
  "gap-up": "bg-amber-500",
  turtle: "bg-teal-500",
  "money-tree": "bg-green-500",
  "supu-model": "bg-purple-500",
  "monthly-candle": "bg-orange-500",
  fundamental: "bg-indigo-500",
  "boh-filter": "bg-rose-500",
  "reit-invit": "bg-cyan-500",
};

export default function Portfolio() {
  const { toast } = useToast();

  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [strategyUsed, setStrategyUsed] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  const { data: portfolio = [], isLoading: portfolioLoading } = useQuery<PortfolioPosition[]>({
    queryKey: ["/api/portfolio"],
  });

  const { data: trades = [], isLoading: tradesLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/portfolio", {
        symbol: symbol.toUpperCase(),
        name,
        quantity: parseInt(quantity),
        entryPrice: parseFloat(entryPrice),
        strategyUsed,
        targetPrice: targetPrice ? parseFloat(targetPrice) : null,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({ title: "Holding added successfully" });
      setSymbol("");
      setName("");
      setQuantity("");
      setEntryPrice("");
      setStrategyUsed("");
      setTargetPrice("");
      setStopLoss("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add holding", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", "/api/portfolio/" + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({ title: "Holding removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove holding", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !name || !quantity || !entryPrice || !strategyUsed) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    addMutation.mutate();
  };

  const activeHoldings = portfolio.filter((p) => p.isActive);
  const totalInvested = activeHoldings.reduce((sum, p) => sum + p.entryPrice * p.quantity, 0);
  const currentValue = totalInvested;
  const totalPnl = currentValue - totalInvested;
  const returnPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const strategyAllocation = activeHoldings.reduce<Record<string, number>>((acc, p) => {
    const invested = p.entryPrice * p.quantity;
    acc[p.strategyUsed] = (acc[p.strategyUsed] || 0) + invested;
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold" data-testid="text-portfolio-title">Portfolio</h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1" data-testid="text-portfolio-subtitle">
            Track your holdings, P&L, and strategy allocation.
          </p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Add Holding
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <Input
                placeholder="Symbol (e.g. RELIANCE)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                data-testid="input-symbol"
                className="text-sm"
              />
              <Input
                placeholder="Company Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-name"
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-testid="input-quantity"
                className="text-sm"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Entry Price"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                data-testid="input-entry-price"
                className="text-sm"
              />
              <Select value={strategyUsed} onValueChange={setStrategyUsed}>
                <SelectTrigger data-testid="select-strategy" className="text-sm">
                  <SelectValue placeholder="Select Strategy" />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} data-testid={`select-strategy-option-${s}`}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="Target Price (optional)"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                data-testid="input-target-price"
                className="text-sm"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Stop Loss (optional)"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                data-testid="input-stop-loss"
                className="text-sm"
              />
              <Button type="submit" disabled={addMutation.isPending} data-testid="button-add-holding" className="text-sm">
                {addMutation.isPending ? "Adding..." : "Add Holding"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-medium">Total Invested</CardTitle>
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <div className="text-base sm:text-2xl font-bold truncate" data-testid="text-total-invested">
                {totalInvested.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-medium">Current Value</CardTitle>
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <div className="text-base sm:text-2xl font-bold truncate" data-testid="text-current-value">
                {currentValue.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-medium">Total P&L</CardTitle>
              {totalPnl >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 shrink-0" />
              )}
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <div
                className={`text-base sm:text-2xl font-bold truncate ${totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}
                data-testid="text-total-pnl"
              >
                {totalPnl >= 0 ? "+" : ""}
                {totalPnl.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-medium">Return %</CardTitle>
              <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <div
                className={`text-base sm:text-2xl font-bold ${returnPct >= 0 ? "text-emerald-500" : "text-red-500"}`}
                data-testid="text-return-pct"
              >
                {returnPct >= 0 ? "+" : ""}
                {returnPct.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Holdings</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {portfolioLoading ? (
              <p className="text-muted-foreground text-sm" data-testid="text-holdings-loading">Loading holdings...</p>
            ) : activeHoldings.length === 0 ? (
              <p className="text-muted-foreground text-xs sm:text-sm" data-testid="text-no-holdings">No holdings yet. Add your first position above.</p>
            ) : (
              <>
                <div className="block sm:hidden space-y-2">
                  {activeHoldings.map((pos) => (
                    <div key={pos.id} className="border border-border rounded-lg p-3 space-y-2" data-testid={`card-holding-${pos.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm" data-testid={`text-holding-symbol-${pos.id}`}>{pos.symbol}</div>
                          <div className="text-[10px] text-muted-foreground">{pos.name}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteMutation.mutate(pos.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-holding-${pos.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Qty</div>
                          <div className="font-medium">{pos.quantity}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg Price</div>
                          <div className="font-medium">{pos.entryPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Invested</div>
                          <div className="font-medium">{(pos.entryPrice * pos.quantity).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="secondary" className="text-[10px]" data-testid={`badge-strategy-${pos.id}`}>{pos.strategyUsed}</Badge>
                        <div className="flex gap-3 text-muted-foreground">
                          {pos.targetPrice && <span>T: {pos.targetPrice.toFixed(0)}</span>}
                          {pos.stopLoss && <span>SL: {pos.stopLoss.toFixed(0)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-holdings">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Stock</th>
                        <th className="pb-3 pr-4 font-medium">Qty</th>
                        <th className="pb-3 pr-4 font-medium">Avg Price</th>
                        <th className="pb-3 pr-4 font-medium">Invested</th>
                        <th className="pb-3 pr-4 font-medium">Strategy</th>
                        <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Target</th>
                        <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Stop Loss</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeHoldings.map((pos) => (
                        <tr key={pos.id} className="border-b border-border last:border-0" data-testid={`row-holding-${pos.id}`}>
                          <td className="py-3 pr-4">
                            <div className="font-medium" data-testid={`text-holding-symbol-${pos.id}`}>{pos.symbol}</div>
                            <div className="text-xs text-muted-foreground">{pos.name}</div>
                          </td>
                          <td className="py-3 pr-4" data-testid={`text-holding-qty-${pos.id}`}>{pos.quantity}</td>
                          <td className="py-3 pr-4" data-testid={`text-holding-price-${pos.id}`}>{pos.entryPrice.toFixed(2)}</td>
                          <td className="py-3 pr-4" data-testid={`text-holding-invested-${pos.id}`}>
                            {(pos.entryPrice * pos.quantity).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant="secondary" data-testid={`badge-strategy-${pos.id}`}>{pos.strategyUsed}</Badge>
                          </td>
                          <td className="py-3 pr-4 hidden lg:table-cell" data-testid={`text-holding-target-${pos.id}`}>
                            {pos.targetPrice ? pos.targetPrice.toFixed(2) : "—"}
                          </td>
                          <td className="py-3 pr-4 hidden lg:table-cell" data-testid={`text-holding-stoploss-${pos.id}`}>
                            {pos.stopLoss ? pos.stopLoss.toFixed(2) : "—"}
                          </td>
                          <td className="py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(pos.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-holding-${pos.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {totalInvested > 0 && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Strategy Allocation</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
              <div className="flex h-5 sm:h-6 w-full rounded-md overflow-hidden" data-testid="bar-strategy-allocation">
                {Object.entries(strategyAllocation).map(([strategy, amount]) => {
                  const pct = (amount / totalInvested) * 100;
                  return (
                    <div
                      key={strategy}
                      className={`${STRATEGY_COLORS[strategy] || "bg-gray-400"} relative group`}
                      style={{ width: `${pct}%` }}
                      title={`${strategy}: ${pct.toFixed(1)}%`}
                      data-testid={`bar-segment-${strategy}`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {Object.entries(strategyAllocation).map(([strategy, amount]) => {
                  const pct = (amount / totalInvested) * 100;
                  return (
                    <div key={strategy} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm" data-testid={`legend-${strategy}`}>
                      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm ${STRATEGY_COLORS[strategy] || "bg-gray-400"}`} />
                      <span className="text-muted-foreground">{strategy}</span>
                      <span className="font-medium">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Recent Trades</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {tradesLoading ? (
              <p className="text-muted-foreground text-sm" data-testid="text-trades-loading">Loading trades...</p>
            ) : trades.length === 0 ? (
              <p className="text-muted-foreground text-xs sm:text-sm" data-testid="text-no-trades">No trades recorded yet.</p>
            ) : (
              <>
                <div className="block sm:hidden space-y-2">
                  {trades.map((trade, idx) => (
                    <div key={trade.id || idx} className="border border-border rounded-lg p-3" data-testid={`card-trade-${trade.id || idx}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">{trade.symbol}</div>
                        <Badge
                          variant={trade.type === "BUY" ? "default" : "secondary"}
                          className="text-[10px]"
                          data-testid={`badge-trade-type-${trade.id || idx}`}
                        >
                          {trade.type}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Qty</div>
                          <div className="font-medium">{trade.quantity}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Price</div>
                          <div className="font-medium">{trade.entryPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Date</div>
                          <div className="font-medium">{trade.createdAt ? new Date(trade.createdAt).toLocaleDateString() : "—"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-trades">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Symbol</th>
                        <th className="pb-3 pr-4 font-medium">Type</th>
                        <th className="pb-3 pr-4 font-medium">Qty</th>
                        <th className="pb-3 pr-4 font-medium">Price</th>
                        <th className="pb-3 pr-4 font-medium">Strategy</th>
                        <th className="pb-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((trade, idx) => (
                        <tr key={trade.id || idx} className="border-b border-border last:border-0" data-testid={`row-trade-${trade.id || idx}`}>
                          <td className="py-3 pr-4 font-medium" data-testid={`text-trade-symbol-${trade.id || idx}`}>{trade.symbol}</td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant={trade.type === "BUY" ? "default" : "secondary"}
                              data-testid={`badge-trade-type-${trade.id || idx}`}
                            >
                              {trade.type}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4" data-testid={`text-trade-qty-${trade.id || idx}`}>{trade.quantity}</td>
                          <td className="py-3 pr-4" data-testid={`text-trade-price-${trade.id || idx}`}>{trade.entryPrice.toFixed(2)}</td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline" data-testid={`badge-trade-strategy-${trade.id || idx}`}>{trade.strategy}</Badge>
                          </td>
                          <td className="py-3 text-muted-foreground" data-testid={`text-trade-date-${trade.id || idx}`}>
                            {trade.createdAt ? new Date(trade.createdAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
