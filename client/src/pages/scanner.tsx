import { useState } from "react";
import { formatDetails } from "@/lib/format-details";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Radar, TrendingUp, TrendingDown, Eye, Search, Loader2 } from "lucide-react";

// Values must match the exact `strategy` strings written by POST /api/scan
// (server/routes.ts) â€” this basic scan only ever produces these three, so a
// tab for any other strategy name (e.g. "darvas") would always be empty and
// look broken/unresponsive even though the click handler works fine.
const strategies = [
  { value: "all", label: "All" },
  { value: "gap-up", label: "Gap Up" },
  { value: "turtle", label: "Turtle" },
  { value: "rsi-nifty-shop", label: "RSI Shop" },
];

interface Signal {
  id: number;
  symbol: string;
  strategy: string;
  signal: string;
  price: number | string;
  target: number | string | null;
  details: string | null;
  date: string;
  companyName?: string;
}

function SignalBadge({ signal }: { signal: string }) {
  const upper = signal.toUpperCase();
  if (upper === "BUY") {
    return (
      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 no-default-hover-elevate no-default-active-elevate text-[10px] sm:text-xs" data-testid={`badge-signal-buy`}>
        <TrendingUp className="w-3 h-3 mr-1" />
        BUY
      </Badge>
    );
  }
  if (upper === "SELL") {
    return (
      <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 no-default-hover-elevate no-default-active-elevate text-[10px] sm:text-xs" data-testid={`badge-signal-sell`}>
        <TrendingDown className="w-3 h-3 mr-1" />
        SELL
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 no-default-hover-elevate no-default-active-elevate text-[10px] sm:text-xs" data-testid={`badge-signal-watch`}>
      <Eye className="w-3 h-3 mr-1" />
      WATCH
    </Badge>
  );
}

export default function ScannerPage() {
  const [selectedStrategy, setSelectedStrategy] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  const queryUrl = selectedStrategy === "all"
    ? "/api/signals?limit=100"
    : `/api/signals?limit=100&strategy=${selectedStrategy}`;

  const { data: signals = [], isLoading } = useQuery<Signal[]>({
    queryKey: ["/api/signals", { limit: 100, strategy: selectedStrategy }],
    queryFn: async () => {
      const res = await fetch(queryUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch signals");
      return res.json();
    },
  });

  const filteredSignals = signals.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.symbol?.toLowerCase().includes(q) ||
      s.companyName?.toLowerCase().includes(q) ||
      s.strategy?.toLowerCase().includes(q)
    );
  });

  const totalSignals = filteredSignals.length;
  const buyCount = filteredSignals.filter((s) => s.signal?.toUpperCase() === "BUY").length;
  const sellCount = filteredSignals.filter((s) => s.signal?.toUpperCase() === "SELL").length;
  const watchCount = filteredSignals.filter((s) => s.signal?.toUpperCase() === "WATCH").length;

  async function handleRunScan() {
    setIsScanning(true);
    try {
      const response = await apiRequest("POST", "/api/scan");
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Scan Complete",
        description: result.message || `Found ${result.count ?? 0} signals.`,
      });
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message || "An error occurred while scanning.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }

  const statsCards = [
    { label: "Total", value: totalSignals, icon: Radar, testId: "stat-total" },
    { label: "BUY", value: buyCount, icon: TrendingUp, testId: "stat-buy" },
    { label: "SELL", value: sellCount, icon: TrendingDown, testId: "stat-sell" },
    { label: "WATCH", value: watchCount, icon: Eye, testId: "stat-watch" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" data-testid="text-scanner-title">Live Scanner</h2>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1" data-testid="text-scanner-subtitle">
              Real-time signals across all strategies for NIFTY 100 stocks.
            </p>
          </div>
          <Button
            onClick={handleRunScan}
            disabled={isScanning}
            data-testid="button-run-scan"
            className="w-full sm:w-auto shrink-0"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Radar className="w-4 h-4 mr-2" />
                Run Live Scan
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {strategies.map((s) => (
            <Button
              key={s.value}
              variant={selectedStrategy === s.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStrategy(s.value)}
              data-testid={`tab-strategy-${s.value}`}
              className="toggle-elevate text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3"
            >
              {s.label}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
            data-testid="input-search"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {statsCards.map((card) => (
            <div
              key={card.testId}
              className="bg-card border border-border rounded-xl p-3 sm:p-4"
              data-testid={card.testId}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-sm text-muted-foreground">{card.label}</span>
                <card.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              </div>
              <div className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">
                {isLoading ? <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" /> : card.value}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" data-testid={`skeleton-row-${i}`} />
              ))}
            </div>
          ) : filteredSignals.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm" data-testid="text-no-signals">
              No signals found. Try running a live scan or adjusting your filters.
            </div>
          ) : (
            <>
              <div className="block md:hidden divide-y divide-border">
                {filteredSignals.map((signal, index) => (
                  <div key={signal.id ?? index} className="p-3 space-y-2" data-testid={`card-signal-${signal.id ?? index}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{signal.symbol}</div>
                        <div className="text-[10px] text-muted-foreground">{signal.companyName || signal.strategy}</div>
                      </div>
                      <SignalBadge signal={signal.signal} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-[10px]">
                        {signal.strategy}
                      </Badge>
                      <div className="flex gap-3">
                        <span>
                          Price: <span className="font-mono text-foreground">{signal.price != null ? `â‚¹${Number(signal.price).toLocaleString("en-IN")}` : "â€”"}</span>
                        </span>
                        <span>
                          Target: <span className="font-mono text-foreground">{signal.target != null ? `â‚¹${Number(signal.target).toLocaleString("en-IN")}` : "â€”"}</span>
                        </span>
                      </div>
                    </div>
                    {signal.details && (
                      <div className="text-[10px] text-muted-foreground truncate">{formatDetails(signal.details)}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Signal</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="hidden lg:table-cell">Details</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSignals.map((signal, index) => (
                      <TableRow key={signal.id ?? index} data-testid={`row-signal-${signal.id ?? index}`}>
                        <TableCell className="font-medium" data-testid={`text-symbol-${signal.id ?? index}`}>
                          {signal.symbol}
                        </TableCell>
                        <TableCell data-testid={`text-strategy-${signal.id ?? index}`}>
                          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                            {signal.strategy}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <SignalBadge signal={signal.signal} />
                        </TableCell>
                        <TableCell data-testid={`text-price-${signal.id ?? index}`}>
                          {signal.price != null ? `â‚¹${Number(signal.price).toLocaleString("en-IN")}` : "â€”"}
                        </TableCell>
                        <TableCell data-testid={`text-target-${signal.id ?? index}`}>
                          {signal.target != null ? `â‚¹${Number(signal.target).toLocaleString("en-IN")}` : "â€”"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate hidden lg:table-cell" data-testid={`text-details-${signal.id ?? index}`}>
                          {signal.details || "â€”"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm" data-testid={`text-date-${signal.id ?? index}`}>
                          {signal.date ? new Date(signal.date).toLocaleDateString() : "â€”"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
