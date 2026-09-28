import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, Hammer, Calculator, FileText, MessageSquare, Clock, CheckCircle } from "lucide-react";
import MortgageCalculator, { MortgageCalculation } from "@/components/financing/MortgageCalculator";
import LandCalculator, { LandCalculation } from "@/components/financing/LandCalculator";
import ConstructionCalculator, { ConstructionCalculation } from "@/components/financing/ConstructionCalculator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type CalculationType = MortgageCalculation | LandCalculation | ConstructionCalculation;

const Financing = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("calculators");

  // Fetch user's financing requests
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["financing-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleCalculationComplete = async (calculation: CalculationType) => {
    if (!user) {
      toast.error("Bitte melden Sie sich an, um eine Anfrage zu stellen");
      navigate("/auth");
      return;
    }

    if (profile?.kyc_status !== "verified") {
      toast.error("Bitte vervollständigen Sie zuerst Ihre KYC-Verifizierung");
      navigate("/off-market/verification");
      return;
    }

    // Create draft financing request
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

    if (error) {
      console.error("Error creating request:", error);
      toast.error("Fehler beim Erstellen der Anfrage");
      return;
    }

    toast.success("Finanzierungsanfrage erstellt");
    navigate(`/off-market/financing/${data.id}`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Entwurf", variant: "outline" },
      submitted: { label: "Eingereicht", variant: "secondary" },
      in_review: { label: "In Bearbeitung", variant: "default" },
      approved: { label: "Genehmigt", variant: "default" },
      rejected: { label: "Abgelehnt", variant: "destructive" },
      completed: { label: "Abgeschlossen", variant: "default" },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "mortgage":
        return <Home className="w-4 h-4" />;
      case "land":
        return <MapPin className="w-4 h-4" />;
      case "construction":
        return <Hammer className="w-4 h-4" />;
      default:
        return <Calculator className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "mortgage":
        return "Hypothek";
      case "land":
        return "Bauland";
      case "construction":
        return "Baufinanzierung";
      default:
        return type;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <OffMarketLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Finanzierung</h1>
          <p className="text-muted-foreground mt-1">
            Berechnen Sie Ihre Finanzierungsoptionen und stellen Sie eine Anfrage
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="calculators" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Rechner
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Meine Anfragen
              {requests && requests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{requests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculators">
            <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold mb-2">Finanzierungsrechner für die Schweiz</h3>
              <p className="text-sm text-muted-foreground">
                Unsere Rechner berücksichtigen Schweizer Marktbedingungen: 5% kalkulatorischer Zins für die 
                Tragbarkeitsrechnung, 20% Mindest-Eigenkapital (davon 10% nicht aus der 2. Säule), sowie 
                Amortisations- und Unterhaltskosten.
              </p>
            </div>

            <Tabs defaultValue="mortgage" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="mortgage" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Hypothek
                </TabsTrigger>
                <TabsTrigger value="land" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Bauland
                </TabsTrigger>
                <TabsTrigger value="construction" className="flex items-center gap-2">
                  <Hammer className="w-4 h-4" />
                  Baufinanzierung
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
          </TabsContent>

          <TabsContent value="requests">
            {!user ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Anmeldung erforderlich</h3>
                  <p className="text-muted-foreground mb-4">
                    Melden Sie sich an, um Ihre Finanzierungsanfragen zu sehen
                  </p>
                  <Button onClick={() => navigate("/auth")}>Anmelden</Button>
                </CardContent>
              </Card>
            ) : requestsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : requests && requests.length > 0 ? (
              <div className="space-y-4">
                {requests.map((request) => (
                  <Card 
                    key={request.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/off-market/financing/${request.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {getTypeIcon(request.financing_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{request.request_number || "Entwurf"}</span>
                              {getStatusBadge(request.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getTypeLabel(request.financing_type)} • {formatCurrency(request.loan_amount)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(request.created_at).toLocaleDateString("de-CH")}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calculator className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Keine Anfragen</h3>
                  <p className="text-muted-foreground mb-4">
                    Nutzen Sie unsere Rechner, um Ihre erste Finanzierungsanfrage zu erstellen
                  </p>
                  <Button onClick={() => setActiveTab("calculators")}>
                    Zum Rechner
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </OffMarketLayout>
  );
};

export default Financing;
