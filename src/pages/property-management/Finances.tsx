import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, DollarSign, AlertCircle, Clock, Loader2 } from "lucide-react";

interface PaymentRow {
  id: string;
  tenant: string;
  amount: number;
  due: string;
  status: string;
}

const statusLabels: Record<string, string> = {
  pending: "Ausstehend",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
};

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

const Finances = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["pm-finances"],
    queryFn: async () => {
      const [{ data: payments }, { data: tenants }] = await Promise.all([
        supabase.from("pm_payments").select("id, tenant_id, amount, due_date, status").order("due_date", { ascending: false }),
        supabase.from("pm_tenants").select("id, first_name, last_name"),
      ]);
      const tenantById = new Map((tenants ?? []).map((t) => [t.id, [t.first_name, t.last_name].filter(Boolean).join(" ") || "Unbenannt"]));

      const rows = (payments ?? []).map((p) => ({
        id: p.id,
        tenant: tenantById.get(p.tenant_id) ?? "Unbekannt",
        amount: p.amount,
        due: new Date(p.due_date).toLocaleDateString("de-CH"),
        status: statusLabels[p.status] ?? p.status,
        rawStatus: p.status,
      }));

      const paid = (payments ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
      const pending = (payments ?? []).filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
      const overdue = (payments ?? []).filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0);
      const total = paid + pending + overdue;

      return { rows: rows as (PaymentRow & { rawStatus: string })[], paid, pending, overdue, total };
    },
  });

  const rows = data?.rows ?? [];

  return (
    <PropertyManagementLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Finanzen</h1>
        <p className="text-muted-foreground mt-1">Übersicht über Mietzahlungen</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{isLoading ? "–" : formatCHF(data?.total ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Gesamtvolumen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{isLoading ? "–" : formatCHF(data?.paid ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Bezahlte Mieten</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold">{isLoading ? "–" : formatCHF(data?.pending ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Ausstehend</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-2xl font-bold">{isLoading ? "–" : formatCHF(data?.overdue ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Überfällig</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Zahlungen</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Zahlungen werden geladen...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <CreditCard className="w-10 h-10 mb-3 opacity-40" />
              <p>Noch keine Zahlungen erfasst.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                  <div>
                    <p className="font-medium">{payment.tenant}</p>
                    <p className="text-sm text-muted-foreground">Fällig: {payment.due}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold">{formatCHF(payment.amount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      payment.rawStatus === "paid" ? "bg-green-100 text-green-700" :
                      payment.rawStatus === "pending" ? "bg-orange-100 text-orange-700" :
                      payment.rawStatus === "overdue" ? "bg-destructive/20 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {payment.status}
                    </span>
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

export default Finances;
