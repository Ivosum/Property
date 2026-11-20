import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildBillingPreview, saveBilling, type BillingPreview, type CostLine,
} from "@/lib/utilityBilling";
import { buildUtilityBillPdf } from "@/lib/utilityBillPdf";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import FeatureGate from "@/components/property-management/FeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Calculator, FileText, Loader2, FileDown, ChevronRight, Users } from "lucide-react";
import { toast } from "sonner";

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", minimumFractionDigits: 2 }).format(n);

const statusLabels: Record<string, string> = {
  draft: "In Bearbeitung", created: "Erstellt", completed: "Abgeschlossen", pending: "Ausstehend",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

const UtilityBilling = () => {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailBill, setDetailBill] = useState<string | null>(null);

  const { data: bills, isLoading } = useQuery({
    queryKey: ["pm-utility-bills"],
    queryFn: async () => {
      const [{ data: b }, { data: props }] = await Promise.all([
        sb.from("pm_utility_bills").select("id, property_id, billing_year, total_costs, status, period_start, period_end").order("billing_year", { ascending: false }),
        sb.from("pm_properties").select("id, name"),
      ]);
      const propName = new Map<string, string>((props ?? []).map((p: any) => [p.id, p.name]));
      return (b ?? []).map((x: any) => ({
        id: x.id,
        property: propName.get(x.property_id) ?? "–",
        property_id: x.property_id,
        year: x.billing_year,
        total: x.total_costs,
        status: x.status,
        period: x.period_start && x.period_end
          ? `${new Date(x.period_start).toLocaleDateString("de-CH")} – ${new Date(x.period_end).toLocaleDateString("de-CH")}`
          : String(x.billing_year),
      }));
    },
  });

  const list = bills ?? [];

  return (
    <PropertyManagementLayout>
      <FeatureGate feature="utility_billing">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Nebenkostenabrechnung</h1>
          <p className="text-muted-foreground mt-1">Kosten aus der Buchhaltung, je Mieter abgerechnet</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Calculator className="w-4 h-4 mr-2" />
          Neue Abrechnung
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Abrechnungen ({list.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Abrechnungen werden geladen...
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Calculator className="w-10 h-10 mb-3 opacity-40" />
              <p>Noch keine Nebenkostenabrechnungen.</p>
              <p className="text-sm mt-1">Erstellen Sie eine Abrechnung – die Kosten kommen aus der Buchhaltung.</p>
            </div>
          ) : (
            <div className="divide-y">
              {list.map((b: any) => (
                <button
                  key={b.id}
                  onClick={() => setDetailBill(b.id)}
                  className="w-full flex items-center justify-between py-4 px-2 text-left hover:bg-secondary/30 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium">{b.property}</p>
                    <p className="text-sm text-muted-foreground">Periode: {b.period}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{formatCHF(b.total)}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">{statusLabels[b.status] ?? b.status}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateBillingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ["pm-utility-bills"] }); }}
      />

      {detailBill && (
        <BillingDetailDialog billId={detailBill} onClose={() => setDetailBill(null)} />
      )}
      </FeatureGate>
    </PropertyManagementLayout>
  );
};

// ---- Neue Abrechnung erstellen ----
function CreateBillingDialog({
  open, onOpenChange, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const year = new Date().getFullYear() - 1;
  const [propertyId, setPropertyId] = useState("");
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year}-12-31`);
  const [distribution, setDistribution] = useState<"area" | "per_unit">("area");
  const [preview, setPreview] = useState<BillingPreview | null>(null);
  const [costs, setCosts] = useState<CostLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ["billing-properties"],
    queryFn: async () => {
      const { data } = await sb.from("pm_properties").select("id, name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const loadPreview = async (nextCosts?: CostLine[]) => {
    if (!propertyId) return toast.error("Bitte eine Liegenschaft wählen.");
    setLoading(true);
    try {
      const includedIds = nextCosts ? nextCosts.filter((c) => c.included).map((c) => c.account_id) : undefined;
      const p = await buildBillingPreview({ propertyId, periodStart: from, periodEnd: to, includedAccountIds: includedIds, distribution });
      setPreview(p);
      setCosts(p.availableCosts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const toggleCost = (id: string) => {
    const next = costs.map((c) => (c.account_id === id ? { ...c, included: !c.included } : c));
    setCosts(next);
    loadPreview(next);
  };

  const save = async () => {
    if (!preview || !propertyId) return;
    if (preview.tenants.length === 0) return toast.error("Keine Mieter mit Vertrag in dieser Periode.");
    setSaving(true);
    try {
      const breakdown = costs.filter((c) => c.included).map((c) => ({ code: c.code, name: c.name, amount: c.amount }));
      await saveBilling({
        propertyId,
        year: new Date(to).getFullYear(),
        periodStart: from,
        periodEnd: to,
        distribution,
        totalCost: preview.totalCost,
        totalArea: preview.totalArea,
        costBreakdown: breakdown,
        tenants: preview.tenants,
      });
      toast.success("Abrechnung gespeichert");
      onSaved();
      // reset
      setPreview(null); setCosts([]); setPropertyId("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Neue Nebenkostenabrechnung</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Liegenschaft</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setPreview(null); }}>
                <option value="">Wählen...</option>
                {(properties ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Periode von</Label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreview(null); }} />
            </div>
            <div className="space-y-2">
              <Label>Periode bis</Label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreview(null); }} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Verteilschlüssel</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={distribution === "area" ? "default" : "outline"} onClick={() => { setDistribution("area"); setPreview(null); }}>
                  Nach Wohnfläche (m²)
                </Button>
                <Button type="button" variant={distribution === "per_unit" ? "default" : "outline"} onClick={() => { setDistribution("per_unit"); setPreview(null); }}>
                  Pro Einheit gleich
                </Button>
              </div>
            </div>
          </div>

          {!preview ? (
            <Button className="w-full" onClick={() => loadPreview()} disabled={loading || !propertyId}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kosten aus Buchhaltung laden
            </Button>
          ) : (
            <>
              {/* Kostenkonten */}
              <div className="space-y-2">
                <Label>Nebenkosten-Positionen (aus der Buchhaltung)</Label>
                {costs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Aufwände im Zeitraum gebucht.</p>
                ) : (
                  <div className="space-y-1 border rounded-lg p-2">
                    {costs.map((c) => (
                      <label key={c.account_id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-secondary/40 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={c.included} onCheckedChange={() => toggleCost(c.account_id)} />
                          <span className="text-sm">
                            {c.code} {c.name}
                            {c.isDefault && <span className="ml-2 text-xs text-primary">Standard</span>}
                          </span>
                        </div>
                        <span className="text-sm font-medium">{formatCHF(c.amount)}</span>
                      </label>
                    ))}
                    <div className="flex items-center justify-between px-2 pt-2 border-t">
                      <span className="text-sm font-semibold">Total Nebenkosten</span>
                      <span className="text-sm font-bold">{formatCHF(preview.totalCost)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mieter-Aufteilung */}
              <div className="space-y-2">
                <Label>Aufteilung je Mieter ({preview.tenants.length})</Label>
                {preview.tenants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Mieter mit Vertrag in dieser Periode.</p>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-xs">
                          <th className="text-left py-2 px-3">Mieter / Objekt</th>
                          <th className="text-left py-2 px-3">Zeitraum</th>
                          <th className="text-right py-2 px-3">m²</th>
                          <th className="text-right py-2 px-3">Tage</th>
                          <th className="text-right py-2 px-3">Anteil</th>
                          <th className="text-right py-2 px-3">Kosten</th>
                          <th className="text-right py-2 px-3">Akonto</th>
                          <th className="text-right py-2 px-3">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.tenants.map((t) => (
                          <tr key={t.contract_id} className="border-b">
                            <td className="py-2 px-3">{t.tenant_name}<span className="text-muted-foreground"> · {t.unit_number}</span></td>
                            <td className="py-2 px-3 text-muted-foreground text-xs whitespace-nowrap">{t.period_label}</td>
                            <td className="py-2 px-3 text-right">{t.area_sqm}</td>
                            <td className="py-2 px-3 text-right">{t.days}</td>
                            <td className="py-2 px-3 text-right">{(t.share_pct * 100).toFixed(1)}%</td>
                            <td className="py-2 px-3 text-right">{formatCHF(t.cost_share)}</td>
                            <td className="py-2 px-3 text-right">{formatCHF(t.advance_paid)}</td>
                            <td className={`py-2 px-3 text-right font-medium ${t.balance < 0 ? "text-destructive" : "text-green-600"}`}>
                              {t.balance < 0 ? "Nachz. " : "Guthaben "}{formatCHF(Math.abs(t.balance))}
                            </td>
                          </tr>
                        ))}
                        {preview.vacancyCost > 0.5 && (
                          <tr className="border-b bg-secondary/30">
                            <td className="py-2 px-3 font-medium">Leerstand (Eigentümer)</td>
                            <td className="py-2 px-3 text-muted-foreground text-xs">nicht vermietete Zeit</td>
                            <td className="py-2 px-3 text-right">–</td>
                            <td className="py-2 px-3 text-right">–</td>
                            <td className="py-2 px-3 text-right">{preview.totalCost > 0 ? ((preview.vacancyCost / preview.totalCost) * 100).toFixed(1) : "0"}%</td>
                            <td className="py-2 px-3 text-right">{formatCHF(preview.vacancyCost)}</td>
                            <td className="py-2 px-3 text-right">–</td>
                            <td className="py-2 px-3 text-right">–</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        {preview && (
          <DialogFooter>
            <Button onClick={save} disabled={saving || preview.tenants.length === 0}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Abrechnung speichern
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---- Detail: Mieter-Positionen mit PDF ----
function BillingDetailDialog({ billId, onClose }: { billId: string; onClose: () => void }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pm-utility-bill-detail", billId],
    queryFn: async () => {
      const { data: bill } = await sb.from("pm_utility_bills").select("*").eq("id", billId).single();
      const { data: items } = await sb.from("pm_utility_bill_items").select("*").eq("utility_bill_id", billId);
      const { data: property } = await sb.from("pm_properties").select("name, city").eq("id", bill.property_id).single();
      const tenantIds = (items ?? []).map((i: any) => i.tenant_id);
      const unitIds = (items ?? []).map((i: any) => i.unit_id).filter(Boolean);
      const [{ data: tenants }, { data: units }] = await Promise.all([
        tenantIds.length ? sb.from("pm_tenants").select("id, first_name, last_name").in("id", tenantIds) : Promise.resolve({ data: [] }),
        unitIds.length ? sb.from("pm_units").select("id, unit_number").in("id", unitIds) : Promise.resolve({ data: [] }),
      ]);
      const tName = new Map<string, string>((tenants ?? []).map((t: any) => [t.id, [t.first_name, t.last_name].filter(Boolean).join(" ")]));
      const uNum = new Map<string, string>((units ?? []).map((u: any) => [u.id, u.unit_number]));
      return {
        bill,
        property,
        items: (items ?? []).map((i: any) => ({
          ...i,
          tenant_name: tName.get(i.tenant_id) ?? "Mieter",
          unit_number: uNum.get(i.unit_id) ?? "–",
        })),
      };
    },
  });

  const periodLabel = data?.bill?.period_start && data?.bill?.period_end
    ? `${new Date(data.bill.period_start).toLocaleDateString("de-CH")} – ${new Date(data.bill.period_end).toLocaleDateString("de-CH")}`
    : String(data?.bill?.billing_year ?? "");

  const downloadPdf = async (item: any) => {
    if (!data) return;
    setDownloading(item.id);
    try {
      const blob = await buildUtilityBillPdf({
        propertyName: data.property?.name ?? "Liegenschaft",
        propertyCity: data.property?.city ?? "",
        periodLabel,
        tenantName: item.tenant_name,
        unitNumber: item.unit_number,
        areaSqm: Number(item.area_sqm) || 0,
        totalArea: Number(data.bill.total_area_sqm) || 0,
        sharePct: (Number(item.share_pct) || 0) / 100,
        months: Number(item.months) || 0,
        costBreakdown: data.bill.cost_breakdown ?? [],
        totalCost: Number(data.bill.total_costs) || 0,
        costShare: Number(item.calculated_costs) || 0,
        advancePaid: Number(item.total_advance_paid) || 0,
        balance: Number(item.balance) || 0,
        distributionLabel: data.bill.distribution === "area" ? "nach Wohnfläche (m²)" : "pro Einheit gleich",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NK_${item.tenant_name.replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler beim PDF");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abrechnung · {data?.property?.name ?? ""}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Periode: {periodLabel}</span>
              <span className="font-semibold">Total: {formatCHF(Number(data?.bill?.total_costs) || 0)}</span>
            </div>
            <div className="space-y-2">
              {(data?.items ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">Keine Positionen.</p>
                </div>
              ) : (
                data!.items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.tenant_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Wohnung {item.unit_number} · Kosten {formatCHF(Number(item.calculated_costs))}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${Number(item.balance) < 0 ? "text-destructive" : "text-green-600"}`}>
                        {Number(item.balance) < 0 ? "Nachz. " : "Guthaben "}{formatCHF(Math.abs(Number(item.balance)))}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => downloadPdf(item)} disabled={downloading === item.id}>
                        {downloading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" /> Jeder Mieter erhält eine eigene Abrechnung als PDF.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default UtilityBilling;
