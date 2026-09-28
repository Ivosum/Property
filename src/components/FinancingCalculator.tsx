import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Home, MapPin, Hammer, Calculator, ArrowRight, User } from "lucide-react";
import MortgageCalculator, { MortgageCalculation } from "@/components/financing/MortgageCalculator";
import LandCalculator, { LandCalculation } from "@/components/financing/LandCalculator";
import ConstructionCalculator, { ConstructionCalculation } from "@/components/financing/ConstructionCalculator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CalculationType = MortgageCalculation | LandCalculation | ConstructionCalculation;

const FinancingCalculator = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCalculationComplete = async (calculation: CalculationType) => {
    // If user is not logged in, redirect to auth with a return URL
    if (!user) {
      toast.info("Bitte melden Sie sich an, um eine Finanzierungsanfrage zu stellen");
      navigate("/auth");
      return;
    }

    // If KYC is not verified, redirect to verification
    if (profile?.kyc_status !== "verified") {
      toast.info("Bitte vervollständigen Sie zuerst Ihre KYC-Verifizierung");
      navigate("/off-market/verification");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create financing request
      const financingType = calculation.type === "mortgage" ? "mortgage" 
        : calculation.type === "land" ? "land" 
        : "construction";

      const { data, error } = await supabase
        .from("financing_requests")
        .insert([{
          user_id: user.id,
          financing_type: financingType as "mortgage" | "land" | "construction",
          purchase_price: "purchasePrice" in calculation ? calculation.purchasePrice 
            : "landPrice" in calculation ? calculation.landPrice 
            : (calculation as ConstructionCalculation).totalProjectCost,
          equity_amount: calculation.equityAmount,
          loan_amount: calculation.loanAmount,
          interest_rate: calculation.interestRate,
          monthly_payment: calculation.monthlyPayment,
          calculation_data: JSON.parse(JSON.stringify(calculation)),
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Finanzierungsanfrage erstellt!");
      navigate(`/off-market/financing/${data.id}`);
    } catch (error) {
      console.error("Error creating request:", error);
      toast.error("Fehler beim Erstellen der Anfrage");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="financing-calculator" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Finanzierungsrechner</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Berechnen Sie Ihre Finanzierung
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Unsere Rechner berücksichtigen Schweizer Marktbedingungen: 5% kalkulatorischer Zins für die 
            Tragbarkeitsrechnung, 20% Mindest-Eigenkapital sowie Amortisations- und Unterhaltskosten.
          </p>
        </div>

        {/* CTA for non-logged in users */}
        {!user && (
          <div className="max-w-2xl mx-auto mb-8 p-6 bg-primary/5 rounded-xl border border-primary/20 text-center">
            <User className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-display text-xl font-semibold mb-2">
              Registrieren Sie sich für eine persönliche Beratung
            </h3>
            <p className="text-muted-foreground mb-4">
              Erstellen Sie ein Konto, um eine Finanzierungsanfrage direkt an unser Team zu senden 
              und eine individuelle Beratung zu erhalten.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/auth")} size="lg">
                <User className="w-4 h-4 mr-2" />
                Jetzt registrieren
              </Button>
              <Button variant="outline" onClick={() => navigate("/auth")} size="lg">
                Bereits registriert? Anmelden
              </Button>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="mortgage" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="mortgage" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Hypothek</span>
              </TabsTrigger>
              <TabsTrigger value="land" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Bauland</span>
              </TabsTrigger>
              <TabsTrigger value="construction" className="flex items-center gap-2">
                <Hammer className="w-4 h-4" />
                <span className="hidden sm:inline">Baufinanzierung</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mortgage">
              <MortgageCalculator onCalculationComplete={handleCalculationComplete} />
            </TabsContent>
            <TabsContent value="land">
              <LandCalculator onCalculationComplete={handleCalculationComplete} />
            </TabsContent>
            <TabsContent value="construction">
              <ConstructionCalculator onCalculationComplete={handleCalculationComplete} />
            </TabsContent>
          </Tabs>

          {/* Bottom CTA */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">
              Haben Sie Fragen? Unser Team steht Ihnen gerne zur Verfügung.
            </p>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => user ? navigate("/off-market/financing") : navigate("/auth")}
            >
              {user ? "Zum Finanzierungsbereich" : "Registrieren & Beratung anfordern"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinancingCalculator;
