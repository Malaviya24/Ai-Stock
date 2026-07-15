import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingDown, Info, DollarSign, PieChart, Percent } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function StrategyHoma() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  
  // Inputs
  const [totalCapital, setTotalCapital] = useState(120000);
  const [parts, setParts] = useState(12);
  const [profitTarget, setProfitTarget] = useState(3);

  async function handleScan() {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/scan/homa-genius", {
        totalCapital,
        parts,
        profitTargetPercent: profitTarget
      });
      const result = await response.json();
      setScanResult(result);
      toast({
        title: "Multi-ETF Analysis Complete",
        description: `Scanned 5 Index ETFs.`,
      });
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }

  const finalDecision = scanResult?.finalDecision;
  const etfResults = scanResult?.etfResults || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-6 h-6 text-blue-500" />
              <h1 className="text-2xl font-bold">Homa Genius Strategy</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Multi-ETF Weekly Contrarian Scanner (NIFTYBEES, BANKBEES, MIDCAP, etc.)
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Total Capital (₹)</Label>
              <Input type="number" value={totalCapital} onChange={e => setTotalCapital(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Capital Parts</Label>
              <Input type="number" value={parts} onChange={e => setParts(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Profit Target (%)</Label>
              <Input type="number" value={profitTarget} onChange={e => setProfitTarget(Number(e.target.value))} />
            </div>
            <Button onClick={handleScan} disabled={isScanning} className="w-full">
              {isScanning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</> : "Run Multi-ETF Scan"}
            </Button>
          </div>
        </div>

        {/* Final Decision Card */}
        {finalDecision && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
              <div className="text-xs text-green-600 uppercase font-bold tracking-wider mb-1">BUY SIGNAL</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">{finalDecision.buy}</div>
              <div className="text-xs text-green-600/80 mt-1">{finalDecision.topPickReason}</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
              <div className="text-xs text-red-600 uppercase font-bold tracking-wider mb-1">SELL SIGNAL</div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">{finalDecision.sell}</div>
              <div className="text-xs text-red-600/80 mt-1">Target Hit</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
              <div className="text-xs text-blue-600 uppercase font-bold tracking-wider mb-1">HOLD</div>
              <div className="text-lg font-medium text-blue-700 dark:text-blue-400 truncate" title={finalDecision.hold}>
                {finalDecision.hold || "None"}
              </div>
              <div className="text-xs text-blue-600/80 mt-1">No Action Required</div>
            </div>
          </div>
        )}

        {/* ETF Results Table */}
        {etfResults.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">ETF Performance & Signals</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium">ETF Symbol</th>
                    <th className="text-right px-4 py-3 font-medium">Current Price</th>
                    <th className="text-center px-4 py-3 font-medium">Candle</th>
                    <th className="text-right px-4 py-3 font-medium">Rebound %</th>
                    <th className="text-center px-4 py-3 font-medium">Signal</th>
                    <th className="text-right px-4 py-3 font-medium">Active Pos</th>
                    <th className="text-right px-4 py-3 font-medium">Profit Booked</th>
                    <th className="text-right px-4 py-3 font-medium">Unrealized %</th>
                    <th className="text-right px-4 py-3 font-medium">Remaining Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {etfResults.map((etf: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-3 font-medium">{etf.symbol.replace(".NS", "")}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{etf.currentPrice}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={etf.candleType === "Bearish" ? "text-red-500 border-red-500/30" : "text-green-500 border-green-500/30"}>
                          {etf.candleType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{etf.reboundStrength}%</td>
                      <td className="px-4 py-3 text-center">
                        {etf.entrySignal === "BUY" && <Badge className="bg-green-500 text-white">BUY</Badge>}
                        {etf.exitSignal === "SELL" && <Badge className="bg-red-500 text-white">SELL</Badge>}
                        {etf.entrySignal !== "BUY" && etf.exitSignal !== "SELL" && <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{etf.activeTradesCount}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-500 font-medium">₹{etf.totalProfitBooked}</td>
                      <td className={`px-4 py-3 text-right font-mono ${etf.unrealizedReturn >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {etf.unrealizedReturn}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono">₹{etf.remainingCapital}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}