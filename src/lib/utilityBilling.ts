// Nebenkosten-Abrechnungslogik: zieht die Nebenkosten aus der Buchhaltung,
// verteilt sie nach Wohnfläche (m²) auf die Mieter und verrechnet die Akonto-Zahlungen.

import { supabase } from "@/integrations/supabase/client";
import { getAccounts, getJournal, computeBalances, type Account } from "./accounting";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

// Standard-Nebenkostenkonten (Kontocodes aus dem Standard-Kontenplan)
export const DEFAULT_NK_CODES = ["6420", "6430", "6440", "6570"];

export interface CostLine {
  account_id: string;
  code: string;
  name: string;
  amount: number;
  included: boolean; // ob in dieser Abrechnung berücksichtigt
  isDefault: boolean;
}

export interface TenantShare {
  contract_id: string;
  tenant_id: string;
  unit_id: string;
  tenant_name: string;
  unit_number: string;
  area_sqm: number;
  share_pct: number;      // Anteil an der Gesamtfläche
  months: number;          // Monate der Periode mit aktivem Vertrag
  cost_share: number;      // zugeteilte Nebenkosten
  advance_paid: number;    // geleistete Akonto (utilities_advance * months)
  balance: number;         // advance_paid - cost_share  (positiv = Guthaben, negativ = Nachzahlung)
}

export interface BillingPreview {
  availableCosts: CostLine[];
  totalCost: number;
  totalArea: number;
  tenants: TenantShare[];
}

const monthsBetween = (startISO: string, endISO: string) => {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  return Math.max(0, m);
};

// Überlappung zwischen Mietdauer und Abrechnungsperiode in Monaten
const overlapMonths = (
  periodStart: string, periodEnd: string,
  contractStart: string | null, contractEnd: string | null
) => {
  const ps = new Date(periodStart).getTime();
  const pe = new Date(periodEnd).getTime();
  const cs = contractStart ? new Date(contractStart).getTime() : ps;
  const ce = contractEnd ? new Date(contractEnd).getTime() : pe;
  const start = Math.max(ps, cs);
  const end = Math.min(pe, ce);
  if (end < start) return 0;
  return monthsBetween(new Date(start).toISOString().slice(0, 10), new Date(end).toISOString().slice(0, 10));
};

export async function buildBillingPreview(params: {
  propertyId: string;
  periodStart: string; // ISO
  periodEnd: string;   // ISO
  includedAccountIds?: string[]; // überschreibt die Standardauswahl
  distribution?: "area" | "per_unit";
}): Promise<BillingPreview> {
  const { propertyId, periodStart, periodEnd } = params;
  const distribution = params.distribution ?? "area";

  // 1) Kostenkonten + Saldi im Zeitraum aus der Buchhaltung
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
    return {
      account_id: b.account.id,
      code: b.account.code,
      name: b.account.name,
      amount: b.balance,
      included,
      isDefault,
    };
  });

  const totalCost = availableCosts.filter((c) => c.included).reduce((s, c) => s + c.amount, 0);

  // 2) Mieter mit aktivem/überlappendem Vertrag + Wohnfläche
  const [{ data: contracts }, { data: units }, { data: tenants }] = await Promise.all([
    sb.from("pm_contracts").select("id, tenant_id, unit_id, start_date, end_date, status, utilities_advance"),
    sb.from("pm_units").select("id, unit_number, property_id, living_area_sqm, utilities_advance"),
    sb.from("pm_tenants").select("id, first_name, last_name"),
  ]);

  const unitById = new Map<string, any>((units ?? []).map((u: any) => [u.id, u]));
  const tenantById = new Map<string, any>((tenants ?? []).map((t: any) => [t.id, t]));

  // nur Verträge dieser Liegenschaft mit Überlappung
  const relevant = (contracts ?? []).filter((c: any) => {
    const u = unitById.get(c.unit_id);
    if (!u || u.property_id !== propertyId) return false;
    return overlapMonths(periodStart, periodEnd, c.start_date, c.end_date) > 0;
  });

  // Gesamtfläche aller abgerechneten Einheiten
  const totalArea = relevant.reduce((s: number, c: any) => {
    const u = unitById.get(c.unit_id);
    return s + (Number(u?.living_area_sqm) || 0);
  }, 0);

  const count = relevant.length;

  const tenantShares: TenantShare[] = relevant.map((c: any) => {
    const u = unitById.get(c.unit_id);
    const t = tenantById.get(c.tenant_id);
    const area = Number(u?.living_area_sqm) || 0;
    const months = overlapMonths(periodStart, periodEnd, c.start_date, c.end_date);

    let share_pct = 0;
    if (distribution === "area") {
      share_pct = totalArea > 0 ? area / totalArea : 0;
    } else {
      share_pct = count > 0 ? 1 / count : 0;
    }
    const cost_share = totalCost * share_pct;

    const advanceMonthly = Number(c.utilities_advance) || Number(u?.utilities_advance) || 0;
    const advance_paid = advanceMonthly * months;
    const balance = advance_paid - cost_share;

    return {
      contract_id: c.id,
      tenant_id: c.tenant_id,
      unit_id: c.unit_id,
      tenant_name: [t?.first_name, t?.last_name].filter(Boolean).join(" ") || "Unbenannt",
      unit_number: u?.unit_number ?? "–",
      area_sqm: area,
      share_pct,
      months,
      cost_share,
      advance_paid,
      balance,
    };
  });

  return { availableCosts, totalCost, totalArea, tenants: tenantShares };
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
    months: t.months,
  }));
  const { error: iErr } = await sb.from("pm_utility_bill_items").insert(items);
  if (iErr) {
    await sb.from("pm_utility_bills").delete().eq("id", bill.id);
    throw iErr;
  }
  return bill.id as string;
}
