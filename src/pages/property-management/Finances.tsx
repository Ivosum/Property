import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, AlertCircle, Clock, Loader2, Check, Building2 } from "lucide-react";
import { toast } from "sonner";
import { markPaymentPaid } from "@/lib/pmData";

const sb = supabase as any;

interface PaymentRow {
  id: string;
  tenant: string;
  unit: string;
  amount: number;
  due: string;
  status: string;
  rawStatus: string;
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
  const queryClient = useQueryClient();
  const [payingId, setPayingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pm-finances"],
    queryFn: async () => {
      const [{ data: payments }, { data: tenants }, { data: contracts }, { data: units }] = await Promise.all([
        sb.from("pm_payments").select("id, tenant_id, contract_id, amount, due_date, status, payment_type").order("due_date", { ascending: false }),
        sb.from("pm_tenants").select("id, first_name, last_name"),
        sb.from("pm_contracts").select("id, unit_id"),
        sb.from("pm_units").select("id, unit_number, floor_label"),
      ]);
      const tenantById = new Map((tenants ?? []).map((t: any) => [t.id, [t.first_name, t.last_name].filter(Boolean).join(" ") || "Unbenannt"]));
      const unitById = new Map((units ?? []).map((u: any) => [u.id, [u.floor_label, u.unit_number].filter(Boolean).join(" ")]));
      const unitByContract = new Map((contracts ?? []).map((c: any) => [c.id, unitById.get(c.unit_id) ?? ""]));

      const rows: PaymentRow[] = (payments ?? []).map((p: any) => ({
        id: p.id,
        tenant: tenantById.get(p.tenant_id) ?? "Unbekannt",
        unit: unitByContract.get(p.contract_id) ?? "",
        amount: p.amount,
        due: new Date(p.due_date).toLocaleDateString("de-CH"),
        status: statusLabels[p.status] ?? p.status,
        rawStatus: p.status,
      }));

      const paid = (payments ?? []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0);
      const pending = (payments ?? []).filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + Number(p.amount), 0);
      const overdue = (payments ?? []).filter((p: any) => p.status === "overdue").reduce((s: number, p: any) => s + Number(p.amount), 0);
      const total = paid + pending + overdue;

      return { rows, paid, pending, overdue, total };
    },
  });

  const confirmPaid = async (id: string) => {
    setPayingId(id);
    try {
      await markPaymentPaid(id);
      toast.success("Zahlung verbucht – automatisch in der Buchhaltung gebucht");
      queryClient.invalidateQueries({ queryKey: ["pm-finances"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-journal"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-overview"] });
    } catch (e) {
      toast.error("Konnte nicht verbucht werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setPayingId(null);
    }
  };

  const rows = data?.rows ?? [];

  return (
    <PropertyManagementLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Finanzen</h1>
        <p className="text-muted-foreground mt-1">Mietzahlungen – bestätigte Zahlungen werden automatisch gebucht</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2"><DollarSign className="w-5 h-5 text-primary" /></div>
            <p className="text-2xl font-bold">{isLoading ? "–" : formatCHF(data?.total ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Gesamtvolumen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2"><CreditCard className="w-5 h-5 text-green-500" /></div>
            <p className="text-2xl font-bold">{isLoading ? "–" : formatCHF(data?.paid ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Bezahlte Mieten</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2"><Clock className="w-5 h-5 text-amber-500" /></div>
            <p className="text-2xl font-bold">{isLoading ? "–" : formatCHF(data?.pending ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Ausstehend</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2"><AlertCircle className="w-5 h-5 text-destructive" /></div>
            <p className="text-2xl font-bold">{isLoading ? "–" : formatCHF(data?.overdue ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Überfällig</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Mietzahlungen</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Zahlungen werden geladen...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <CreditCard className="w-10 h-10 mb-3 opacity-40" />
              <p>Noch keine Zahlungen.</p>
              <p className="text-sm mt-1">Erstellen Sie einen Vertrag – der Mietzins-Plan wird automatisch erzeugt.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg flex-wrap gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{payment.tenant}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                      {payment.unit && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{payment.unit}</span>}
                      <span>Fällig: {payment.due}</span>
                    </p>
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
                    {(payment.rawStatus === "pending" || payment.rawStatus === "overdue") ? (
                      <Button size="sm" variant="outline" onClick={() => confirmPaid(payment.id)} disabled={payingId === payment.id}>
                        {payingId === payment.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                        Als bezahlt
                      </Button>
                    ) : (
                      <span className="w-[108px]" />
                    )}
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
