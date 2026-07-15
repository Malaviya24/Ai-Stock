import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Layers, TrendingUp, Target, Shield, Filter, Download, ArrowUpRight, Search } from "lucide-react";

function CARBadge({ signal }: { signal: string }) {
  if (signal === "STRONG_BUY") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] sm:text-xs" data-testid="badge-strong-buy">STRONG BUY</Badge>;
  if (signal === "BUY") return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs" data-testid="badge-buy">BUY</Badge>;
  return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs" data-testid="badge-avoid">AVOID</Badge>;
}

export default function StrategyDMACar() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [inputSymbol, setInputSymbol] = useState("");

  const { data: signals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals", "dma-car"],
    queryFn: () => fetch("/api/signals?limit=200&strategy=dma-car").then(r => r.json()),
  });

  async function handleAnalyze() {
    if (!inputSymbol.trim()) {
      toast({ title: "Input Required", description: "Please enter a stock symbol (e.g. RELIANCE)", variant: "destructive" });
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await apiRequest("POST", "/api/analyze/car", { symbol: inputSymbol });
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Analysis failed");
      }

      setScanResult(result.data);
      toast({ 
        title: "CAR Analysis Complete", 
        description: `${result.data.symbol}: ${result.data.carSignal}` 
      });
    } catch (error: any) {
      toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-3xl mx-auto">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 shrink-0" />
              <span className="truncate">Smart CAR Analysis</span>
            </h1>
            <p className="text-[11px] sm:text-xs lg:text-sm text-muted-foreground mt-1">Analyze any stock for Capital Appreciation Return (CAR) trend confirmation.</p>
          </div>
          
          <div className="flex gap-2 items-center bg-card border border-border p-3 rounded-xl">
            <Input 
              placeholder="Enter Stock Symbol (e.g. TATASTEEL)" 
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              className="max-w-xs"
            />
            <Button onClick={handleAnalyze} disabled={isScanning}>
              {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Analyze
            </Button>
          </div>
        </div>

        {scanResult && (
          <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{scanResult.symbol}</h2>
                <p className="text-sm text-muted-foreground">{scanResult.name}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold">₹{scanResult.price?.toLocaleString()}</div>
                <CARBadge signal={scanResult.carSignal} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <div className="text-xs text-muted-foreground">52-Week High</div>
                <div className="font-medium">₹{scanResult.high52Week?.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{new Date(scanResult.highDate).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Current Drawdown</div>
                <div className={`font-medium ${scanResult.drawdown < -20 ? "text-red-500" : "text-foreground"}`}>
                  {scanResult.drawdown?.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Target (1.618 Fib)</div>
                <div className="font-medium text-emerald-500">₹{scanResult.target628?.toLocaleString()}</div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <h3 className="font-semibold mb-2">Analysis Logic</h3>
              <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                <li>Trend is determined by calculating average returns from the 52-week high date.</li>
                <li><strong>STRONG BUY:</strong> 10 rising average return points confirmed.</li>
                <li><strong>BUY:</strong> Positive momentum detected but early stage.</li>
                <li><strong>AVOID:</strong> Negative or flat momentum.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
