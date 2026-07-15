import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Activity, BarChart3, Target, Gauge } from "lucide-react";
import type { MarketOverview } from "@shared/schema";

interface MarketOverviewCardProps {
  data: MarketOverview | undefined;
  isLoading: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}

function formatPrice(num: number): string {
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MarketOverviewCard({ data, isLoading }: MarketOverviewCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Market Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Market Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available. Add a stock to your watchlist.</p>
        </CardContent>
      </Card>
    );
  }

  const { quote, indicators } = data;
  const isPositive = quote.change >= 0;

  const getRSIColor = (rsi: number) => {
    if (rsi < 30) return "text-emerald-500 dark:text-emerald-400";
    if (rsi > 70) return "text-red-500 dark:text-red-400";
    return "text-amber-500 dark:text-amber-400";
  };

  const getRSILabel = (rsi: number) => {
    if (rsi < 30) return "Oversold";
    if (rsi > 70) return "Overbought";
    return "Neutral";
  };

  const getSRTVColor = (srtv: number) => {
    if (srtv < 0.96) return "text-emerald-500 dark:text-emerald-400";
    if (srtv > 1.12) return "text-red-500 dark:text-red-400";
    return "text-amber-500 dark:text-amber-400";
  };

  const getSRTVLabel = (srtv: number) => {
    if (srtv < 0.96) return "Undervalued";
    if (srtv > 1.12) return "Overvalued";
    return "Fair Value";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Market Overview</CardTitle>
          <Badge variant={isPositive ? "default" : "destructive"} data-testid="badge-market-direction">
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {isPositive ? "Bullish" : "Bearish"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-3 flex-wrap" data-testid="text-price-display">
          <span className="text-3xl font-bold tracking-tight">{formatPrice(quote.price)}</span>
          <span className={`text-lg font-semibold ${isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {isPositive ? "+" : ""}{quote.change.toFixed(2)} ({isPositive ? "+" : ""}{quote.changePercent.toFixed(2)}%)
          </span>
        </div>

        <div className="text-xs text-muted-foreground mb-1">
          {quote.name} ({quote.symbol})
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gauge className="h-3 w-3" />
              RSI (14)
            </div>
            <div className={`text-lg font-semibold ${getRSIColor(indicators.rsi)}`} data-testid="text-rsi-value">
              {indicators.rsi.toFixed(1)}
            </div>
            <div className={`text-xs font-medium ${getRSIColor(indicators.rsi)}`}>
              {getRSILabel(indicators.rsi)}
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              124 DMA
            </div>
            <div className="text-lg font-semibold" data-testid="text-dma-value">
              {formatPrice(indicators.dma124)}
            </div>
            <div className="text-xs text-muted-foreground">
              {quote.price > indicators.dma124 ? "Above" : "Below"} DMA
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              SRTV
            </div>
            <div className={`text-lg font-semibold ${getSRTVColor(indicators.srtv)}`} data-testid="text-srtv-value">
              {indicators.srtv.toFixed(3)}
            </div>
            <div className={`text-xs font-medium ${getSRTVColor(indicators.srtv)}`}>
              {getSRTVLabel(indicators.srtv)}
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              Darvas High
            </div>
            <div className="text-lg font-semibold" data-testid="text-darvas-value">
              {formatPrice(indicators.darvasHigh)}
            </div>
            <div className={`text-xs font-medium ${indicators.isBreakout ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {indicators.isBreakout ? "Breakout!" : "No Breakout"}
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Day Range
            </div>
            <div className="text-sm font-semibold">
              {formatPrice(quote.low)} - {formatPrice(quote.high)}
            </div>
            <div className="text-xs text-muted-foreground">
              Open: {formatPrice(quote.open)}
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              Volume
            </div>
            <div className="text-lg font-semibold">
              {formatNumber(quote.volume)}
            </div>
            <div className="text-xs text-muted-foreground">
              Prev Close: {formatPrice(quote.previousClose)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
