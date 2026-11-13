import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, PieChart, FileText } from "lucide-react";

const formatCHF = (n: number) => {
  if (n >= 1_000_000) return `CHF ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `CHF ${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);
};

const Reports = () => {
  const { data } = useQuery({
    queryKey: ["pm-reports-stats"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const [{ data: units }, { data: contracts }, { data: payments }] = await Promise.all([
        supabase.from("pm_units").select("status"),
        supabase.from("pm_contracts").select("status"),
        supabase.from("pm_payments").select("amount, status, paid_date"),
      ]);

      const occupied = (units ?? []).filter((u) => u.status === "occupied").length;
      const occupancyRate = (units ?? []).length > 0 ? Math.round((occupied / (units ?? []).length) * 100) : 0;

      const activeContracts = (contracts ?? []).filter((c) => c.status === "active").length;

      const yearIncome = (payments ?? [])
        .filter((p) => p.status === "paid" && p.paid_date && new Date(p.paid_date).getFullYear() === currentYear)
        .reduce((s, p) => s + p.amount, 0);

      return { occupancyRate, activeContracts, yearIncome, currentYear };
    },
  });

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Berichte</h1>
          <p className="text-muted-foreground mt-1">Analysen und Kennzahlen</p>
        </div>
        <Button>
          <BarChart3 className="w-4 h-4 mr-2" />
          Report erstellen
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{data ? `${data.occupancyRate}%` : "–"}</p>
                <p className="text-sm text-muted-foreground">Auslastung</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{data ? formatCHF(data.yearIncome) : "–"}</p>
                <p className="text-sm text-muted-foreground">Einnahmen {data?.currentYear ?? ""}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{data ? data.activeContracts : "–"}</p>
                <p className="text-sm text-muted-foreground">Aktive Mietverhältnisse</p>
              </div>
              <PieChart className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Gespeicherte Berichte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mb-3 opacity-40" />
            <p>Noch keine Berichte erstellt.</p>
            <p className="text-sm mt-1">Erstellen Sie Ihren ersten Report über „Report erstellen".</p>
          </div>
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Reports;
