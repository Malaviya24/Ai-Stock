import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Save } from "lucide-react";

interface CapitalSettingsProps {
  totalCapital: number;
  onCapitalChange: (capital: number) => void;
}

export function CapitalSettings({ totalCapital, onCapitalChange }: CapitalSettingsProps) {
  const [capital, setCapital] = useState(totalCapital.toString());

  useEffect(() => {
    setCapital(totalCapital.toString());
  }, [totalCapital]);

  const handleSave = () => {
    const num = parseFloat(capital);
    if (!isNaN(num) && num > 0) {
      onCapitalChange(num);
      localStorage.setItem("totalCapital", num.toString());
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium text-muted-foreground">Capital Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="capital-input" className="text-xs text-muted-foreground">Total Capital (INR)</Label>
          <div className="flex gap-2">
            <Input
              id="capital-input"
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Enter total capital"
              className="text-sm"
              data-testid="input-capital"
            />
            <Button onClick={handleSave} data-testid="button-save-capital">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[100000, 500000, 1000000, 5000000].map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              onClick={() => {
                setCapital(amount.toString());
                onCapitalChange(amount);
                localStorage.setItem("totalCapital", amount.toString());
              }}
              data-testid={`button-preset-${amount}`}
            >
              {(amount / 100000).toFixed(0)}L
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
