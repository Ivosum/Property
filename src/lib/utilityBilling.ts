// Nebenkosten-Abrechnungslogik (taggenau).
// Zieht die Nebenkosten aus der Buchhaltung und verteilt sie nach
// Wohnfläche (m²) × belegten Tagen auf jeden Mieter, der die Einheit
// im Abrechnungszeitraum bewohnt hat. Mieterwechsel werden pro Periode
// einzeln abgerechnet; Leerstandstage tragen den Eigentümer.
// Nur Wohnungen/Gewerbe tragen Nebenkosten (Keller/Parkplätze nicht).

import { supabase } from "@/integrations/supabase/client";
import { getAccounts, getJournal, computeBalances } from "./accounting";
import { NK_RELEVANT_TYPES } from "./pmData";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

// Standard-Nebenkostenkonten (Kontocodes aus dem Standard-Kontenplan)
export const DEFAULT_NK_CODES = ["6420", "6430", "6440", "6570"];

export interface CostLine {
  account_id: string;
  code: string;
  name: string;
  amount: number;
  included: boolean;
  isDefault: boolean;
}

export interface TenantShare {
  contract_id: string;
  tenant_id: string;
  unit_id: string;
  tenant_name: string;
  unit_number: string;
  area_sqm: number;
  days: number;           // belegte Tage im Zeitraum
  period_label: string;   // z.B. "01.01.2025 – 31.07.2025"
  share_pct: number;      // Anteil an der Gesamt-Gewichtung (Fläche×Tage)
  cost_share: number;     // zugeteilte Nebenkosten
  advance_paid: number;   // Akonto (monatliches Akonto × belegte Monate, taggenau)
  balance: number;        // advance_paid - cost_share
}

export interface BillingPreview {
  availableCosts: CostLine[];
  totalCost: number;
  totalArea: number;        // Fläche der NK-relevanten Einheiten
  periodDays: number;
  vacancyCost: number;      // Leerstandsanteil (zu Lasten Eigentümer)
  tenants: TenantShare[];
}

const MS_DAY = 86400000;
const toDate = (iso: string) => new Date(iso + (iso.length <= 10 ? "T00:00:00" : ""));
const fmt = (d: Date) => d.toLocaleDateString("de-CH");

// Anzahl Tage im Überlappungsintervall [max(starts), min(ends)] inkl. Endtag
function overlapDays(
  pStart: Date, pEnd: Date,
  cStart: Date, cEnd: Date,
): { days: number; from: Date; to: Date } {
  const from = new Date(Math.max(pStart.getTime(), cStart.getTime()));
  const to = new Date(Math.min(pEnd.getTime(), cEnd.getTime()));
  if (to.getTime() < from.getTime()) return { days: 0, from, to };
  const days = Math.round((to.getTime() - from.getTime()) / MS_DAY) + 1; // inkl. Endtag
  return { days, from, to };
}

export async function buildBillingPreview(params: {
  propertyId: string;
  periodStart: string; // ISO
  periodEnd: string;   // ISO
  includedAccountIds?: string[];
  distribution?: "area" | "per_unit";
}): Promise<BillingPreview> {
  const { propertyId, periodStart, periodEnd } = params;
  const distribution = params.distribution ?? "area";

  const pStart = toDate(periodStart);
  const pEnd = toDate(periodEnd);
  const periodDays = Math.max(1, Math.round((pEnd.getTime() - pStart.getTime()) / MS_DAY) + 1);

  // 1) Kostenkonten + Saldi im Zeitraum
  const [accounts, entries] = await Promise.all([
    getAccounts(propertyId),
    getJournal(propertyId, { from: periodStart, to: periodEnd }),
  ]);
  const balances = computeBalances(accounts, entries);
  const expenseBalances = balances.filter((b) => b.account.type === "expense");

  const availableCosts: CostLine[] = expenseBalances.map((b) => {
    const isDefault = DEFAULT_NK_CODES.includes(b.account.code);
    const included = params.includedAccountIds
      ? params.includedAccountIds.includes(b.account.id)
      : isDefault;
    return { account_id: b.account.id, code: b.account.code, name: b.account.name, amount: b.balance, included, isDefault };
  });
  const totalCost = availableCosts.filter((c) => c.included).reduce((s, c) => s + c.amount, 0);

  // 2) Einheiten + Verträge
  const [{ data: units }, { data: contracts }, { data: tenants }] = await Promise.all([
    sb.from("pm_units").select("id, unit_number, floor_label, property_id, living_area_sqm, utilities_advance, unit_type"),
    sb.from("pm_contracts").select("id, tenant_id, unit_id, start_date, end_date, status, utilities_advance"),
    sb.from("pm_tenants").select("id, first_name, last_name"),
  ]);

  const unitById = new Map<string, any>((units ?? []).map((u: any) => [u.id, u]));
  const tenantById = new Map<string, any>((tenants ?? []).map((t: any) => [t.id, t]));

  // NK-relevante Einheiten dieser Liegenschaft (Wohnung/Gewerbe)
  const nkUnits = (units ?? []).filter(
    (u: any) => u.property_id === propertyId && NK_RELEVANT_TYPES.includes(u.unit_type ?? "wohnung"),
  );
  const totalArea = nkUnits.reduce((s: number, u: any) => s + (Number(u.living_area_sqm) || 0), 0);

  // Gesamt-Gewichtung über die VOLLE Periode (Fläche × alle Tage) – so bleibt
  // der Leerstandsanteil automatisch beim Eigentümer.
  let totalWeight = 0;
  if (distribution === "area") {
    totalWeight = nkUnits.reduce((s: number, u: any) => s + (Number(u.living_area_sqm) || 0) * periodDays, 0);
  } else {
    totalWeight = nkUnits.length * periodDays; // je Einheit gleich gewichtet
  }

  // 3) Mieter-Slices (nur auf NK-relevanten Einheiten, mit Überlappung)
  const nkUnitIds = new Set(nkUnits.map((u: any) => u.id));
  const tenantShares: TenantShare[] = [];

  for (const c of (contracts ?? [])) {
    if (!nkUnitIds.has(c.unit_id)) continue;            // Keller/Parking tragen keine NK
    if (c.status !== "active" && c.status !== "terminated" && c.status !== "expired") continue;
    const u = unitById.get(c.unit_id);
    if (!u) continue;

    const cStart = toDate(c.start_date);
    const cEnd = c.end_date ? toDate(c.end_date) : pEnd;
    const { days, from, to } = overlapDays(pStart, pEnd, cStart, cEnd);
    if (days <= 0) continue;

    const area = Number(u.living_area_sqm) || 0;
    const weight = distribution === "area" ? area * days : (days / periodDays);
    const share_pct = totalWeight > 0 ? weight / totalWeight : 0;
    const cost_share = totalCost * share_pct;

    const advanceMonthly = Number(c.utilities_advance) || Number(u.utilities_advance) || 0;
    const advance_paid = advanceMonthly * (days / (365 / 12)); // taggenau auf Monatsbasis
    const t = tenantById.get(c.tenant_id);

    tenantShares.push({
      contract_id: c.id,
      tenant_id: c.tenant_id,
      unit_id: c.unit_id,
      tenant_name: [t?.first_name, t?.last_name].filter(Boolean).join(" ") || "Unbenannt",
      unit_number: [u.floor_label, u.unit_number].filter(Boolean).join(" ") || u.unit_number,
      area_sqm: area,
      days,
      period_label: `${fmt(from)} – ${fmt(to)}`,
      share_pct,
      cost_share,
      advance_paid,
      balance: advance_paid - cost_share,
    });
  }

  // nach Einheit, dann Startdatum sortieren
  tenantShares.sort((a, b) => a.unit_number.localeCompare(b.unit_number, "de") || a.period_label.localeCompare(b.period_label));

  const allocated = tenantShares.reduce((s, t) => s + t.cost_share, 0);
  const vacancyCost = Math.max(0, totalCost - allocated);

  return { availableCosts, totalCost, totalArea, periodDays, vacancyCost, tenants: tenantShares };
}

// Abrechnung speichern (pm_utility_bills + items)
export async function saveBilling(params: {
  propertyId: string;
  year: number;
  periodStart: string;
  periodEnd: string;
  distribution: "area" | "per_unit";
  totalCost: number;
  totalArea: number;
  costBreakdown: { code: string; name: string; amount: number }[];
  tenants: TenantShare[];
}): Promise<string> {
  const { data: authData } = await sb.auth.getUser();
  const { data: bill, error } = await sb
    .from("pm_utility_bills")
    .insert({
      property_id: params.propertyId,
      billing_year: params.year,
      total_costs: params.totalCost,
      status: "created",
      period_start: params.periodStart,
      period_end: params.periodEnd,
      distribution: params.distribution,
      cost_breakdown: params.costBreakdown,
      total_area_sqm: params.totalArea,
      created_by: authData?.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const items = params.tenants.map((t) => ({
    utility_bill_id: bill.id,
    contract_id: t.contract_id,
    tenant_id: t.tenant_id,
    unit_id: t.unit_id,
    calculated_costs: Number(t.cost_share.toFixed(2)),
    total_advance_paid: Number(t.advance_paid.toFixed(2)),
    balance: Number(t.balance.toFixed(2)),
    area_sqm: t.area_sqm,
    share_pct: Number((t.share_pct * 100).toFixed(3)),
    months: Math.round((t.days / (365 / 12)) * 10) / 10,
  }));
  const { error: iErr } = await sb.from("pm_utility_bill_items").insert(items);
  if (iErr) {
    await sb.from("pm_utility_bills").delete().eq("id", bill.id);
    throw iErr;
  }
  return bill.id as string;
}
