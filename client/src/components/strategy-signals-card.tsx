import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpCircle, ArrowDownCircle, MinusCircle, Zap, TrendingUp, BarChart3 } from "lucide-react";
import type { StockIndicators, StockQuote } from "@shared/schema";

interface StrategySignalsCardProps {
  indicators: StockIndicators | undefined;
  quote: StockQuote | undefined;
  isLoading: boolean;
}

interface SignalItem {
  name: string;
  description: string;
  signal: "BUY" | "SELL" | "NEUTRAL";
  icon: typeof Zap;
  detail: string;
}

export function StrategySignalsCard({ indicators, quote, isLoading }: StrategySignalsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Strategy Signals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!indicators || !quote) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Strategy Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select a stock to view strategy signals.</p>
        </CardContent>
      </Card>
    );
  }

  const signals: SignalItem[] = [
    {
      name: "RSI Strategy",
      description: "Relative Strength Index (14-period)",
      signal: indicators.rsi < 35 ? "BUY" : indicators.rsi > 65 ? "SELL" : "NEUTRAL",
      icon: Zap,
      detail: indicators.rsi < 35
        ? `RSI at ${indicators.rsi.toFixed(1)} - Oversold zone. Potential buying opportunity.`
        : indicators.rsi > 65
        ? `RSI at ${indicators.rsi.toFixed(1)} - Overbought zone. Consider taking profits.`
        : `RSI at ${indicators.rsi.toFixed(1)} - Neutral territory. Wait for clear signals.`,
    },
    {
      name: "SRTV (124 DMA)",
      description: "Stock Relative to Value ratio",
      signal: indicators.srtv < 0.96 ? "BUY" : indicators.srtv > 1.12 ? "SELL" : "NEUTRAL",
      icon: TrendingUp,
      detail: indicators.srtv < 0.96
        ? `SRTV at ${indicators.srtv.toFixed(3)} - Undervalued. Start SIP or accumulate.`
        : indicators.srtv > 1.12
        ? `SRTV at ${indicators.srtv.toFixed(3)} - Overvalued. Book partial profits.`
        : `SRTV at ${indicators.srtv.toFixed(3)} - Fair value range. Hold current positions.`,
    },
    {
      name: "Darvas Breakout",
      description: "5-day high breakout detection",
      signal: indicators.isBreakout ? "BUY" : "NEUTRAL",
      icon: BarChart3,
      detail: indicators.isBreakout
        ? `Price broke above 5-day high of ${indicators.darvasHigh.toFixed(2)}. Target: ${(quote.price * 1.06).toFixed(2)} (+6%).`
        : `No breakout detected. Darvas high at ${indicators.darvasHigh.toFixed(2)}. Waiting for breakout above this level.`,
    },
  ];

  const getSignalBadge = (signal: "BUY" | "SELL" | "NEUTRAL") => {
    switch (signal) {
      case "BUY":
        return (
          <Badge variant="default" className="bg-emerald-600 dark:bg-emerald-500 text-white">
            <ArrowUpCircle className="h-3 w-3 mr-1" />
            BUY
          </Badge>
        );
      case "SELL":
        return (
          <Badge variant="destructive">
            <ArrowDownCircle className="h-3 w-3 mr-1" />
            SELL
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <MinusCircle className="h-3 w-3 mr-1" />
            HOLD
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Strategy Signals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.map((s) => (
          <div
            key={s.name}
            className="rounded-md bg-muted/50 p-3 space-y-2"
            data-testid={`signal-${s.name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                </div>
              </div>
              {getSignalBadge(s.signal)}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
