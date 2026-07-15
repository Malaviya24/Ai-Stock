import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, BarChart3, Target, Shield, ArrowUpRight, Download, Filter, RefreshCw, Briefcase, AlertTriangle, History, Info, BookOpen } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SignalBadge({ signal }: { signal: string }) {
  if (signal === "DMA_BUY") return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] sm:text-xs" data-testid="badge-buy">BUY</Badge>;
  if (signal === "SELL") return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] sm:text-xs" data-testid="badge-sell">SELL</Badge>;
  return <Badge className="bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30 text-[10px] sm:text-xs" data-testid="badge-notrade">NO TRADE</Badge>;
}

export default function StrategyDMA() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [capital, setCapital] = useState<number>(1000000);
  const [strategyState, setStrategyState] = useState<any>(null);

  // Fetch initial state
  useQuery({
    queryKey: ["/api/nifty-dma/state"],
    queryFn: async () => {
      const res = await fetch("/api/nifty-dma/state");
      const data = await res.json();
      setStrategyState(data);
      setCapital(data.capital.total);
      
      // If we have persisted scan results and no current scan result, set it
      if (data.lastScanResults && !scanResult) {
        setScanResult({ 
            scanResults: data.lastScanResults, 
            buy_count: data.lastScanResults.buyList.length 
        });
      }
      return data;
    }
  });

  async function updateCapital() {
    try {
      const res = await apiRequest("POST", "/api/nifty-dma/capital", { total: Number(capital) });
      const data = await res.json();
      setStrategyState((prev: any) => ({ ...prev, capital: data }));
      toast({ title: "Capital Updated", description: `Total capital set to ₹${data.total.toLocaleString()}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  async function handleScan(execute: boolean = false) {
    if (execute) setIsExecuting(true);
    else setIsScanning(true);
    
    try {
      const response = await apiRequest("POST", "/api/scan/dma", { execute });
      const result = await response.json();
      setScanResult(result);
      setStrategyState(result.state); // Update local state with latest from server
      
      const msg = execute 
        ? "Scan & Execution Complete. Check Holdings tab." 
        : `Scan Complete. Found ${result.buy_count} potential buys.`;
      
      toast({ title: execute ? "Execution Complete" : "Scan Complete", description: msg });
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
      setIsExecuting(false);
    }
  }

  const holdings = strategyState?.holdings || [];
  const quarantine = holdings.filter((h: any) => h.isQuarantine);
  const activeHoldings = holdings.filter((h: any) => !h.isQuarantine);
  const history = strategyState?.targetLogs || [];
  
  const cap = strategyState?.capital || { total: 0, used: 0, remaining: 0, parts: 50 };

  // Ensure buyList is sorted by price (LTP) ascending
  const sortedBuyList = scanResult?.scanResults?.buyList
    ? [...scanResult.scanResults.buyList].sort((a: any, b: any) => a.ltp - b.ltp)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-7xl mx-auto pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              Nifty DMA Strategy
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Automated Bull Run Buying & SIP Averaging System</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => handleScan(false)} disabled={isScanning || isExecuting} className="flex-1 sm:flex-none">
              {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Scan Only
            </Button>
          </div>
        </div>

        {/* Strategy Explanation Accordion */}
        <Accordion type="single" collapsible className="w-full bg-card rounded-xl border px-4">
          <AccordionItem value="explanation" className="border-b-0">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                <BookOpen className="w-4 h-4" />
                How This Strategy Works (Step-by-Step)
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-500" /> 1. Bull Run Logic (The BUY Signal)
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                    <li><strong>Universe:</strong> Strictly NIFTY Large Midcap 250 stocks.</li>
                    <li><strong>Trend Check:</strong> Price must be above <strong>50, 100, and 200 DMA</strong>.</li>
                    <li><strong>Value Filter:</strong> Price must be <strong>less than 10%</strong> above the 200 DMA (to avoid overextended stocks).</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-500" /> 2. Risk & Trade Management
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                    <li><strong>Allocation:</strong> Capital is divided into <strong>50 equal parts</strong> (1 stock = 1 part).</li>
                    <li><strong>Target:</strong> Auto-sell at <strong>+6.28%</strong> profit.</li>
                    <li><strong>Quarantine (No Stop Loss):</strong> If stock falls <strong>-20%</strong>, we start SIP (1/15th size) to average down until breakeven.</li>
                  </ul>
                </div>
              </div>
              <div className="pt-2 border-t mt-2">
                <p className="text-xs">
                  <strong>Scanner Execution:</strong> Fetches 500 days of history from Shoonya → Calculates DMAs → Filters for Bull Run → Sorts by Price (Low to High) for affordability.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* SCAN RESULTS */}
        <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" /> Eligible Buy List (Bull Run)
            </h3>
            {!scanResult?.scanResults?.buyList?.length ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No buy signals found or scan not run yet.</div>
            ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs">
                        <th className="pb-2">Stock Name</th>
                        <th className="pb-2 text-right">CMP</th>
                        <th className="pb-2 text-right">% Diff 200 DMA</th>
                        <th className="pb-2 text-center">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {sortedBuyList.map((s: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2">
                            <div className="font-medium">{s.name || s.symbol.replace('.NS','')}</div>
                            <div className="text-[10px] text-muted-foreground">{s.symbol.replace('.NS','')}</div>
                        </td>
                        <td className="py-2 text-right font-medium">₹{s.ltp.toLocaleString()}</td>
                        <td className="py-2 text-right">
                            <span className={s.dist200 > 0 ? "text-green-600" : "text-red-600"}>{s.dist200.toFixed(2)}%</span>
                        </td>
                        <td className="py-2 text-center"><Badge variant="outline" className="text-green-600 border-green-200">BUY</Badge></td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            )}
        </div>
      </div>
    </DashboardLayout>
  );
}
