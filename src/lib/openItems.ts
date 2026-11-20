// Offenpostenbuchhaltung (Debitoren) mit Altersstruktur (Aging) und
// Zahlungs-Ampel (Contact Health). Baut auf pm_payments auf: offene
// (pending/overdue) Zahlungen je Mieter, gruppiert nach Liegenschaft,
// mit Fälligkeits-Altersklassen und einem Risiko-Score aus dem
// Zahlungsverhalten.

import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

const MS_DAY = 86400000;
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / MS_DAY);

export type HealthColor = "green" | "amber" | "red";

export interface OpenItem {
  paymentId: string;
  dueDate: string;
  amount: number;        // inkl. aufgelaufener Mahngebühren
  daysOverdue: number;   // 0 wenn noch nicht fällig
  reminderStage: number;
  bucket: "current" | "d30" | "d60" | "d90";
}

export interface DebtorOpenItems {
  tenantId: string;
  tenantName: string;
  email: string | null;
  phone: string | null;
  propertyId: string | null;
  propertyName: string;
  unit: string;
  items: OpenItem[];
  total: number;
  oldestDays: number;
  // Aging-Summen
  current: number; d30: number; d60: number; d90: number;
  health: HealthColor;
  healthReason: string;
}

export interface AgingSummary {
  total: number;
  current: number; d30: number; d60: number; d90: number;
  debtorCount: number;
  green: number; amber: number; red: number;
}

// Altersklassen: current = noch nicht fällig, d30 = 1–30 Tage,
// d60 = 31–60 Tage, d90 = über 60 Tage überfällig.
const bucketOf = (daysOverdue: number): OpenItem["bucket"] =>
  daysOverdue <= 0 ? "current" : daysOverdue <= 30 ? "d30" : daysOverdue <= 60 ? "d60" : "d90";

// Zahlungs-Ampel: grün = alles im Soll / nur leicht; gelb = überfällig < 30 Tage
// oder gemahnt; rot = > 30 Tage überfällig, Mahnung/Betreibung, oder hoher Betrag.
function healthOf(items: OpenItem[], history: { late: number; total: number }): { color: HealthColor; reason: string } {
  const oldest = items.reduce((m, i) => Math.max(m, i.daysOverdue), 0);
  const maxStage = items.reduce((m, i) => Math.max(m, i.reminderStage), 0);
  if (maxStage >= 3 || oldest > 60) return { color: "red", reason: oldest > 60 ? `${oldest} Tage überfällig` : "Mahnung/Betreibung läuft" };
  if (oldest > 0 || maxStage > 0 || (history.total > 0 && history.late / history.total > 0.3))
    return { color: "amber", reason: oldest > 0 ? `${oldest} Tage überfällig` : maxStage > 0 ? "gemahnt" : "wiederholt verspätet" };
  return { color: "green", reason: "pünktlich" };
}

/**
 * Offene Posten je Debitor. Optional auf eine Liegenschaft eingeschränkt.
 */
export async function getOpenItems(propertyId?: string): Promise<{ debtors: DebtorOpenItems[]; summary: AgingSummary }> {
  const [{ data: payments }, { data: tenants }, { data: contracts }, { data: units }, { data: props }] = await Promise.all([
    sb.from("pm_payments").select("id, tenant_id, contract_id, amount, due_date, status, reminder_stage, reminder_fees, paid_date"),
    sb.from("pm_tenants").select("id, first_name, last_name, email, phone"),
    sb.from("pm_contracts").select("id, unit_id"),
    sb.from("pm_units").select("id, unit_number, floor_label, property_id"),
    sb.from("pm_properties").select("id, name"),
  ]);

  const tenantById = new Map((tenants ?? []).map((t: any) => [t.id, t]));
  const unitById = new Map((units ?? []).map((u: any) => [u.id, u]));
  const contractById = new Map((contracts ?? []).map((c: any) => [c.id, c]));
  const propName = new Map((props ?? []).map((p: any) => [p.id, p.name]));

  // Zahlungs-Historie je Mieter (für Ampel): Anteil verspätet bezahlter
  const hist = new Map<string, { late: number; total: number }>();
  (payments ?? []).forEach((p: any) => {
    if (p.status === "paid") {
      const h = hist.get(p.tenant_id) ?? { late: 0, total: 0 };
      h.total++;
      if (p.paid_date && new Date(p.paid_date) > new Date(new Date(p.due_date).getTime() + 5 * MS_DAY)) h.late++;
      hist.set(p.tenant_id, h);
    }
  });

  // offene Posten gruppieren je Mieter
  const byTenant = new Map<string, DebtorOpenItems>();
  (payments ?? []).filter((p: any) => p.status === "pending" || p.status === "overdue").forEach((p: any) => {
    const c = contractById.get(p.contract_id);
    const u = c ? unitById.get(c.unit_id) : undefined;
    const pid = u?.property_id ?? null;
    if (propertyId && pid !== propertyId) return;

    const t = tenantById.get(p.tenant_id);
    const name = t ? [t.first_name, t.last_name].filter(Boolean).join(" ") || "Unbenannt" : "Unbekannt";
    const key = p.tenant_id;
    const d = byTenant.get(key) ?? {
      tenantId: key, tenantName: name, email: t?.email ?? null, phone: t?.phone ?? null,
      propertyId: pid, propertyName: pid ? (propName.get(pid) ?? "Liegenschaft") : "Ohne Zuordnung",
      unit: u ? [u.floor_label, u.unit_number].filter(Boolean).join(" ") : "",
      items: [], total: 0, oldestDays: 0, current: 0, d30: 0, d60: 0, d90: 0,
      health: "green" as HealthColor, healthReason: "",
    };
    const dov = Math.max(0, daysSince(p.due_date));
    const amount = Number(p.amount) + Number(p.reminder_fees ?? 0);
    const bucket = bucketOf(dov);
    const item: OpenItem = { paymentId: p.id, dueDate: p.due_date, amount, daysOverdue: dov, reminderStage: Number(p.reminder_stage ?? 0), bucket };
    d.items.push(item);
    d.total += amount;
    d.oldestDays = Math.max(d.oldestDays, dov);
    d[bucket] += amount;
    byTenant.set(key, d);
  });

  const debtors = [...byTenant.values()].map((d) => {
    const h = healthOf(d.items, hist.get(d.tenantId) ?? { late: 0, total: 0 });
    d.health = h.color; d.healthReason = h.reason;
    d.items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return d;
  }).sort((a, b) => b.oldestDays - a.oldestDays || b.total - a.total);

  const summary: AgingSummary = {
    total: debtors.reduce((s, d) => s + d.total, 0),
    current: debtors.reduce((s, d) => s + d.current, 0),
    d30: debtors.reduce((s, d) => s + d.d30, 0),
    d60: debtors.reduce((s, d) => s + d.d60, 0),
    d90: debtors.reduce((s, d) => s + d.d90, 0),
    debtorCount: debtors.length,
    green: debtors.filter((d) => d.health === "green").length,
    amber: debtors.filter((d) => d.health === "amber").length,
    red: debtors.filter((d) => d.health === "red").length,
  };

  return { debtors, summary };
}

// Ampel je Mieter (für die Mieter-Liste) – kompakt, über alle Liegenschaften.
export async function getTenantHealth(): Promise<Map<string, { color: HealthColor; reason: string }>> {
  const { debtors } = await getOpenItems();
  const map = new Map<string, { color: HealthColor; reason: string }>();
  debtors.forEach((d) => map.set(d.tenantId, { color: d.health, reason: d.healthReason }));
  return map;
}
