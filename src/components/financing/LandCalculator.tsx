import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Calculator, MapPin, TrendingUp } from "lucide-react";

interface LandCalculatorProps {
  onCalculationComplete?: (data: LandCalculation) => void;
}

export interface LandCalculation {
  type: "land";
  landPrice: number;
  landSize: number;
  pricePerSqm: number;
  equityAmount: number;
  equityPercent: number;
  loanAmount: number;
  interestRate: number;
  monthlyPayment: number;
  annualCosts: number;
  affordableIncome: number;
}

const LandCalculator = ({ onCalculationComplete }: LandCalculatorProps) => {
  const [landPrice, setLandPrice] = useState(500000);
  const [landSize, setLandSize] = useState(500);
  const [equityPercent, setEquityPercent] = useState(30);
  const [interestRate, setInterestRate] = useState(2.0);
  const [annualIncome, setAnnualIncome] = useState(150000);

  // Swiss-specific land financing calculations
  const calculation = useMemo((): LandCalculation => {
    const pricePerSqm = landSize > 0 ? landPrice / landSize : 0;
    const equityAmount = (landPrice * equityPercent) / 100;
    const loanAmount = landPrice - equityAmount;
    
    // Land financing typically requires higher equity (30%+)
    // Using 5% imputed interest for affordability
    const imputedInterestRate = 5;
    const imputedInterest = (loanAmount * imputedInterestRate) / 100;
    
    // No amortization typically required for land during building phase
    // But banks may require interest reserve
    const interestReserve = loanAmount * 0.005;
    
    // Annual costs with imputed interest
    const annualCostsImputed = imputedInterest + interestReserve;
    
    // Actual annual costs
    const actualInterest = (loanAmount * interestRate) / 100;
    const annualCosts = actualInterest + interestReserve;
    
    const monthlyPayment = annualCosts / 12;
    const affordableIncome = annualCostsImputed / 0.33;

    return {
      type: "land",
      landPrice,
      landSize,
      pricePerSqm,
      equityAmount,
      equityPercent,
      loanAmount,
      interestRate,
      monthlyPayment,
      annualCosts,
      affordableIncome,
    };
  }, [landPrice, landSize, equityPercent, interestRate, annualIncome]);

  const isAffordable = annualIncome >= calculation.affordableIncome;
  const hasMinEquity = equityPercent >= 30;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          <CardTitle className="font-display">Baulandrechner</CardTitle>
        </div>
        <CardDescription>
          Berechnen Sie die Finanzierung für Ihr Bauland. Mindestens 30% Eigenkapital erforderlich.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Land Price */}
        <div className="space-y-2">
          <Label htmlFor="landPrice">Landpreis</Label>
          <div className="flex items-center gap-4">
            <Input
              id="landPrice"
              type="number"
              value={landPrice}
              onChange={(e) => setLandPrice(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-muted-foreground">CHF</span>
          </div>
          <Slider
            value={[landPrice]}
            onValueChange={([value]) => setLandPrice(value)}
            min={50000}
            max={3000000}
            step={25000}
            className="mt-2"
          />
        </div>

        {/* Land Size */}
        <div className="space-y-2">
          <Label htmlFor="landSize">Grundstücksgrösse</Label>
          <div className="flex items-center gap-4">
            <Input
              id="landSize"
              type="number"
              value={landSize}
              onChange={(e) => setLandSize(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-muted-foreground">m²</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Preis pro m²: {formatCurrency(calculation.pricePerSqm)}
          </p>
        </div>

        {/* Equity */}
        <div className="space-y-2">
          <Label>Eigenkapital: {equityPercent}% ({formatCurrency(calculation.equityAmount)})</Label>
          <Slider
            value={[equityPercent]}
            onValueChange={([value]) => setEquityPercent(value)}
            min={10}
            max={60}
            step={1}
          />
          {!hasMinEquity && (
            <p className="text-sm text-destructive">
              Für Bauland wird typischerweise 30% Eigenkapital benötigt
            </p>
          )}
        </div>

        {/* Interest Rate */}
        <div className="space-y-2">
          <Label>Zinssatz: {interestRate}%</Label>
          <Slider
            value={[interestRate * 10]}
            onValueChange={([value]) => setInterestRate(value / 10)}
            min={10}
            max={50}
            step={1}
          />
        </div>

        {/* Annual Income */}
        <div className="space-y-2">
          <Label htmlFor="income">Jährliches Bruttoeinkommen</Label>
          <div className="flex items-center gap-4">
            <Input
              id="income"
              type="number"
              value={annualIncome}
              onChange={(e) => setAnnualIncome(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-muted-foreground">CHF</span>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Kreditbetrag</p>
            <p className="text-2xl font-bold">{formatCurrency(calculation.loanAmount)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Monatliche Kosten</p>
            <p className="text-2xl font-bold">{formatCurrency(calculation.monthlyPayment)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Jährliche Kosten</p>
            <p className="text-lg font-semibold">{formatCurrency(calculation.annualCosts)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Grundstücksfläche</p>
            <p className="text-lg font-semibold">{landSize} m²</p>
          </div>
        </div>

        {/* Affordability Check */}
        <div className={`p-4 rounded-lg ${isAffordable ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-5 h-5 ${isAffordable ? "text-green-600" : "text-red-600"}`} />
            <span className={`font-semibold ${isAffordable ? "text-green-700" : "text-red-700"}`}>
              Tragbarkeitsrechnung
            </span>
          </div>
          <p className="text-sm">
            Benötigtes Einkommen: <strong>{formatCurrency(calculation.affordableIncome)}</strong>
          </p>
          <p className={`text-sm mt-1 ${isAffordable ? "text-green-600" : "text-red-600"}`}>
            {isAffordable
              ? "✓ Die Finanzierung ist für Sie tragbar"
              : `✗ Ihr Einkommen sollte mindestens ${formatCurrency(calculation.affordableIncome)} betragen`}
          </p>
        </div>

        {onCalculationComplete && (
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => onCalculationComplete(calculation)}
            disabled={!hasMinEquity}
          >
            <Calculator className="w-4 h-4 mr-2" />
            Finanzierungsanfrage starten
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default LandCalculator;
