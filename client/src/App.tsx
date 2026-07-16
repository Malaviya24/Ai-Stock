import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import RequireAuth from "@/components/require-auth";

// Lazy-load all dashboard/strategy pages so the initial bundle is small (~200KB
// instead of 1.1MB). Each page loads on demand when the user navigates to it.
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Scanner = lazy(() => import("@/pages/scanner"));
const Portfolio = lazy(() => import("@/pages/portfolio"));
const StrategyGapUp = lazy(() => import("@/pages/strategy-gap-up"));
const StrategyTurtle = lazy(() => import("@/pages/strategy-turtle"));
const StrategyMoneyTree = lazy(() => import("@/pages/strategy-money-tree"));
const StrategySupu = lazy(() => import("@/pages/strategy-supu"));
const StrategyMonthlyCandle = lazy(() => import("@/pages/strategy-monthly-candle"));
const StrategyFundamental = lazy(() => import("@/pages/strategy-fundamental"));
const StrategyBoh = lazy(() => import("@/pages/strategy-boh"));
const StrategyReit = lazy(() => import("@/pages/strategy-reit"));
const StrategyNiftyShop = lazy(() => import("@/pages/strategy-nifty-shop"));
const StrategyLtvi = lazy(() => import("@/pages/strategy-ltvi"));
const StrategyMarking = lazy(() => import("@/pages/strategy-marking"));
const StrategyMoneyTreeEtf = lazy(() => import("@/pages/strategy-money-tree-etf"));
const StrategyTurtle55 = lazy(() => import("@/pages/strategy-turtle-55"));
const StrategyDMA = lazy(() => import("@/pages/strategy-dma"));
const StrategyDMACompound = lazy(() => import("@/pages/strategy-dma-compound"));
const StrategyCAR = lazy(() => import("@/pages/strategy-car"));
const StrategyDMACar = lazy(() => import("@/pages/strategy-dma-car"));
const StrategyHoma = lazy(() => import("@/pages/strategy-homa"));
const AdvisorPage = lazy(() => import("@/pages/advisor"));
const SavedPage = lazy(() => import("@/pages/saved"));

// Wraps a page component with RequireAuth so signed-out users are redirected
// to /sign-in. Applied to every /dashboard/* route below.
function protected_(Component: React.ComponentType) {
  return function ProtectedRoute() {
    return (
      <RequireAuth>
        <Component />
      </RequireAuth>
    );
  };
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />

      <Route path="/dashboard" component={protected_(Dashboard)} />
      <Route path="/dashboard/scanner" component={protected_(Scanner)} />
      <Route path="/dashboard/portfolio" component={protected_(Portfolio)} />
      <Route path="/dashboard/advisor" component={protected_(AdvisorPage)} />
      <Route path="/dashboard/saved" component={protected_(SavedPage)} />

      <Route path="/dashboard/gap-up" component={protected_(StrategyGapUp)} />
      {/* Weekly ETF Contrarian (slug = method name) */}
      <Route path="/dashboard/weekly-etf-contrarian" component={protected_(StrategyTurtle)} />
      {/* Backward-compat alias */}
      <Route path="/dashboard/turtle" component={protected_(StrategyTurtle)} />
      {/* Turtle Trading (55-day) */}
      <Route path="/dashboard/turtle-trading" component={protected_(StrategyTurtle55)} />
      {/* Backward-compat alias */}
      <Route path="/dashboard/turtle-55" component={protected_(StrategyTurtle55)} />
      <Route path="/dashboard/srtv-etf" component={protected_(StrategyMoneyTree)} />
      {/* Supu Compounding */}
      <Route path="/dashboard/supu-compounding" component={protected_(StrategySupu)} />
      {/* Backward-compat alias */}
      <Route path="/dashboard/supu-model" component={protected_(StrategySupu)} />
      <Route path="/dashboard/monthly-candle" component={protected_(StrategyMonthlyCandle)} />
      {/* Fundamental + BOH */}
      <Route path="/dashboard/fundamental-boh" component={protected_(StrategyFundamental)} />
      {/* Backward-compat alias */}
      <Route path="/dashboard/fundamental" component={protected_(StrategyFundamental)} />
      <Route path="/dashboard/boh-filter" component={protected_(StrategyBoh)} />
      <Route path="/dashboard/reit-invit" component={protected_(StrategyReit)} />
      <Route path="/dashboard/nifty-shop" component={protected_(StrategyNiftyShop)} />
      <Route path="/dashboard/ltvi" component={protected_(StrategyLtvi)} />
      <Route path="/dashboard/marking" component={protected_(StrategyMarking)} />
      <Route path="/dashboard/money-tree-etf" component={protected_(StrategyMoneyTreeEtf)} />
      <Route path="/dashboard/nifty-dma" component={protected_(StrategyDMA)} />
      <Route path="/dashboard/dma-compound" component={protected_(StrategyDMACompound)} />
      <Route path="/dashboard/smart-car" component={protected_(StrategyCAR)} />
      <Route path="/dashboard/dma-car" component={protected_(StrategyDMACar)} />
      <Route path="/dashboard/homa-genius" component={protected_(StrategyHoma)} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={null}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
