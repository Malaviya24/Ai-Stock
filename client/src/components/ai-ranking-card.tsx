import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { AIScore } from "@shared/schema";

interface AIRankingCardProps {
  scores: AIScore[] | undefined;
  isLoading: boolean;
  onSelectStock?: (symbol: string) => void;
  selectedSymbol?: string;
}

export function AIRankingCard({ scores, isLoading, onSelectStock, selectedSymbol }: AIRankingCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Stock Ranking</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!scores || scores.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Stock Ranking</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No stocks analyzed yet. Add stocks to your watchlist.</p>
        </CardContent>
      </Card>
    );
  }

  const getSignalBadge = (signal: string) => {
    switch (signal) {
      case "STRONG_BUY":
        return (
          <Badge variant="default" className="bg-emerald-600 dark:bg-emerald-500 text-white">
            <TrendingUp className="h-3 w-3 mr-1" />
            Strong Buy
          </Badge>
        );
      case "BUY":
        return (
          <Badge variant="default" className="bg-emerald-600/80 dark:bg-emerald-500/80 text-white">
            <TrendingUp className="h-3 w-3 mr-1" />
            Buy
          </Badge>
        );
      case "SELL":
        return (
          <Badge variant="destructive">
            <TrendingDown className="h-3 w-3 mr-1" />
            Sell
          </Badge>
        );
      case "STRONG_SELL":
        return (
          <Badge variant="destructive">
            <TrendingDown className="h-3 w-3 mr-1" />
            Strong Sell
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Minus className="h-3 w-3 mr-1" />
            Hold
          </Badge>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-500 dark:text-emerald-400";
    if (score >= 40) return "text-amber-500 dark:text-amber-400";
    return "text-red-500 dark:text-red-400";
  };

  const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium text-muted-foreground">AI Stock Ranking</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((score, index) => (
          <button
            key={score.symbol}
            onClick={() => onSelectStock?.(score.symbol)}
            className={`w-full text-left rounded-md p-3 transition-colors hover-elevate ${
              selectedSymbol === score.symbol
                ? "bg-primary/10 ring-1 ring-primary/20"
                : "bg-muted/50"
            }`}
            data-testid={`button-stock-${score.symbol}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-5">
                  #{index + 1}
                </span>
                <div>
                  <div className="text-sm font-semibold">{score.symbol}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[120px]">{score.name}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {getSignalBadge(score.signal)}
                <span className={`text-lg font-bold ${getScoreColor(score.totalScore)}`}>
                  {score.totalScore}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">AI Score</span>
                <span className="font-medium">{score.totalScore}/100</span>
              </div>
              <Progress value={score.totalScore} className="h-1.5" />
            </div>

            <div className="grid grid-cols-4 gap-1 mt-2">
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">RSI</div>
                <div className="text-xs font-semibold">{score.rsiScore}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">SRTV</div>
                <div className="text-xs font-semibold">{score.srtvScore}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">Breakout</div>
                <div className="text-xs font-semibold">{score.breakoutScore}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">Volume</div>
                <div className="text-xs font-semibold">{score.volumeScore}</div>
              </div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
