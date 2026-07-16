import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import { CLERK_ENABLED } from "@/lib/clerk";
import logoImg from "@assets/final_logo_ai-stock_1771924785367.png";
import {
  BarChart2,
  Target,
  Shield,
  Zap,
  ArrowRight,
  Activity,
  DollarSign,
  LineChart,
  BookOpen,
  CheckCircle,
  Package,
  ShoppingCart,
  Rocket,
  Turtle,
  TreePine,
  Coins,
  CandlestickChart,
  Search,
  Building2,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const strategies: { name: string; icon: LucideIcon; desc: string }[] = [
  // Featured (first 6 render as large editorial cards)
  { name: "Nifty DMA Strategy", icon: LineChart, desc: "Automated bull-run buying with 50/100/200 DMA alignment and SIP averaging." },
  { name: "Fundamental + BOH", icon: BarChart2, desc: "Rank stocks by PE, PB, PS and EV/EBITDA, filtered through the BOH zone." },
  { name: "RSI Nifty Shop", icon: ShoppingCart, desc: "Mechanical mean-reversion with a 6-level, 7-lot averaging ladder." },
  { name: "Gap Up Strategy", icon: Rocket, desc: "Capture 3.14% gap-ups on NIFTY 100 with a 3 PM confirmation rule." },
  { name: "Turtle Trading", icon: Turtle, desc: "Classic 55-day breakout system with 15-part capital allocation." },
  { name: "REIT & INVIT", icon: Building2, desc: "Breakout-driven dividend income tracking across REITs and INVITs." },
  // Index (remaining 12 render as a compact contents list)
  { name: "BOH Filter", icon: Search, desc: "52-week high/low zone detection" },
  { name: "Supu Compounding", icon: Coins, desc: "Compounding via systematic cycles" },
  { name: "SRTV ETF Scanner", icon: TreePine, desc: "124-DMA mean reversion for NSE ETFs" },
  { name: "Monthly Candle", icon: CandlestickChart, desc: "Homma method on monthly timeframe" },
  { name: "Homa Genius Method", icon: Zap, desc: "Multi-ETF rotational relative strength" },
  { name: "Weekly ETF Contrarian", icon: Activity, desc: "Contrarian plays on major index ETFs" },
  { name: "LTVI Value Index", icon: Target, desc: "PB + PE + P/NSPS + P/RONW ranking" },
  { name: "Marking System", icon: Shield, desc: "Rank-based relative valuation scoring" },
  { name: "Money Tree ETF", icon: TreePine, desc: "Weekly SIP with profit-booking engine" },
  { name: "DMA Compounding", icon: Coins, desc: "6.28% target growth with tax modelling" },
  { name: "Smart CAR", icon: Activity, desc: "Cumulative average reversal analysis" },
  { name: "DMA + CAR Merged", icon: Package, desc: "Two-phase DMA then CAR confirmation" },
];

const stats = [
  { label: "Strategies", value: "18", icon: Target },
  { label: "NIFTY 100 Stocks", value: "100+", icon: BarChart2 },
  { label: "Backtest Years", value: "10+", icon: Activity },
  { label: "Risk Metrics", value: "8", icon: Shield },
];

const features = [
  { icon: Zap, title: "Live Scanner Engine", desc: "Daily scan of NIFTY 100 stocks applying all strategy filters simultaneously" },
  { icon: BarChart2, title: "Advanced Backtesting", desc: "Server-side backtesting with Sharpe ratio, CAGR, max drawdown & win rate" },
  { icon: LineChart, title: "Equity Curves", desc: "Visual equity curves and drawdown graphs for every strategy" },
  { icon: DollarSign, title: "Compounding Simulator", desc: "Simulate compounding growth with reinvest/withdraw model" },
  { icon: BookOpen, title: "Fundamental Ranking", desc: "Rank NIFTY 50/100 stocks by PE, PB, PS, EV/EBITDA scores" },
  { icon: Shield, title: "Risk Management", desc: "Built-in risk scoring, capital allocation, and position sizing for every trade" },
];

const checklist = [
  "Backtest any strategy on any NIFTY stock",
  "Live scanner with daily signal generation",
  "Portfolio P&L with CAGR calculator",
  "Compounding simulator for growth modeling",
  "Fundamental ranking by PE, PB, PS, EV/EBITDA",
  "REIT & INVIT dividend income tracker",
  "Equity curves and drawdown visualization",
  "Risk scoring and capital allocation engine",
  "BOH green/red zone detection",
  "Darvas Box breakout detection",
  "RSI-based averaging calculator",
  "Export reports and trade logs",
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // useUser() needs a ClerkProvider; only call it when Clerk is configured.
  const { isSignedIn } = CLERK_ENABLED ? useUser() : { isSignedIn: true };

  // Signed-in (or auth disabled) -> straight to the dashboard.
  // Signed-out with auth enabled -> sign up first.
  const goToDashboard = () => navigate(isSignedIn ? "/dashboard" : "/sign-up");

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b-4 border-foreground bg-background/95 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 bg-foreground flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5 text-background" strokeWidth={2} />
            </div>
            <span className="font-serif font-black text-lg sm:text-xl tracking-tight" data-testid="text-landing-title">Strategy Lab</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="news-label mr-3">Vol. 1 &middot; Est. MMXXVI</span>
            <Button onClick={goToDashboard} data-testid="button-get-started-nav" size="sm">
              Read Inside <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-border bg-background px-4 py-3">
            <Button
              onClick={() => { goToDashboard(); setMobileMenuOpen(false); }}
              className="w-full"
              data-testid="button-get-started-mobile"
            >
              Read Inside <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </nav>

      <section className="pt-20 sm:pt-24 pb-10 sm:pb-16 px-4 newsprint-texture">
        <div className="max-w-screen-xl mx-auto">
          {/* Masthead edition bar */}
          <div className="flex items-center justify-between border-y border-foreground py-2 mb-8 sm:mb-10">
            <span className="news-label">Financial Daily</span>
            <span className="news-label hidden sm:inline">All the Trades That&rsquo;s Fit to Print</span>
            <span className="news-label">Free Edition</span>
          </div>

          {/* Lead headline — editorial front page */}
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 border border-foreground bg-foreground text-background px-3 py-1 mb-6">
              <span className="h-1.5 w-1.5 bg-[hsl(var(--accent))]" />
              <span className="font-mono text-[0.65rem] uppercase tracking-widest">Breaking &middot; AI-Powered Analysis</span>
            </div>
            <h1 className="font-serif font-black leading-[0.9] tracking-tighter text-5xl sm:text-6xl lg:text-8xl mb-6" data-testid="text-hero-heading">
              Master the Market with <span className="italic">18 Proven Strategies</span>
            </h1>
            <p className="font-body text-base sm:text-xl text-neutral-700 max-w-2xl mx-auto mb-8 leading-relaxed">
              Real-time scanning, AI scoring, and capital allocation for NIFTY 100 stocks &mdash; from RSI ladders to Darvas Box breakouts, every edge in one edition.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button size="lg" onClick={goToDashboard} data-testid="button-open-dashboard">
                Open Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/dashboard/scanner")} data-testid="button-try-scanner">
                Try Live Scanner
              </Button>
            </div>
          </div>

          {/* Stat ledger — collapsed newspaper grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-l border-foreground mt-12 sm:mt-16" data-testid="stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="border-r border-b border-foreground p-5 text-center hover:bg-neutral-100 transition-colors">
                <stat.icon className="w-5 h-5 mx-auto mb-2" strokeWidth={1.5} />
                <div className="font-mono text-2xl sm:text-3xl font-bold">{stat.value}</div>
                <div className="news-label mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="news-ornament py-6 text-xl">&#x2727; &#x2727; &#x2727;</div>

      {/* New Here? — AI Analyst callout for beginners */}
      <section className="px-4">
        <div className="max-w-screen-xl mx-auto border-4 border-foreground bg-foreground text-background p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div className="text-center sm:text-left">
            <div className="news-label text-background/70 mb-2">New Here? Start With The Editor</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-black leading-tight mb-2">
              Let the AI Analyst read today&rsquo;s market for you.
            </h2>
            <p className="font-body text-sm text-background/80 max-w-md">
              One click reviews every strategy&rsquo;s signals and explains, in plain language, which
              stocks look interesting &mdash; and why. No jargon required.
            </p>
          </div>
          <Button
            size="lg"
            variant="secondary"
            className="bg-background text-foreground border-background hover:bg-foreground hover:text-background hover:border-background shrink-0"
            onClick={() => navigate(isSignedIn ? "/dashboard/advisor" : "/sign-up")}
            data-testid="button-ai-analyst-cta"
          >
            Meet the AI Analyst <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </section>

      <div className="news-ornament py-6 text-xl">&#x2727; &#x2727; &#x2727;</div>

      <section className="py-14 sm:py-20 px-4 border-t-4 border-foreground newsprint-texture">
        <div className="max-w-screen-xl mx-auto">
          {/* Section masthead */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-foreground pb-4 mb-8 sm:mb-10 gap-3">
            <div>
              <div className="news-label mb-2">Section B &middot; The Strategy Desk</div>
              <h2 className="font-serif text-4xl lg:text-5xl font-black leading-none tracking-tight" data-testid="text-strategies-heading">
                Battle-Tested Strategies
              </h2>
            </div>
            <p className="font-body text-sm text-neutral-600 sm:text-right max-w-xs">
              {strategies.length} systematic methods, each powered by live NIFTY market data.
            </p>
          </div>

          {/* Featured stories — 6 lead strategies as large editorial cells */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-foreground">
            {strategies.slice(0, 6).map((strategy, i) => (
              <div
                key={strategy.name}
                className="group relative border-r border-b border-foreground p-6 cursor-pointer transition-colors duration-200 hover:bg-foreground hover:text-background"
                data-testid={`strategy-card-${i}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="font-mono text-4xl font-bold leading-none text-foreground/15 transition-colors group-hover:text-[hsl(var(--accent))]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="h-10 w-10 border border-foreground flex items-center justify-center shrink-0 transition-colors group-hover:border-background">
                    <strategy.icon className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold leading-tight mb-1.5">{strategy.name}</h3>
                <p className="font-body text-sm leading-relaxed text-neutral-600 transition-colors group-hover:text-background/75">
                  {strategy.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Also on the desk — compact contents index for the remaining strategies */}
          <div className="flex items-center gap-3 mt-10 mb-4">
            <span className="news-label">Also on the Desk</span>
            <span className="flex-1 h-px bg-foreground/30" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-foreground">
            {strategies.slice(6).map((strategy, i) => (
              <div
                key={strategy.name}
                className="group flex items-baseline gap-3 border-r border-b border-foreground px-4 py-3 cursor-pointer transition-colors hover:bg-secondary"
                data-testid={`strategy-index-${i}`}
              >
                <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0 group-hover:text-[hsl(var(--accent))]">
                  {String(i + 7).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="font-serif text-base font-bold leading-tight truncate">{strategy.name}</div>
                  <div className="font-body text-xs text-neutral-600 leading-snug truncate">{strategy.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Powerful Features</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {features.map((feature) => (
              <div key={feature.title} className="bg-card border border-border rounded-xl p-4 sm:p-5">
                <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-2 sm:mb-3" />
                <h3 className="font-semibold text-sm sm:text-base mb-1.5 sm:mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Everything You Need</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {checklist.map((item) => (
              <div key={item} className="flex items-center gap-2.5 sm:gap-3 bg-card border border-border rounded-lg px-3 sm:px-4 py-2.5 sm:py-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <span className="text-xs sm:text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 px-4 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Ready to Start?</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 px-2">
            Access all strategies, real-time signals, and portfolio management tools.
          </p>
          <Button size="lg" onClick={goToDashboard} data-testid="button-cta-bottom" className="text-sm sm:text-base">
            Open Dashboard <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-6 sm:py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-[10px] sm:text-xs text-muted-foreground">
          <p>For educational purposes only. Not financial advice. Past performance does not guarantee future results.</p>
        </div>
      </footer>
    </div>
  );
}
