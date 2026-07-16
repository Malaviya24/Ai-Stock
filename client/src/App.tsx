import { Switch, Route } from "wouter";
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
import Dashboard from "@/pages/dashboard";
import Scanner from "@/pages/scanner";
import Portfolio from "@/pages/portfolio";

import StrategyGapUp from "@/pages/strategy-gap-up";
import StrategyTurtle from "@/pages/strategy-turtle";
import StrategyMoneyTree from "@/pages/strategy-money-tree";
import StrategySupu from "@/pages/strategy-supu";
import StrategyMonthlyCandle from "@/pages/strategy-monthly-candle";
import StrategyFundamental from "@/pages/strategy-fundamental";
import StrategyBoh from "@/pages/strategy-boh";
import StrategyReit from "@/pages/strategy-reit";
import StrategyNiftyShop from "@/pages/strategy-nifty-shop";
import StrategyLtvi from "@/pages/strategy-ltvi";
import StrategyMarking from "@/pages/strategy-marking";
import StrategyMoneyTreeEtf from "@/pages/strategy-money-tree-etf";
import StrategyTurtle55 from "@/pages/strategy-turtle-55";
import StrategyDMA from "@/pages/strategy-dma";
import StrategyDMACompound from "@/pages/strategy-dma-compound";
import StrategyCAR from "@/pages/strategy-car";
import StrategyDMACar from "@/pages/strategy-dma-car";
import StrategyHoma from "@/pages/strategy-homa";

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
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
