import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import logoImg from "@assets/final_logo_ai-stock_1771924785367.png";
import {
  TrendingUp,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Rocket,
  Turtle,
  TreePine,
  Coins,
  CandlestickChart,
  BarChart3,
  Search,
  Building2,
  LineChart,
  Menu,
  X,
  Bell,
  User,
  Store,
  Trophy,
  Award,
  Sprout,
  ArrowUpRight,
  Activity,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  // Core
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/dashboard/scanner", label: "Live Scanner", icon: Search },
  { path: "/dashboard/portfolio", label: "Portfolio", icon: LineChart },
  // Ordered per user request
  { path: "/dashboard/reit-invit", label: "REIT & INVIT", icon: Building2 },              // 1
  { path: "/dashboard/boh-filter", label: "BOH Filter", icon: Search },                   // 2
  { path: "/dashboard/supu-compounding", label: "Supu Compounding", icon: Coins },        // 3
  { path: "/dashboard/srtv-etf", label: "SRTV ETF Scanner", icon: TreePine },            // 4
  { path: "/dashboard/monthly-candle", label: "Monthly Candle", icon: CandlestickChart },// 5
  { path: "/dashboard/fundamental-boh", label: "Fundamental + BOH", icon: BarChart3 },    // 6
  { path: "/dashboard/homa-genius", label: "Homa Genius Method", icon: TrendingUp },     // 7
  { path: "/dashboard/weekly-etf-contrarian", label: "Weekly ETF Contrarian", icon: Turtle }, // 8
  { path: "/dashboard/nifty-shop", label: "RSI Nifty Shop", icon: Store },               // 9
  { path: "/dashboard/ltvi", label: "LTVI Value Index", icon: Trophy },                  // 10
  { path: "/dashboard/marking", label: "Marking System", icon: Award },                  // 11
  { path: "/dashboard/money-tree-etf", label: "Money Tree ETF", icon: Sprout },          // 12
  { path: "/dashboard/turtle-trading", label: "Turtle Trading", icon: ArrowUpRight },     // 13
  { path: "/dashboard/gap-up", label: "Gap Up Strategy", icon: Rocket },                 // 14
  // Other strategies (kept at the end)
  { path: "/dashboard/nifty-dma", label: "Nifty DMA Strategy", icon: BarChart3 },
  { path: "/dashboard/dma-compound", label: "DMA Compounding", icon: Coins },
  { path: "/dashboard/smart-car", label: "Smart CAR", icon: Activity },
  { path: "/dashboard/dma-car", label: "DMA + CAR Merged", icon: Layers },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();

  const isPathActive = (loc: string, base: string) => {
    if (loc === base) return true;
    // Mark active for nested routes under base (exact segment match only)
    return loc.startsWith(base + "/");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b-4 border-foreground">
        <div className="news-label mb-1.5">Vol. 1 &middot; Est. MMXXVI</div>
        <div className="font-serif text-2xl font-black leading-none tracking-tight" data-testid="text-app-title">
          Strategy Lab
        </div>
        <div className="news-label mt-1.5">The Market Ledger</div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto overscroll-contain">
        <div className="news-label px-2 pb-2">Newsroom</div>
        <div className="space-y-px">
          {navItems.map((item, i) => {
            const isActive = isPathActive(location, item.path);
            // Insert an editorial section label before the first strategy item.
            const showStrategiesLabel = i === 3;
            return (
              <div key={item.path}>
                {showStrategiesLabel && (
                  <div className="news-label px-2 pt-4 pb-2">Strategy Desk</div>
                )}
                <Link
                  href={item.path}
                  onClick={onNavigate}
                  data-testid={`nav-${item.path.replace(/\//g, "-").slice(1)}`}
                >
                  <div
                    className={`flex items-center gap-3 px-3 py-2 text-xs font-sans uppercase tracking-wider transition-colors cursor-pointer border-l-2 ${
                      isActive
                        ? "bg-foreground text-background border-l-[hsl(var(--accent))] font-semibold"
                        : "text-muted-foreground border-l-transparent hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="px-3 py-4 border-t-4 border-foreground">
        <Link href="/">
          <Button variant="outline" size="sm" className="w-full justify-center" data-testid="button-back-home">
            &larr; Back to Front Page
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const editionDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const currentPage = navItems.find((item) => {
    if (location === item.path) return true;
    return location.startsWith(item.path + "/");
  });
  const pageTitle = currentPage?.label || "Dashboard";

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      <aside className="hidden lg:flex w-64 border-r border-border bg-sidebar text-sidebar-foreground flex-col shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-sidebar text-sidebar-foreground z-50 lg:hidden border-r border-border shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="sr-only">Navigation</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="ml-auto"
                data-testid="button-close-sidebar"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b-4 border-foreground flex items-center justify-between px-3 sm:px-4 lg:px-6 bg-background shrink-0 gap-2 py-2.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <div className="hidden sm:block news-label">Today&rsquo;s Edition &middot; {editionDate}</div>
              <h1 className="font-serif text-lg sm:text-2xl font-bold leading-tight truncate" data-testid="text-page-title">
                {pageTitle}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:block text-right news-label leading-tight">
              NSE / BSE<br />Live Edition
            </div>
            <Button variant="ghost" size="icon" data-testid="button-notifications" className="h-9 w-9" aria-label="Notifications">
              <Bell className="w-4 h-4" strokeWidth={1.5} />
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-user" className="h-9 w-9" aria-label="Account">
              <User className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
