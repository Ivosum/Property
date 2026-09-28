import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Calculator, Building2, TrendingUp, Hammer } from "lucide-react";

interface ConstructionCalculatorProps {
  onCalculationComplete?: (data: ConstructionCalculation) => void;
}

export interface ConstructionCalculation {
  type: "construction";
  landCost: number;
  constructionCost: number;
  additionalCosts: number;
  totalProjectCost: number;
  equityAmount: number;
  equityPercent: number;
  loanAmount: number;
  interestRate: number;
  monthlyPayment: number;
  annualCosts: number;
  affordableIncome: number;
  costPerSqm: number;
}

const ConstructionCalculator = ({ onCalculationComplete }: ConstructionCalculatorProps) => {
  const [landCost, setLandCost] = useState(400000);
  const [constructionCost, setConstructionCost] = useState(600000);
  const [livingArea, setLivingArea] = useState(180);
  const [equityPercent, setEquityPercent] = useState(25);
  const [interestRate, setInterestRate] = useState(1.5);
  const [annualIncome, setAnnualIncome] = useState(180000);

  // Swiss-specific construction financing calculations
  const calculation = useMemo((): ConstructionCalculation => {
    // Additional costs typically 10-15% of construction cost
    const additionalCosts = constructionCost * 0.12;
    const totalProjectCost = landCost + constructionCost + additionalCosts;
    const costPerSqm = livingArea > 0 ? constructionCost / livingArea : 0;
    
    const equityAmount = (totalProjectCost * equityPercent) / 100;
    const loanAmount = totalProjectCost - equityAmount;
    
    // Swiss banks use 5% imputed interest
    const imputedInterestRate = 5;
    const imputedInterest = (loanAmount * imputedInterestRate) / 100;
    
    // Amortization (1% of loan per year to reach 65% LTV within 15 years)
    const annualAmortization = loanAmount * 0.01;
    
    // Maintenance costs (1% of property value)
    const maintenanceCosts = totalProjectCost * 0.01;
    
    // Total annual costs with imputed interest
    const annualCostsImputed = imputedInterest + annualAmortization + maintenanceCosts;
    
    // Actual annual costs
    const actualInterest = (loanAmount * interestRate) / 100;
    const annualCosts = actualInterest + annualAmortization + maintenanceCosts;
    
    const monthlyPayment = annualCosts / 12;
    const affordableIncome = annualCostsImputed / 0.33;

    return {
      type: "construction",
      landCost,
      constructionCost,
      additionalCosts,
      totalProjectCost,
      equityAmount,
      equityPercent,
      loanAmount,
      interestRate,
      monthlyPayment,
      annualCosts,
      affordableIncome,
      costPerSqm,
    };
  }, [landCost, constructionCost, livingArea, equityPercent, interestRate, annualIncome]);

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
          <Hammer className="w-6 h-6 text-primary" />
          <CardTitle className="font-display">Baufinanzierungsrechner</CardTitle>
        </div>
        <CardDescription>
          Berechnen Sie die Gesamtkosten Ihres Bauprojekts inkl. Nebenkosten nach Schweizer Standards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Land Cost */}
        <div className="space-y-2">
          <Label htmlFor="landCost">Grundstückskosten</Label>
          <div className="flex items-center gap-4">
            <Input
              id="landCost"
              type="number"
              value={landCost}
              onChange={(e) => setLandCost(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-muted-foreground">CHF</span>
          </div>
          <Slider
            value={[landCost]}
            onValueChange={([value]) => setLandCost(value)}
            min={0}
            max={2000000}
            step={25000}
            className="mt-2"
          />
        </div>

        {/* Construction Cost */}
        <div className="space-y-2">
          <Label htmlFor="constructionCost">Baukosten</Label>
          <div className="flex items-center gap-4">
            <Input
              id="constructionCost"
              type="number"
              value={constructionCost}
              onChange={(e) => setConstructionCost(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-muted-foreground">CHF</span>
          </div>
          <Slider
            value={[constructionCost]}
            onValueChange={([value]) => setConstructionCost(value)}
            min={100000}
            max={3000000}
            step={25000}
            className="mt-2"
          />
        </div>

        {/* Living Area */}
        <div className="space-y-2">
          <Label htmlFor="livingArea">Wohnfläche</Label>
          <div className="flex items-center gap-4">
            <Input
              id="livingArea"
              type="number"
              value={livingArea}
              onChange={(e) => setLivingArea(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-muted-foreground">m²</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Baukosten pro m²: {formatCurrency(calculation.costPerSqm)}
          </p>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Grundstück</span>
            <span>{formatCurrency(landCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Baukosten</span>
            <span>{formatCurrency(constructionCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Nebenkosten (ca. 12%)</span>
            <span>{formatCurrency(calculation.additionalCosts)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-2">
            <span>Gesamtkosten</span>
            <span>{formatCurrency(calculation.totalProjectCost)}</span>
          </div>
        </div>

        {/* Equity */}
        <div className="space-y-2">
          <Label>Eigenkapital: {equityPercent}% ({formatCurrency(calculation.equityAmount)})</Label>
          <Slider
            value={[equityPercent]}
            onValueChange={([value]) => setEquityPercent(value)}
            min={10}
            max={50}
            step={1}
          />
          {!hasMinEquity && (
            <p className="text-sm text-destructive">
              Mindestens 20% Eigenkapital erforderlich
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
            <p className="text-sm text-muted-foreground">Wohnfläche</p>
            <p className="text-lg font-semibold">{livingArea} m²</p>
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

export default ConstructionCalculator;
