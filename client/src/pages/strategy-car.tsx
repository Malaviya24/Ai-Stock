import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Activity, TrendingUp, Target, Shield, ArrowUpRight, CheckCircle2, AlertTriangle } from "lucide-react";

export default function StrategyCAR() {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [investedCapital, setInvestedCapital] = useState(15000);

  async function handleBulkScan() {
    setIsAnalyzing(true);
    setScanResult(null);
    try {
      // 1. Call the new endpoint that fetches from Nifty DMA state and runs CAR logic
      const response = await apiRequest("POST", "/api/scan/nifty-dma-car", { investedCapital });
      const data = await response.json();
      setScanResult(data);
      
      toast({ 
        title: "Scan Complete", 
        description: `Analyzed ${data.total_scanned} stocks. Found ${data.passed_count} passing CAR logic.` 
      });
    } catch (error: any) {
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-7xl mx-auto pb-10">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-500" />
            Smart CAR Strategy
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Apply Cumulative Average Return (CAR) logic on Nifty DMA Bull Run stocks.
          </p>
        </div>

        {/* Controls */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-auto">
              <label className="text-xs text-muted-foreground mb-1 block">Invested Capital per Stock (₹)</label>
              <Input 
                type="number" 
                value={investedCapital} 
                onChange={e => setInvestedCapital(Number(e.target.value))} 
                className="h-9 w-full sm:w-40" 
              />
            </div>
            <Button 
              onClick={handleBulkScan} 
              disabled={isAnalyzing} 
              className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Activity className="w-4 h-4 mr-2" />Load from Nifty DMA & Apply CAR Logic</>}
            </Button>
          </div>
          <div className="mt-3 text-[10px] text-muted-foreground flex items-center gap-2">
            <Shield className="w-3 h-3 text-blue-500" />
            <span>Logic: Fetch Nifty DMA Buy List → Check 10-day Rising CAR → Show "AVERAGE" candidates.</span>
          </div>
        </div>

        {/* Results */}
        {scanResult && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> 
              Qualified Stocks ({scanResult.passed_count})
            </h3>
            
            {!scanResult.results?.length ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No stocks passed the CAR logic (10-day rising cumulative average).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs">
                      <th className="pb-2">Stock Name</th>
                      <th className="pb-2 text-right">CMP</th>
                      <th className="pb-2 text-right">52W High</th>
                      <th className="pb-2 text-right">Rec. Shares</th>
                      <th className="pb-2 text-right">Avg Amount</th>
                      <th className="pb-2 text-right">Cumulative Average (Last 10)</th>
                      <th className="pb-2 text-center">Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.results.map((s: any, i: number) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2">
                          <div className="font-medium">{s.name || s.symbol.replace('.NS','')}</div>
                          <div className="text-[10px] text-muted-foreground">{s.symbol.replace('.NS','')}</div>
                        </td>
                        <td className="py-2 text-right font-medium">₹{s.currentPrice?.toLocaleString() || s.ltp?.toLocaleString()}</td>
                        <td className="py-2 text-right text-blue-600">₹{s.high52Week?.toFixed(2)}</td>
                        <td className="py-2 text-right">{s.recommendedShares}</td>
                        <td className="py-2 text-right">₹{s.averageAmount?.toLocaleString()}</td>
                        <td className="py-2 text-right">
                          <div className="text-[10px] font-mono">
                            {(s.last10CAR || []).map((v: number) => v.toFixed(2)).join(", ")}
                          </div>
                        </td>
                        <td className="py-2 text-center">
                          <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px]">AVERAGE</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
