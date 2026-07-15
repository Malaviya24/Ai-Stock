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
  Moon,
  Sun,
  Store,
  Trophy,
  Award,
  Sprout,
  ArrowUpRight,
  Activity,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

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
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
        <img src={logoImg} alt="Strategy Lab" className="w-8 h-8 rounded-lg shrink-0 object-contain" />
        <div className="min-w-0">
          <div className="font-bold text-sm leading-tight truncate" data-testid="text-app-title">Strategy Lab</div>
          <div className="text-xs text-muted-foreground truncate">Capital Allocation</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto overscroll-contain">
        {navItems.map((item) => {
          const isActive = isPathActive(location, item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onNavigate}
              data-testid={`nav-${item.path.replace(/\//g, "-").slice(1)}`}
            >
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground text-sm" data-testid="button-back-home">
            <img src={logoImg} alt="" className="w-4 h-4 shrink-0 object-contain" />
            <span className="truncate">Back to Home</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

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
        <header className="h-14 border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-6 bg-background shrink-0 gap-2">
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
            <h1 className="text-base sm:text-lg font-semibold truncate" data-testid="text-page-title">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-notifications" className="h-8 w-8 sm:h-9 sm:w-9">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-user" className="h-8 w-8 sm:h-9 sm:w-9">
              <User className="w-4 h-4" />
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
