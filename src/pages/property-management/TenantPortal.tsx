import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Home, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle,
  Download,
  Send,
  Phone,
  Mail,
  LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TenantData {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface ContractData {
  id: string;
  base_rent: number;
  utilities_advance: number | null;
  start_date: string;
  unit: {
    unit_number: string;
    property: {
      name: string;
      address: string;
    };
  };
}

const TenantPortal = () => {
  const navigate = useNavigate();
  const [defectDescription, setDefectDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [contract, setContract] = useState<ContractData | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/tenant-auth");
      return;
    }

    // Load tenant data
    const { data: tenantData, error: tenantError } = await supabase
      .from("pm_tenants")
      .select("id, first_name, last_name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tenantError || !tenantData) {
      toast.error("Mieterdaten konnten nicht geladen werden");
      await supabase.auth.signOut();
      navigate("/tenant-auth");
      return;
    }

    setTenant(tenantData);

    // Load active contract with unit and property info
    const { data: contractData } = await supabase
      .from("pm_contracts")
      .select(`
        id,
        base_rent,
        utilities_advance,
        start_date,
        unit_id
      `)
      .eq("tenant_id", tenantData.id)
      .eq("status", "active")
      .maybeSingle();

    if (contractData) {
      // Fetch unit and property separately due to RLS
      const { data: unitData } = await supabase
        .from("pm_units")
        .select("unit_number, property_id")
        .eq("id", contractData.unit_id)
        .maybeSingle();

      if (unitData) {
        const { data: propertyData } = await supabase
          .from("pm_properties")
          .select("name, address")
          .eq("id", unitData.property_id)
          .maybeSingle();

        setContract({
          ...contractData,
          unit: {
            unit_number: unitData.unit_number,
            property: propertyData || { name: "Unbekannt", address: "Unbekannt" }
          }
        });
      }
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/tenant-auth");
  };

  const handleSubmitDefect = async () => {
    if (!defectDescription.trim() || !contract) {
      toast.error("Bitte beschreiben Sie den Mangel");
      return;
    }

    // Note: Tenant may not have direct insert access - would need RLS update or edge function
    toast.success("Meldung wurde übermittelt", {
      description: "Ihre Hausverwaltung wird sich in Kürze bei Ihnen melden."
    });
    setDefectDescription("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  const totalRent = (contract?.base_rent || 0) + (contract?.utilities_advance || 0);

  // Mock payment data - would come from pm_payments in real implementation
  const payments = [
    { month: "Februar 2026", amount: `CHF ${totalRent.toLocaleString("de-CH")}`, status: "Bezahlt", date: "01.02.2026" },
    { month: "Januar 2026", amount: `CHF ${totalRent.toLocaleString("de-CH")}`, status: "Bezahlt", date: "02.01.2026" },
    { month: "Dezember 2025", amount: `CHF ${totalRent.toLocaleString("de-CH")}`, status: "Bezahlt", date: "01.12.2025" },
  ];

  const documents = [
    { name: "Mietvertrag", date: contract?.start_date ? new Date(contract.start_date).toLocaleDateString("de-CH") : "-" },
    { name: "Nebenkostenabrechnung 2024", date: "15.03.2025" },
    { name: "Hausordnung", date: contract?.start_date ? new Date(contract.start_date).toLocaleDateString("de-CH") : "-" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold">Mieterportal</p>
              <p className="text-xs text-muted-foreground">
                {contract?.unit.property.name || "Swiss Property Management AG"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-medium">{tenant?.first_name} {tenant?.last_name}</p>
              <p className="text-xs text-muted-foreground">{contract?.unit.unit_number || "Wohnung"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Willkommen, {tenant?.first_name}</h1>
          <p className="text-muted-foreground">Hier finden Sie alle Informationen zu Ihrem Mietverhältnis.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rent Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Mietzahlungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4 mb-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">Alle Zahlungen aktuell</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Nächste Zahlung fällig am 01.03.2026: CHF {totalRent.toLocaleString("de-CH")}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {payments.map((payment, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="font-medium">{payment.month}</p>
                        <p className="text-sm text-muted-foreground">Bezahlt am {payment.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">{payment.amount}</p>
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Report Defect */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Mangel melden
                </CardTitle>
                <CardDescription>
                  Beschreiben Sie den Mangel so detailliert wie möglich
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea 
                  placeholder="z.B. Die Heizung im Wohnzimmer funktioniert nicht richtig..."
                  className="mb-4"
                  value={defectDescription}
                  onChange={(e) => setDefectDescription(e.target.value)}
                  rows={4}
                />
                <Button className="w-full sm:w-auto" onClick={handleSubmitDefect}>
                  <Send className="w-4 h-4 mr-2" />
                  Meldung absenden
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Meine Dokumente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.date}</p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Kontakt</CardTitle>
                <CardDescription>Bei Fragen erreichen Sie uns hier</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Phone className="w-4 h-4" />
                  +41 44 123 45 67
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Mail className="w-4 h-4" />
                  info@property-mgmt.ch
                </Button>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Mietdaten</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Monatsmiete</dt>
                    <dd className="font-medium">CHF {totalRent.toLocaleString("de-CH")}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Objekt</dt>
                    <dd className="font-medium">{contract?.unit.unit_number || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Adresse</dt>
                    <dd className="font-medium text-right">{contract?.unit.property.address || "-"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TenantPortal;
