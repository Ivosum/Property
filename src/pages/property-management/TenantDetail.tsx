import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, Mail, Phone, Home, FileText, CreditCard, Download,
  Pencil, Car, Box, Settings2, Users, KeyRound, CheckCircle2, Send,
} from "lucide-react";
import { toast } from "sonner";
import TenantEditDialog from "@/components/property-management/TenantEditDialog";
import UnitManageDialog from "@/components/property-management/UnitManageDialog";
import { UNIT_TYPE_LABEL, inviteTenantPortal } from "@/lib/pmData";

const sb = supabase as any;

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);
const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("de-CH") : "–");
const docTypeLabel = (t: string) =>
  t === "contract" ? "Mietvertrag" : t === "handover_protocol" ? "Abnahmeprotokoll"
  : t === "utility_bill" ? "Nebenkostenabrechnung" : t === "receipt" ? "Beleg"
  : t === "correspondence" ? "Korrespondenz" : "Dokument";

const payStatusBadge = (s: string) =>
  s === "paid" ? "bg-green-100 text-green-700" : s === "overdue" ? "bg-destructive/20 text-destructive" : "bg-orange-100 text-orange-700";
const payStatusLabel = (s: string) =>
  s === "paid" ? "Bezahlt" : s === "overdue" ? "Überfällig" : s === "cancelled" ? "Storniert" : "Ausstehend";

const TenantDetail = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [manageUnit, setManageUnit] = useState<{ propertyId: string; unitId: string; label: string } | null>(null);
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!tenantId) return;
    setInviting(true);
    try {
      const res = await inviteTenantPortal(tenantId);
      toast.success(
        res.mode === "linked_existing" ? "Bestehendes Konto verknüpft und Einladung gesendet"
        : res.mode === "reinvited" ? "Einladung erneut gesendet"
        : "Portalzugang erstellt und Einladung gesendet",
        { description: `Eine E-Mail wurde an ${res.email} verschickt.` },
      );
      queryClient.invalidateQueries({ queryKey: ["pm-tenant-360", tenantId] });
    } catch (e) {
      toast.error("Einladung fehlgeschlagen", { description: e instanceof Error ? e.message : "" });
    } finally {
      setInviting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["pm-tenant-360", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data: tenant } = await sb.from("pm_tenants")
        .select("id, first_name, last_name, email, phone, nationality, employer, co_tenants, user_id, portal_invited_at")
        .eq("id", tenantId).single();

      const [{ data: contracts }, { data: units }, { data: props }, { data: payments }, { data: docs }] = await Promise.all([
        sb.from("pm_contracts").select("id, unit_id, base_rent, utilities_advance, start_date, end_date, status, deposit_amount").eq("tenant_id", tenantId),
        sb.from("pm_units").select("id, unit_number, floor_label, unit_type, property_id, parent_unit_id, base_rent"),
        sb.from("pm_properties").select("id, name"),
        sb.from("pm_payments").select("id, amount, due_date, status, payment_type").eq("tenant_id", tenantId).order("due_date", { ascending: false }),
        sb.from("pm_documents").select("id, name, document_type, file_url, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      ]);

      const unitById = new Map((units ?? []).map((u: any) => [u.id, u]));
      const propName = new Map((props ?? []).map((p: any) => [p.id, p.name]));

      const objects = (contracts ?? []).map((c: any) => {
        const u = unitById.get(c.unit_id);
        // gekoppelte Neben-Einheiten (Garage/Keller/…) dieser Wohnung
        const coupled = (units ?? []).filter((x: any) => x.parent_unit_id === c.unit_id).map((x: any) => ({
          id: x.id, number: x.unit_number, type: x.unit_type, rent: Number(x.base_rent) || 0,
        }));
        return {
          contract_id: c.id,
          unit_id: c.unit_id,
          property_id: u?.property_id ?? null,
          status: c.status,
          unit: u ? [u.floor_label, u.unit_number].filter(Boolean).join(" ") : "–",
          property: u ? (propName.get(u.property_id) ?? "") : "",
          rent: Number(c.base_rent) || 0,
          nk: Number(c.utilities_advance) || 0,
          start: c.start_date,
          end: c.end_date,
          deposit: c.deposit_amount,
          coupled,
        };
      });

      const paidTotal = (payments ?? []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0);
      const openTotal = (payments ?? []).filter((p: any) => p.status === "pending" || p.status === "overdue").reduce((s: number, p: any) => s + Number(p.amount), 0);

      return { tenant, objects, payments: payments ?? [], documents: docs ?? [], paidTotal, openTotal };
    },
  });

  if (isLoading) {
    return (
      <PropertyManagementLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Mieterdaten werden geladen...
        </div>
      </PropertyManagementLayout>
    );
  }

  const t = data?.tenant;
  const name = t ? [t.first_name, t.last_name].filter(Boolean).join(" ") : "Mieter";

  return (
    <PropertyManagementLayout>
      <button onClick={() => navigate("/property-management/tenants")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Mieter
      </button>

      <div className="flex items-start gap-4 mb-8 flex-wrap">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-semibold">
          {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-bold">{name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
            {t?.email && <a href={`mailto:${t.email}`} className="flex items-center gap-1 hover:text-foreground"><Mail className="w-4 h-4" />{t.email}</a>}
            {t?.phone && <a href={`tel:${t.phone}`} className="flex items-center gap-1 hover:text-foreground"><Phone className="w-4 h-4" />{t.phone}</a>}
            {t?.employer && <span>{t.employer}</span>}
          </div>
          {Array.isArray(t?.co_tenants) && t.co_tenants.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Users className="w-4 h-4" />
              Mitmieter: {t.co_tenants.map((c: any) => [c.first_name, c.last_name].filter(Boolean).join(" ")).join(", ")}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {t?.user_id ? (
              <Button variant="outline" onClick={handleInvite} disabled={inviting} title="Neue Einladungs-/Passwort-Mail senden">
                {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Einladung erneut senden
              </Button>
            ) : (
              <Button variant="outline" onClick={handleInvite} disabled={inviting || !t?.email}
                title={t?.email ? "Portalzugang erstellen und einladen" : "Keine E-Mail hinterlegt"}>
                {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Portalzugang einladen
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
            </Button>
          </div>
          {t?.user_id ? (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Portalzugang aktiv
              {t?.portal_invited_at ? ` · eingeladen ${formatDate(t.portal_invited_at)}` : ""}
            </span>
          ) : !t?.email ? (
            <span className="text-xs text-muted-foreground">Für Portalzugang zuerst eine E-Mail hinterlegen</span>
          ) : (
            <span className="text-xs text-muted-foreground">Noch kein Portalzugang</span>
          )}
        </div>
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card><CardContent className="p-6">
          <Home className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold">{data?.objects.filter((o) => o.status === "active").length ?? 0}</p>
          <p className="text-sm text-muted-foreground">Aktive Objekte</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <CreditCard className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold">{formatCHF(data?.paidTotal ?? 0)}</p>
          <p className="text-sm text-muted-foreground">Bezahlt gesamt</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <CreditCard className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold">{formatCHF(data?.openTotal ?? 0)}</p>
          <p className="text-sm text-muted-foreground">Offen</p>
        </CardContent></Card>
      </div>

      {/* Objekte / Verträge */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Objekte & Vertrag</CardTitle></CardHeader>
        <CardContent>
          {(data?.objects.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Kein Vertrag erfasst.</p>
          ) : (
            <div className="space-y-3">
              {data!.objects.map((o, i) => (
                <div key={i} className="p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-medium">{o.property} · {o.unit}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(o.start)} – {o.end ? formatDate(o.end) : "unbefristet"}
                        {o.deposit ? ` · Kaution ${formatCHF(Number(o.deposit))}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCHF(o.rent)}{o.nk ? <span className="text-xs text-muted-foreground"> + {formatCHF(o.nk)} NK</span> : null}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {o.status === "active" ? "Aktiv" : o.status === "terminated" ? "Beendet" : o.status}
                      </span>
                    </div>
                  </div>

                  {/* Garage & Keller */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {o.coupled.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Keine Garage / Keller zugeordnet</span>
                      ) : (
                        o.coupled.map((c) => {
                          const Icon = c.type === "garage" || c.type === "aussenparkplatz" ? Car : Box;
                          return (
                            <span key={c.id} className="inline-flex items-center gap-1 text-xs bg-background border rounded-full px-2 py-1">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                              {c.number}
                              <span className="text-muted-foreground">· {UNIT_TYPE_LABEL[c.type] ?? c.type}{c.rent ? ` · ${formatCHF(c.rent)}` : ""}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                    {o.property_id && (
                      <Button variant="ghost" size="sm" onClick={() => setManageUnit({ propertyId: o.property_id!, unitId: o.unit_id, label: `${o.property} · ${o.unit}` })}>
                        <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Garage/Keller verwalten
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zahlungen */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Zahlungen</CardTitle></CardHeader>
          <CardContent>
            {(data?.payments.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Keine Zahlungen.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {data!.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{new Date(p.due_date).toLocaleDateString("de-CH")}</span>
                    <span className="font-medium">{formatCHF(Number(p.amount))}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${payStatusBadge(p.status)}`}>{payStatusLabel(p.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dokumente */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Dokumente</CardTitle></CardHeader>
          <CardContent>
            {(data?.documents.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Keine Dokumente.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {data!.documents.map((d: any) => (
                  <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between py-2 px-2 hover:bg-secondary/30 rounded-lg border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{docTypeLabel(d.document_type)} · {new Date(d.created_at).toLocaleDateString("de-CH")}</p>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {t && (
        <TenantEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          tenant={t}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["pm-tenant-360", tenantId] })}
        />
      )}
      {manageUnit && (
        <UnitManageDialog
          open={!!manageUnit}
          onOpenChange={(o) => { if (!o) setManageUnit(null); }}
          propertyId={manageUnit.propertyId}
          unitId={manageUnit.unitId}
          unitLabel={manageUnit.label}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ["pm-tenant-360", tenantId] })}
        />
      )}
    </PropertyManagementLayout>
  );
};

export default TenantDetail;
