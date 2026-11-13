import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, FileText, Clock, CheckCircle, Loader2 } from "lucide-react";

interface BillingRow {
  id: string;
  property: string;
  year: number;
  total: number;
  status: string;
}

const statusLabels: Record<string, string> = {
  draft: "In Bearbeitung",
  created: "Erstellt",
  completed: "Abgeschlossen",
  pending: "Ausstehend",
};

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

const UtilityBilling = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["pm-utility-bills"],
    queryFn: async () => {
      const [{ data: bills }, { data: props }] = await Promise.all([
        supabase.from("pm_utility_bills").select("id, property_id, billing_year, total_costs, status").order("billing_year", { ascending: false }),
        supabase.from("pm_properties").select("id, name"),
      ]);
      const propName = new Map((props ?? []).map((p) => [p.id, p.name]));

      const rows = (bills ?? []).map((b) => ({
        id: b.id,
        property: propName.get(b.property_id) ?? "–",
        year: b.billing_year,
        total: b.total_costs,
        status: statusLabels[b.status] ?? b.status,
        rawStatus: b.status,
      }));

      const currentYear = new Date().getFullYear();
      const thisYear = (bills ?? []).filter((b) => b.billing_year === currentYear).length;
      const open = (bills ?? []).filter((b) => b.status !== "completed").length;
      const done = (bills ?? []).filter((b) => b.status === "completed").length;

      return { rows, thisYear, open, done };
    },
  });

  const rows = data?.rows ?? [];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Nebenkostenabrechnung</h1>
          <p className="text-muted-foreground mt-1">Erstellen und verwalten Sie Nebenkostenabrechnungen</p>
        </div>
        <Button>
          <Calculator className="w-4 h-4 mr-2" />
          Neue Abrechnung
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "–" : data?.thisYear ?? 0}</p>
                <p className="text-sm text-muted-foreground">Abrechnungen {new Date().getFullYear()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "–" : data?.open ?? 0}</p>
                <p className="text-sm text-muted-foreground">In Bearbeitung</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "–" : data?.done ?? 0}</p>
                <p className="text-sm text-muted-foreground">Abgeschlossen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abrechnungsübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Abrechnungen werden geladen...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Calculator className="w-10 h-10 mb-3 opacity-40" />
              <p>Noch keine Nebenkostenabrechnungen erstellt.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((billing) => (
                <div key={billing.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg flex-wrap gap-4">
                  <div>
                    <p className="font-medium">{billing.property}</p>
                    <p className="text-sm text-muted-foreground">
                      Abrechnungszeitraum: {billing.year} • Gesamtkosten: {formatCHF(billing.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      billing.rawStatus === "completed" ? "bg-green-100 text-green-700" :
                      billing.rawStatus === "created" ? "bg-primary/20 text-primary" :
                      billing.rawStatus === "draft" ? "bg-orange-100 text-orange-700" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {billing.status}
                    </span>
                    <Button variant="outline" size="sm">Bearbeiten</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default UtilityBilling;
