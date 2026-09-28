import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Calculator, Home, TrendingUp, Wallet } from "lucide-react";

interface MortgageCalculatorProps {
  onCalculationComplete?: (data: MortgageCalculation) => void;
}

export interface MortgageCalculation {
  type: "mortgage";
  purchasePrice: number;
  equityAmount: number;
  equityPercent: number;
  loanAmount: number;
  interestRate: number;
  monthlyPayment: number;
  annualCosts: number;
  affordableIncome: number;
  loanToValue: number;
}

const MortgageCalculator = ({ onCalculationComplete }: MortgageCalculatorProps) => {
  const [purchasePrice, setPurchasePrice] = useState(1000000);
  const [equityPercent, setEquityPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(1.5);
  const [annualIncome, setAnnualIncome] = useState(150000);

  // Swiss-specific calculations
  const calculation = useMemo((): MortgageCalculation => {
    const equityAmount = (purchasePrice * equityPercent) / 100;
    const loanAmount = purchasePrice - equityAmount;
    
    // Swiss banks use 5% imputed interest for affordability calculation
    const imputedInterestRate = 5;
    const imputedInterest = (loanAmount * imputedInterestRate) / 100;
    
    // Annual amortization (typically 1% of loan)
    const annualAmortization = loanAmount * 0.01;
    
    // Maintenance costs (typically 1% of purchase price)
    const maintenanceCosts = purchasePrice * 0.01;
    
    // Total annual costs with imputed interest
    const annualCostsImputed = imputedInterest + annualAmortization + maintenanceCosts;
    
    // Actual annual costs with real interest
    const actualInterest = (loanAmount * interestRate) / 100;
    const annualCosts = actualInterest + annualAmortization + maintenanceCosts;
    
    // Monthly payment (real)
    const monthlyPayment = annualCosts / 12;
    
    // Affordable income (costs should not exceed 33% of gross income)
    const affordableIncome = annualCostsImputed / 0.33;
    
    // Loan to Value ratio
    const loanToValue = (loanAmount / purchasePrice) * 100;

    return {
      type: "mortgage",
      purchasePrice,
      equityAmount,
      equityPercent,
      loanAmount,
      interestRate,
      monthlyPayment,
      annualCosts,
      affordableIncome,
      loanToValue,
    };
  }, [purchasePrice, equityPercent, interestRate, annualIncome]);

  const isAffordable = annualIncome >= calculation.affordableIncome;
  const hasMinEquity = equityPercent >= 20;

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
          <Home className="w-6 h-6 text-primary" />
          <CardTitle className="font-display">Hypothekarrechner</CardTitle>
        </div>
        <CardDescription>
          Berechnen Sie Ihre Hypothek nach Schweizer Standards. Mindestens 20% Eigenkapital erforderlich.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Purchase Price */}
        <div className="space-y-2">
          <Label htmlFor="purchasePrice">Kaufpreis</Label>
          <div className="flex items-center gap-4">
            <Input
              id="purchasePrice"
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-muted-foreground">CHF</span>
          </div>
          <Slider
            value={[purchasePrice]}
            onValueChange={([value]) => setPurchasePrice(value)}
            min={100000}
            max={5000000}
            step={50000}
            className="mt-2"
          />
        </div>

        {/* Equity */}
        <div className="space-y-2">
          <Label>Eigenkapital: {equityPercent}% ({formatCurrency(calculation.equityAmount)})</Label>
          <Slider
            value={[equityPercent]}
            onValueChange={([value]) => setEquityPercent(value)}
            min={5}
            max={50}
            step={1}
          />
          {!hasMinEquity && (
            <p className="text-sm text-destructive">
              Mindestens 20% Eigenkapital erforderlich (10% davon nicht aus der 2. Säule)
            </p>
          )}
        </div>

        {/* Interest Rate */}
        <div className="space-y-2">
          <Label>Zinssatz: {interestRate}%</Label>
          <Slider
            value={[interestRate * 10]}
            onValueChange={([value]) => setInterestRate(value / 10)}
            min={5}
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
            <p className="text-sm text-muted-foreground">Hypothekarbetrag</p>
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
            <p className="text-sm text-muted-foreground">Belehnung (LTV)</p>
            <p className="text-lg font-semibold">{calculation.loanToValue.toFixed(0)}%</p>
          </div>
        </div>

        {/* Affordability Check */}
        <div className={`p-4 rounded-lg ${isAffordable ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-5 h-5 ${isAffordable ? "text-green-600" : "text-red-600"}`} />
            <span className={`font-semibold ${isAffordable ? "text-green-700" : "text-red-700"}`}>
              Tragbarkeitsrechnung (5% kalkulatorischer Zins)
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

export default MortgageCalculator;
