import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, Eye, Star } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WatchlistItem } from "@shared/schema";

interface WatchlistManagerProps {
  items: WatchlistItem[] | undefined;
  isLoading: boolean;
  onSelectStock: (symbol: string) => void;
  selectedSymbol?: string;
}

const POPULAR_STOCKS = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries" },
  { symbol: "TCS.NS", name: "Tata Consultancy" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  { symbol: "INFY.NS", name: "Infosys" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
];

export function WatchlistManager({ items, isLoading, onSelectStock, selectedSymbol }: WatchlistManagerProps) {
  const [newSymbol, setNewSymbol] = useState("");
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: async (data: { symbol: string; name: string }) => {
      const res = await apiRequest("POST", "/api/watchlist", { ...data, exchange: "NSE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scores"] });
      setNewSymbol("");
      toast({ title: "Stock added to watchlist" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add stock", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/watchlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scores"] });
      toast({ title: "Stock removed from watchlist" });
    },
  });

  const handleAddSymbol = () => {
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    const formatted = symbol.includes(".") ? symbol : `${symbol}.NS`;
    addMutation.mutate({ symbol: formatted, name: formatted });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Watchlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium text-muted-foreground">Watchlist</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Enter symbol (e.g., RELIANCE)"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
            className="text-sm"
            data-testid="input-add-symbol"
          />
          <Button
            size="default"
            onClick={handleAddSymbol}
            disabled={addMutation.isPending || !newSymbol.trim()}
            data-testid="button-add-symbol"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {(!items || items.length === 0) && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Quick add popular stocks:</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_STOCKS.map((stock) => (
                <Button
                  key={stock.symbol}
                  variant="outline"
                  size="sm"
                  onClick={() => addMutation.mutate(stock)}
                  disabled={addMutation.isPending}
                  data-testid={`button-quick-add-${stock.symbol}`}
                >
                  {stock.symbol.replace(".NS", "")}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          {items?.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-2 rounded-md p-2 transition-colors cursor-pointer hover-elevate ${
                selectedSymbol === item.symbol ? "bg-primary/10" : ""
              }`}
              onClick={() => onSelectStock(item.symbol)}
              data-testid={`watchlist-item-${item.symbol}`}
            >
              <div className="flex items-center gap-2">
                <Eye className="h-3 w-3 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{item.symbol.replace(".NS", "")}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[140px]">{item.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[10px]">{item.exchange}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 no-default-hover-elevate no-default-active-elevate"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMutation.mutate(item.id);
                  }}
                  data-testid={`button-remove-${item.symbol}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
