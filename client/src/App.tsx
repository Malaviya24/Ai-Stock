import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/scanner" component={Scanner} />
      <Route path="/dashboard/portfolio" component={Portfolio} />

      <Route path="/dashboard/gap-up" component={StrategyGapUp} />
      {/* Weekly ETF Contrarian (slug = method name) */}
      <Route path="/dashboard/weekly-etf-contrarian" component={StrategyTurtle} />
      {/* Backward-compat alias */}
      <Route path="/dashboard/turtle" component={StrategyTurtle} />
      {/* Turtle Trading (55-day) */}
      <Route path="/dashboard/turtle-trading" component={StrategyTurtle55} />
      {/* Backward-compat alias */}
      <Route path="/dashboard/turtle-55" component={StrategyTurtle55} />
      <Route path="/dashboard/srtv-etf" component={StrategyMoneyTree} />
      {/* Supu Compounding */}
      <Route path="/dashboard/supu-compounding" component={StrategySupu} />
      {/* Backward-compat alias */}
      <Route path="/dashboard/supu-model" component={StrategySupu} />
      <Route path="/dashboard/monthly-candle" component={StrategyMonthlyCandle} />
      {/* Fundamental + BOH */}
      <Route path="/dashboard/fundamental-boh" component={StrategyFundamental} />
      {/* Backward-compat alias */}
      <Route path="/dashboard/fundamental" component={StrategyFundamental} />
      <Route path="/dashboard/boh-filter" component={StrategyBoh} />
      <Route path="/dashboard/reit-invit" component={StrategyReit} />
      <Route path="/dashboard/nifty-shop" component={StrategyNiftyShop} />
      <Route path="/dashboard/ltvi" component={StrategyLtvi} />
      <Route path="/dashboard/marking" component={StrategyMarking} />
      <Route path="/dashboard/money-tree-etf" component={StrategyMoneyTreeEtf} />
      <Route path="/dashboard/nifty-dma" component={StrategyDMA} />
      <Route path="/dashboard/dma-compound" component={StrategyDMACompound} />
      <Route path="/dashboard/smart-car" component={StrategyCAR} />
      <Route path="/dashboard/dma-car" component={StrategyDMACar} />
      <Route path="/dashboard/homa-genius" component={StrategyHoma} />
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
