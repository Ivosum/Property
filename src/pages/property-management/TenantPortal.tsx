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
  LogOut,
  Wrench
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TenantProfileSection from "@/components/property-management/TenantProfileSection";

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
  unit_id: string;
  unit: {
    unit_number: string;
    property: {
      name: string;
      address: string;
      caretaker_name?: string | null;
      caretaker_phone?: string | null;
      caretaker_email?: string | null;
    };
  };
}

interface PaymentData {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
}

interface TenantDocData {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
}

const TenantPortal = () => {
  const navigate = useNavigate();
  const [defectDescription, setDefectDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [tenantDocs, setTenantDocs] = useState<TenantDocData[]>([]);
  const [org, setOrg] = useState<{ org_name: string; contact_email: string | null; contact_phone: string | null } | null>(null);

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

    // Load payments and documents for this tenant
    const [{ data: paymentData }, { data: docData }] = await Promise.all([
      supabase
        .from("pm_payments")
        .select("id, amount, due_date, paid_date, status")
        .eq("tenant_id", tenantData.id)
        .order("due_date", { ascending: false }),
      supabase
        .from("pm_documents")
        .select("id, name, file_url, created_at")
        .eq("tenant_id", tenantData.id)
        .order("created_at", { ascending: false }),
    ]);
    setPayments((paymentData ?? []) as PaymentData[]);
    setTenantDocs((docData ?? []) as TenantDocData[]);

    // Verwaltungs-Kontaktdaten laden (für Kontakt-Karte & Header)
    const { data: orgData } = await supabase
      .from("pm_org_settings")
      .select("org_name, contact_email, contact_phone")
      .limit(1)
      .maybeSingle();
    if (orgData) setOrg(orgData as typeof org);

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
          .select("name, address, caretaker_name, caretaker_phone, caretaker_email")
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

  // Öffnet ein Mieter-Dokument: direkte URL oder signierte URL aus 'pm-documents'
  const openTenantDoc = async (fileUrl: string) => {
    if (/^https?:\/\//i.test(fileUrl)) {
      window.open(fileUrl, "_blank", "noopener");
      return;
    }
    const { data } = await supabase.storage.from("pm-documents").createSignedUrl(fileUrl, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };

  const handleSubmitDefect = async () => {
    if (!defectDescription.trim() || !contract) {
      toast.error("Bitte beschreiben Sie den Mangel");
      return;
    }

    const title = defectDescription.trim().slice(0, 80);
    const { error } = await supabase.from("pm_defects").insert({
      unit_id: contract.unit_id,
      tenant_id: tenant?.id ?? null,
      title,
      description: defectDescription.trim(),
      reported_by_name: tenant ? `${tenant.first_name} ${tenant.last_name}`.trim() : null,
      priority: "normal",
      status: "open",
    });

    if (error) {
      toast.error("Meldung konnte nicht gespeichert werden", {
        description: "Bitte kontaktieren Sie Ihre Hausverwaltung direkt.",
      });
      return;
    }

    toast.success("Meldung wurde übermittelt", {
      description: "Ihre Hausverwaltung wird sich in Kürze bei Ihnen melden.",
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
  const formatCHF = (n: number) => `CHF ${n.toLocaleString("de-CH")}`;

  const statusLabels: Record<string, string> = {
    paid: "Bezahlt",
    pending: "Ausstehend",
    overdue: "Überfällig",
    cancelled: "Storniert",
  };

  const openPayments = payments.filter((p) => p.status === "pending" || p.status === "overdue");
  const nextDue = [...openPayments].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  )[0];
  const allPaid = openPayments.length === 0;

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
                {contract?.unit.property.name || org?.org_name || "Hausverwaltung"}
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
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Es sind noch keine Zahlungen erfasst.
                  </p>
                ) : (
                  <>
                    {allPaid ? (
                      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4 mb-4 flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">Alle Zahlungen aktuell</p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Keine offenen Zahlungen.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-lg p-4 mb-4 flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        <div>
                          <p className="font-medium text-orange-800 dark:text-orange-200">
                            {openPayments.length} offene Zahlung{openPayments.length > 1 ? "en" : ""}
                          </p>
                          {nextDue && (
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                              Nächste fällig am {new Date(nextDue.due_date).toLocaleDateString("de-CH")}: {formatCHF(nextDue.amount)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                          <div>
                            <p className="font-medium">
                              Fällig {new Date(payment.due_date).toLocaleDateString("de-CH")}
                            </p>
                            {payment.paid_date && (
                              <p className="text-sm text-muted-foreground">
                                Bezahlt am {new Date(payment.paid_date).toLocaleDateString("de-CH")}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold">{formatCHF(payment.amount)}</p>
                            <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                              payment.status === "paid"
                                ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                                : payment.status === "overdue"
                                ? "bg-destructive/20 text-destructive"
                                : "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"
                            }`}>
                              {payment.status === "paid" && <CheckCircle className="w-3 h-3" />}
                              {statusLabels[payment.status] ?? payment.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
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
                {tenantDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Noch keine Dokumente verfügbar.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tenantDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString("de-CH")}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openTenantDoc(doc.file_url)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Kontakt</CardTitle>
                <CardDescription>
                  {org?.org_name ? `${org.org_name} – bei Fragen erreichen Sie uns hier` : "Bei Fragen erreichen Sie uns hier"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Verwaltung */}
                <div className="space-y-2">
                  {(org?.contact_phone || org?.contact_email) && (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verwaltung</p>
                  )}
                  {org?.contact_phone && (
                    <a href={`tel:${org.contact_phone.replace(/\s+/g, "")}`}>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Phone className="w-4 h-4" />
                        {org.contact_phone}
                      </Button>
                    </a>
                  )}
                  {org?.contact_email && (
                    <a href={`mailto:${org.contact_email}`}>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Mail className="w-4 h-4" />
                        {org.contact_email}
                      </Button>
                    </a>
                  )}
                  {!org?.contact_phone && !org?.contact_email && (
                    <p className="text-sm text-muted-foreground">Kontaktdaten werden von der Verwaltung hinterlegt.</p>
                  )}
                </div>

                {/* Hauswart / Abwart der Liegenschaft */}
                {(contract?.unit.property.caretaker_name || contract?.unit.property.caretaker_phone || contract?.unit.property.caretaker_email) && (
                  <div className="space-y-2 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5" /> Hauswart
                    </p>
                    {contract?.unit.property.caretaker_name && (
                      <p className="text-sm font-medium">{contract.unit.property.caretaker_name}</p>
                    )}
                    {contract?.unit.property.caretaker_phone && (
                      <a href={`tel:${contract.unit.property.caretaker_phone.replace(/\s+/g, "")}`}>
                        <Button variant="outline" className="w-full justify-start gap-2">
                          <Phone className="w-4 h-4" />
                          {contract.unit.property.caretaker_phone}
                        </Button>
                      </a>
                    )}
                    {contract?.unit.property.caretaker_email && (
                      <a href={`mailto:${contract.unit.property.caretaker_email}`}>
                        <Button variant="outline" className="w-full justify-start gap-2">
                          <Mail className="w-4 h-4" />
                          {contract.unit.property.caretaker_email}
                        </Button>
                      </a>
                    )}
                  </div>
                )}
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

        {/* Meine Angaben – erweitertes Profil, jederzeit anpassbar */}
        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold mb-1">Meine Angaben</h2>
          <p className="text-muted-foreground mb-5">Halten Sie Ihre Daten aktuell. Änderungen überschreiben den alten Wert – dieser bleibt als Verlauf erhalten.</p>
          <TenantProfileSection />
        </div>
      </main>
    </div>
  );
};

export default TenantPortal;
