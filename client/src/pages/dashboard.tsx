import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  BarChart2,
  Zap,
  ArrowUpRight,
  Package,
  ShoppingCart,
  Rocket,
  Turtle,
  TreePine,
  Coins,
  CandlestickChart,
  Search,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard-layout";

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  positive,
}: {
  title: string;
  value: string | number;
  change?: string;
  icon: any;
  positive?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5" data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-xs sm:text-sm text-muted-foreground">{title}</span>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-bold">{value}</div>
      {change && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${positive ? "text-green-400" : "text-red-400"}`}>
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
  );
}

const strategyLinks = [
  { path: "/dashboard/darvas", label: "Darvas Box", icon: Package, color: "bg-blue-500/15 text-blue-400" },

  { path: "/dashboard/nifty-shop", label: "RSI Nifty Shop", icon: Package, color: "bg-emerald-500/15 text-emerald-400" },
  { path: "/dashboard/gap-up", label: "Gap Up", icon: Rocket, color: "bg-orange-500/15 text-orange-400" },
  { path: "/dashboard/turtle", label: "Turtle Trading", icon: Turtle, color: "bg-teal-500/15 text-teal-400" },
  { path: "/dashboard/money-tree", label: "Money Tree ETF", icon: TreePine, color: "bg-emerald-500/15 text-emerald-400" },
  { path: "/dashboard/supu-model", label: "Supu Compounding", icon: Coins, color: "bg-yellow-500/15 text-yellow-400" },
  { path: "/dashboard/monthly-candle", label: "Monthly Candle", icon: CandlestickChart, color: "bg-purple-500/15 text-purple-400" },
  { path: "/dashboard/fundamental", label: "Fundamental", icon: BarChart2, color: "bg-indigo-500/15 text-indigo-400" },
  { path: "/dashboard/boh-filter", label: "BOH", icon: Search, color: "bg-pink-500/15 text-pink-400" },
  { path: "/dashboard/reit-invit", label: "REIT & INVIT", icon: Building2, color: "bg-cyan-500/15 text-cyan-400" },
] as const;

export default function Dashboard() {
  const [, navigate] = useLocation();

  const { data: statsData } = useQuery<any>({
    queryKey: ["/api/stats"],
  });

  const { data: signalsData } = useQuery<any[]>({
    queryKey: ["/api/signals", 6],
    queryFn: () => fetch("/api/signals?limit=6").then((r) => r.json()),
  });

  const { data: nifty50Market } = useQuery<any>({
    queryKey: ["/api/market", "^NSEI"],
    queryFn: () => fetch("/api/market/%5ENSEI").then((r) => r.json()),
  });

  const { data: next50Market } = useQuery<any>({
    queryKey: ["/api/market", "^NSMIDCP"],
    queryFn: () => fetch("/api/market/%5ENSMIDCP").then((r) => r.json()),
  });

  const getRSIColor = (rsi?: number) => {
    if (typeof rsi !== "number") return "";
    if (rsi < 30) return "text-emerald-500 dark:text-emerald-400";
    if (rsi > 70) return "text-red-500 dark:text-red-400";
    return "text-amber-500 dark:text-amber-400";
  };

  const getRSILabel = (rsi?: number) => {
    if (typeof rsi !== "number") return "";
    if (rsi < 30) return "Oversold";
    if (rsi > 70) return "Overbought";
    return "Neutral";
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-dashboard-heading">Dashboard</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Overview of your trading strategies and market signals.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-testid="stats-grid">
          <StatCard
            title="Active Signals"
            value={statsData?.activeSignals ?? 0}
            icon={Activity}
            change={statsData?.activeSignals > 0 ? `${statsData.buySignals} buy signals` : undefined}
            positive={true}
          />
          <StatCard title="Strategies" value={statsData?.strategies ?? 12} icon={Target} />
          <StatCard title="NIFTY Stocks" value={statsData?.niftyStocks ?? 0} icon={BarChart2} />
          <StatCard
            title="Scan Status"
            value={statsData?.scanStatus ?? "Idle"}
            icon={Zap}
            change={statsData?.scanStatus === "Active" ? "Scanner running" : undefined}
            positive={statsData?.scanStatus === "Active"}
          />
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Index RSI</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Activity className="h-3 w-3" />
                NIFTY 50
              </div>
              <div className={`text-xl sm:text-2xl font-bold ${getRSIColor(nifty50Market?.indicators?.rsi)}`}>
                {typeof nifty50Market?.indicators?.rsi === "number" ? nifty50Market.indicators.rsi.toFixed(1) : "—"}
              </div>
              <div className={`text-xs ${getRSIColor(nifty50Market?.indicators?.rsi)}`}>
                {getRSILabel(nifty50Market?.indicators?.rsi)}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Activity className="h-3 w-3" />
                NIFTY Next 50
              </div>
              <div className={`text-xl sm:text-2xl font-bold ${getRSIColor(next50Market?.indicators?.rsi)}`}>
                {typeof next50Market?.indicators?.rsi === "number" ? next50Market.indicators.rsi.toFixed(1) : "—"}
              </div>
              <div className={`text-xs ${getRSIColor(next50Market?.indicators?.rsi)}`}>
                {getRSILabel(next50Market?.indicators?.rsi)}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3" data-testid="text-all-strategies">All Strategies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {strategyLinks.map((strategy) => (
              <div
                key={strategy.path}
                onClick={() => navigate(strategy.path)}
                className="bg-card border border-border rounded-xl p-3 sm:p-4 cursor-pointer hover:border-primary/50 transition-colors group"
                data-testid={`strategy-link-${strategy.path.split("/").pop()}`}
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${strategy.color.split(" ")[0]} flex items-center justify-center`}>
                    <strategy.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${strategy.color.split(" ")[1]}`} />
                  </div>
                  <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs sm:text-sm font-medium leading-tight">{strategy.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h2 className="text-base sm:text-lg font-semibold" data-testid="text-latest-signals">Latest Signals</h2>
            <span
              className="text-xs sm:text-sm text-primary cursor-pointer hover:underline"
              onClick={() => navigate("/dashboard/scanner")}
              data-testid="link-view-all-signals"
            >
              View all
            </span>
          </div>

          <div className="block sm:hidden space-y-2">
            {(!signalsData || !Array.isArray(signalsData) || signalsData.length === 0) ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
                No signals yet. Run a scan from the Live Scanner page.
              </div>
            ) : (
              signalsData.map((sig: any, i: number) => (
                <div key={sig.id || i} className="bg-card border border-border rounded-xl p-3" data-testid={`signal-card-${i}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">{sig.symbol.replace(".NS", "")}</div>
                      <div className="text-[10px] text-muted-foreground">{sig.companyName}</div>
                    </div>
                    <Badge
                      className={`text-[10px] ${sig.signal === "BUY"
                        ? "bg-green-500/15 text-green-400 border-green-500/30"
                        : sig.signal === "SELL"
                          ? "bg-red-500/15 text-red-400 border-red-500/30"
                          : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                        }`}
                    >
                      {sig.signal}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="secondary" className="text-[10px]">{sig.strategy}</Badge>
                    <div className="flex gap-3">
                      <span className="text-muted-foreground">
                        Price: <span className="font-mono text-foreground">{sig.price ? `₹${sig.price.toFixed(2)}` : "—"}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Target: <span className="font-mono text-foreground">{sig.target ? `₹${sig.target.toFixed(2)}` : "—"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-latest-signals">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Symbol</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Strategy</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Signal</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Price</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {(!signalsData || !Array.isArray(signalsData) || signalsData.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No signals yet. Run a scan from the Live Scanner page.
                      </td>
                    </tr>
                  ) : (
                    signalsData.map((sig: any, i: number) => (
                      <tr key={sig.id || i} className="border-b border-border last:border-0" data-testid={`signal-row-${i}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{sig.symbol.replace(".NS", "")}</div>
                          <div className="text-xs text-muted-foreground">{sig.companyName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">{sig.strategy}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`text-xs ${sig.signal === "BUY"
                              ? "bg-green-500/15 text-green-400 border-green-500/30"
                              : sig.signal === "SELL"
                                ? "bg-red-500/15 text-red-400 border-red-500/30"
                                : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                              }`}
                          >
                            {sig.signal}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {sig.price ? `₹${sig.price.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {sig.target ? `₹${sig.target.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-[10px] sm:text-xs text-muted-foreground">
          This platform is for educational and informational purposes only. It does not constitute financial advice.
        </div>
      </div>
    </DashboardLayout>
  );
}
