import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Shield, Wallet, PieChart, AlertTriangle } from "lucide-react";
import type { CapitalSuggestion } from "@shared/schema";

interface CapitalSuggestionCardProps {
  data: CapitalSuggestion | undefined;
  isLoading: boolean;
}

function formatCurrency(num: number): string {
  return num.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export function CapitalSuggestionCard({ data, isLoading }: CapitalSuggestionCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Capital Allocation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Capital Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Set your total capital to see allocation suggestions.</p>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW": return "text-emerald-500 dark:text-emerald-400";
      case "MEDIUM": return "text-amber-500 dark:text-amber-400";
      case "HIGH": return "text-orange-500 dark:text-orange-400";
      case "CRITICAL": return "text-red-500 dark:text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "LOW": return <Badge variant="default" className="bg-emerald-600 dark:bg-emerald-500 text-white">Low Risk</Badge>;
      case "MEDIUM": return <Badge variant="secondary">Medium Risk</Badge>;
      case "HIGH": return <Badge variant="destructive">High Risk</Badge>;
      case "CRITICAL": return <Badge variant="destructive">Critical</Badge>;
      default: return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const exposurePercent = (data.currentExposure / data.totalCapital) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Capital Allocation</CardTitle>
          {getRiskBadge(data.riskLevel)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="h-3 w-3" />
              Total Capital
            </div>
            <div className="text-lg font-semibold" data-testid="text-total-capital">
              {formatCurrency(data.totalCapital)}
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <PieChart className="h-3 w-3" />
              Per Lot Size
            </div>
            <div className="text-lg font-semibold" data-testid="text-lot-size">
              {formatCurrency(data.perLotSize)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Risk Exposure</span>
            <span className={`font-semibold ${getRiskColor(data.riskLevel)}`}>
              {exposurePercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={Math.min(exposurePercent, 100)} className="h-2" />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Used: {formatCurrency(data.currentExposure)}</span>
            <span>Max: {formatCurrency(data.maxExposure)}</span>
          </div>
        </div>

        {exposurePercent > 60 && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-xs text-destructive">
              <span className="font-semibold">Warning:</span> Exposure exceeds 60%. Consider reducing positions to manage risk.
            </div>
          </div>
        )}

        <div className="rounded-md bg-muted/50 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            Suggested New Positions
          </div>
          <div className="text-lg font-semibold" data-testid="text-suggested-positions">
            {data.suggestedPositions}
          </div>
          <div className="text-xs text-muted-foreground">
            Based on remaining capital and risk profile
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
