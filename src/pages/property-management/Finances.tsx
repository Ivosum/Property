import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CreditCard, DollarSign, AlertCircle, Clock, Loader2, Check, Building2,
  Landmark, BellRing, ChevronDown, RefreshCw, Gavel, FileWarning, FileCode2,
} from "lucide-react";
import { toast } from "sonner";
import {
  markPaymentPaid, markOverduePayments, addReminder, REMINDER_STAGES, REMINDER_STAGE_LABEL,
  BANK_ACCESS_LABEL,
} from "@/lib/pmData";
import BankConnectionDialog from "@/components/property-management/BankConnectionDialog";
import CamtImportDialog from "@/components/property-management/CamtImportDialog";
import { fillMahnung } from "@/lib/fillMahnung";

const sb = supabase as any;

interface PaymentRow {
  id: string;
  tenant: string;
  unit: string;
  propertyId: string | null;
  amount: number;
  fees: number;
  due: string;
  dueRaw: string;
  status: string;
  rawStatus: string;
  stage: number;
  lastReminder: string | null;
}

const statusLabels: Record<string, string> = {
  pending: "Ausstehend",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
};

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

const daysOverdue = (dueRaw: string) => {
  const diff = Date.now() - new Date(dueRaw).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
};

const Finances = () => {
  const queryClient = useQueryClient();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState<string | null>(null);
  const [bankProp, setBankProp] = useState<{ id: string; name: string } | null>(null);
  const [camtOpen, setCamtOpen] = useState(false);
  const [camtPropId, setCamtPropId] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["pm-finances"] });
    queryClient.invalidateQueries({ queryKey: ["pm-bank"] });
    queryClient.invalidateQueries({ queryKey: ["accounting-journal"] });
    queryClient.invalidateQueries({ queryKey: ["accounting-overview"] });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["pm-finances"],
    queryFn: async () => {
      const [{ data: payments }, { data: tenants }, { data: contracts }, { data: units }] = await Promise.all([
        sb.from("pm_payments").select("id, tenant_id, contract_id, amount, due_date, status, payment_type, reminder_stage, reminder_fees, last_reminder_at").order("due_date", { ascending: false }),
        sb.from("pm_tenants").select("id, first_name, last_name"),
        sb.from("pm_contracts").select("id, unit_id"),
        sb.from("pm_units").select("id, unit_number, floor_label, property_id"),
      ]);
      const tenantById = new Map((tenants ?? []).map((t: any) => [t.id, [t.first_name, t.last_name].filter(Boolean).join(" ") || "Unbenannt"]));
      const unitById = new Map((units ?? []).map((u: any) => [u.id, u]));
      const contractById = new Map((contracts ?? []).map((c: any) => [c.id, c]));

      const rows: PaymentRow[] = (payments ?? []).map((p: any) => {
        const c = contractById.get(p.contract_id);
        const u = c ? unitById.get(c.unit_id) : undefined;
        return {
          id: p.id,
          tenant: tenantById.get(p.tenant_id) ?? "Unbekannt",
          unit: u ? [u.floor_label, u.unit_number].filter(Boolean).join(" ") : "",
          propertyId: u?.property_id ?? null,
          amount: Number(p.amount),
          fees: Number(p.reminder_fees ?? 0),
          due: new Date(p.due_date).toLocaleDateString("de-CH"),
          dueRaw: p.due_date,
          status: statusLabels[p.status] ?? p.status,
          rawStatus: p.status,
          stage: Number(p.reminder_stage ?? 0),
          lastReminder: p.last_reminder_at ? new Date(p.last_reminder_at).toLocaleDateString("de-CH") : null,
        };
      });

      const paid = (payments ?? []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0);
      const pending = (payments ?? []).filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + Number(p.amount), 0);
      const overdue = (payments ?? []).filter((p: any) => p.status === "overdue").reduce((s: number, p: any) => s + Number(p.amount), 0);
      const total = paid + pending + overdue;

      return { rows, paid, pending, overdue, total };
    },
  });

  // Bankanbindungen je Liegenschaft
  const { data: bank } = useQuery({
    queryKey: ["pm-bank"],
    queryFn: async () => {
      const [{ data: props }, { data: conns }] = await Promise.all([
        sb.from("pm_properties").select("id, name, address, city").order("name"),
        sb.from("pm_bank_connections").select("*"),
      ]);
      const connByProp = new Map((conns ?? []).map((c: any) => [c.property_id, c]));
      return (props ?? []).map((p: any) => ({
        id: p.id,
        name: p.name || [p.address, p.city].filter(Boolean).join(", ") || "Liegenschaft",
        conn: connByProp.get(p.id) ?? null,
      }));
    },
  });

  const confirmPaid = async (id: string) => {
    setPayingId(id);
    try {
      await markPaymentPaid(id);
      toast.success("Zahlung verbucht – automatisch in der Buchhaltung gebucht");
      invalidateAll();
    } catch (e) {
      toast.error("Konnte nicht verbucht werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setPayingId(null);
    }
  };

  const runOverdue = async () => {
    try {
      const n = await markOverduePayments();
      toast.success(n > 0 ? `${n} Zahlung(en) als überfällig markiert` : "Keine neuen überfälligen Zahlungen");
      invalidateAll();
    } catch (e) {
      toast.error("Fehler. " + (e instanceof Error ? e.message : ""));
    }
  };

  const sendReminder = async (id: string, stage: number) => {
    setReminderBusy(id);
    try {
      const reminderId = await addReminder(id, stage);
      // PDF erzeugen und herunterladen
      try {
        const { blob, fileName, stored } = await fillMahnung(reminderId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
        toast.success(`${REMINDER_STAGE_LABEL[stage]} erstellt${stored ? " und abgelegt" : ""} – PDF heruntergeladen`);
      } catch (pdfErr) {
        toast.success(`${REMINDER_STAGE_LABEL[stage]} erfasst`);
        toast.error("PDF konnte nicht erzeugt werden. " + (pdfErr instanceof Error ? pdfErr.message : ""));
      }
      invalidateAll();
    } catch (e) {
      toast.error("Konnte nicht erfasst werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setReminderBusy(null);
    }
  };

  const rows = data?.rows ?? [];
  const overdueRows = rows.filter((r) => r.rawStatus === "overdue" || (r.rawStatus === "pending" && daysOverdue(r.dueRaw) > 5));
  const totalFees = rows.reduce((s, r) => s + r.fees, 0);

  return (
    <PropertyManagementLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Finanzen</h1>
        <p className="text-muted-foreground mt-1">Mietzahlungen, Mahnwesen und Bankanbindung – bestätigte Zahlungen werden automatisch gebucht</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-6 mb-8">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2"><DollarSign className="w-5 h-5 text-primary" /></div>
            <p className="text-lg sm:text-2xl font-bold leading-tight tabular-nums whitespace-nowrap">{isLoading ? "–" : formatCHF(data?.total ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Gesamtvolumen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2"><CreditCard className="w-5 h-5 text-green-500" /></div>
            <p className="text-lg sm:text-2xl font-bold leading-tight tabular-nums whitespace-nowrap">{isLoading ? "–" : formatCHF(data?.paid ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Bezahlte Mieten</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2"><Clock className="w-5 h-5 text-amber-500" /></div>
            <p className="text-lg sm:text-2xl font-bold leading-tight tabular-nums whitespace-nowrap">{isLoading ? "–" : formatCHF(data?.pending ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Ausstehend</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2"><AlertCircle className="w-5 h-5 text-destructive" /></div>
            <p className="text-lg sm:text-2xl font-bold leading-tight tabular-nums whitespace-nowrap">{isLoading ? "–" : formatCHF(data?.overdue ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Überfällig</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments">
        <TabsList className="mb-6">
          <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-2" />Mietzahlungen</TabsTrigger>
          <TabsTrigger value="dunning">
            <BellRing className="w-4 h-4 mr-2" />Mahnwesen
            {overdueRows.length > 0 && (
              <span className="ml-2 text-xs bg-destructive/20 text-destructive rounded-full px-2 py-0.5">{overdueRows.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bank"><Landmark className="w-4 h-4 mr-2" />Bankanbindung</TabsTrigger>
        </TabsList>

        {/* ============== MIETZAHLUNGEN ============== */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Mietzahlungen</CardTitle>
              <Button size="sm" variant="outline" onClick={runOverdue}>
                <RefreshCw className="w-4 h-4 mr-2" /> Überfällige prüfen
              </Button>
            </CardHeader>
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
                          {payment.stage > 0 && (
                            <span className="text-destructive">· {REMINDER_STAGE_LABEL[payment.stage]}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCHF(payment.amount + payment.fees)}</p>
                          {payment.fees > 0 && <p className="text-xs text-muted-foreground">inkl. {formatCHF(payment.fees)} Gebühren</p>}
                        </div>
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
        </TabsContent>

        {/* ============== MAHNWESEN ============== */}
        <TabsContent value="dunning">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>Mahnwesen</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Überfällige Mieten – 1./2. Zahlungserinnerung, Mahnung (Art. 257d OR) und Betreibung.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Offene Mahngebühren</p>
                  <p className="font-semibold">{formatCHF(totalFees)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...
                </div>
              ) : overdueRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Check className="w-10 h-10 mb-3 opacity-40 text-green-500" />
                  <p>Keine überfälligen Zahlungen – alles im Soll.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueRows.map((p) => {
                    const nextStage = Math.min(p.stage + 1, 4);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg flex-wrap gap-3">
                        <div className="min-w-0">
                          <p className="font-medium flex items-center gap-2">
                            {p.tenant}
                            {p.stage >= 3 ? <Gavel className="w-4 h-4 text-destructive" /> : p.stage > 0 ? <FileWarning className="w-4 h-4 text-amber-500" /> : null}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                            {p.unit && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{p.unit}</span>}
                            <span>Fällig: {p.due}</span>
                            <span className="text-destructive">{daysOverdue(p.dueRaw)} Tage überfällig</span>
                            {p.lastReminder && <span>· letzte Mahnung {p.lastReminder}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">{formatCHF(p.amount + p.fees)}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.stage > 0 ? `Stufe ${p.stage}: ${REMINDER_STAGE_LABEL[p.stage]}` : "noch nicht gemahnt"}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => confirmPaid(p.id)} disabled={payingId === p.id}>
                            {payingId === p.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                            Bezahlt
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" disabled={reminderBusy === p.id}>
                                {reminderBusy === p.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BellRing className="w-4 h-4 mr-1" />}
                                {p.stage >= 4 ? "Mahnstufe" : REMINDER_STAGES[nextStage - 1].short}
                                <ChevronDown className="w-4 h-4 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {REMINDER_STAGES.map((s) => (
                                <DropdownMenuItem
                                  key={s.stage}
                                  disabled={s.stage <= p.stage}
                                  onClick={() => sendReminder(p.id, s.stage)}
                                >
                                  {s.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== BANKANBINDUNG ============== */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>Bankanbindung je Liegenschaft</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kontodaten und Zugang für den automatischen Zahlungsabgleich (camt.053 / EBICS).
                    Status „Zugang beantragt", bis die Bank freischaltet.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setCamtPropId(null); setCamtOpen(true); }}>
                  <FileCode2 className="w-4 h-4 mr-2" /> Kontoauszug importieren
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!bank ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...
                </div>
              ) : bank.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">Noch keine Liegenschaften erfasst.</p>
              ) : (
                <div className="space-y-3">
                  {bank.map((b: any) => {
                    const c = b.conn;
                    const st = c?.status ?? "none";
                    return (
                      <div key={b.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg flex-wrap gap-3">
                        <div className="min-w-0">
                          <p className="font-medium flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" />{b.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {c?.bank_name ? c.bank_name : "Keine Bank hinterlegt"}
                            {c?.iban ? ` · ${c.iban}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            st === "active" ? "bg-green-100 text-green-700" :
                            st === "requested" ? "bg-amber-100 text-amber-700" :
                            st === "revoked" ? "bg-destructive/20 text-destructive" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {BANK_ACCESS_LABEL[st] ?? st}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => { setCamtPropId(b.id); setCamtOpen(true); }} title="Kontoauszug importieren">
                            <FileCode2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setBankProp({ id: b.id, name: b.name })}>
                            {c ? "Bearbeiten" : "Einrichten"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {bankProp && (
        <BankConnectionDialog
          open={!!bankProp}
          onOpenChange={(o) => { if (!o) setBankProp(null); }}
          propertyId={bankProp.id}
          propertyName={bankProp.name}
          onSaved={invalidateAll}
        />
      )}

      <CamtImportDialog
        open={camtOpen}
        onOpenChange={setCamtOpen}
        defaultPropertyId={camtPropId}
        onDone={invalidateAll}
      />
    </PropertyManagementLayout>
  );
};

export default Finances;
