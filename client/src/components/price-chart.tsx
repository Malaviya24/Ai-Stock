import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, AreaChart, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface PriceChartProps {
  data: Array<{ date: string; close: number; high: number; low: number; volume: number }> | undefined;
  dma124: number | undefined;
  symbol: string | undefined;
  isLoading: boolean;
}

export function PriceChart({ data, dma124, symbol, isLoading }: PriceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0 || !symbol) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center space-y-2">
              <AreaChart className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Select a stock to view price history</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.slice(-90).map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
  }));

  const minPrice = Math.min(...chartData.map((d) => d.low)) * 0.98;
  const maxPrice = Math.max(...chartData.map((d) => d.high)) * 1.02;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {symbol?.replace(".NS", "")} - 90 Day Price History
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]" data-testid="chart-price-history">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => val.toFixed(0)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value: number) => [value.toFixed(2), "Price"]}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke="hsl(217, 91%, 60%)"
                fill="url(#priceGradient)"
                strokeWidth={2}
              />
              {dma124 && (
                <ReferenceLine
                  y={dma124}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: `124 DMA: ${dma124.toFixed(0)}`,
                    position: "insideTopRight",
                    style: { fontSize: 10, fill: "hsl(var(--destructive))" },
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
