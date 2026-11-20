// Abo-/Plan-Logik: Pläne laden, aktives Abo, Feature-Flags und Preisberechnung.
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

// Alle Funktionen, die über Pläne gesteuert werden.
export type FeatureKey =
  | "properties" | "tenants" | "contracts" | "finances" | "documents" | "contract_pdf"
  | "accounting" | "dunning" | "utility_billing" | "listings"
  | "bank_sync" | "ai_booking" | "open_items" | "api";

export interface Plan {
  code: string;
  name: string;
  sort_order: number;
  base_fee: number;
  price_per_unit: number;
  included_units: number | null;   // null = unbegrenzt
  max_users: number | null;
  features: Record<string, boolean | string>;
  highlight: boolean;
}

export interface Subscription {
  plan_code: string;
  billing_period: string;
  status: string;              // trial | active | past_due | canceled
  trial_ends_at: string | null;
}

// Lesbare Namen für die Feature-Matrix (Reihenfolge = Anzeige).
export const FEATURE_LABELS: { key: FeatureKey; label: string }[] = [
  { key: "properties", label: "Liegenschaften, Mieter & Verträge" },
  { key: "finances", label: "Mietzins & Finanzen" },
  { key: "contract_pdf", label: "Mietvertrag-PDF & Dokumente" },
  { key: "accounting", label: "Buchhaltung (doppelte Buchführung)" },
  { key: "open_items", label: "Offene Posten & Zahlungs-Ampel" },
  { key: "dunning", label: "Mahnwesen inkl. PDF" },
  { key: "utility_billing", label: "Nebenkostenabrechnung" },
  { key: "listings", label: "Inserate & Portal-Veröffentlichung" },
  { key: "bank_sync", label: "Bankanbindung (camt/EBICS)" },
  { key: "ai_booking", label: "KI-Buchungserkennung" },
  { key: "api", label: "API & eigene Schnittstellen" },
];

export async function getPlans(): Promise<Plan[]> {
  const { data } = await sb.from("pm_plans").select("*").order("sort_order");
  return (data ?? []) as Plan[];
}

export async function getSubscription(): Promise<Subscription | null> {
  const { data } = await sb.from("pm_subscription").select("*").eq("id", 1).maybeSingle();
  return (data ?? null) as Subscription | null;
}

export async function setPlan(planCode: string, billingPeriod: "monthly" | "yearly" = "monthly"): Promise<void> {
  // Noch ohne Zahlung: Plan wird vorgemerkt; Status bleibt (Trial/aktiv).
  const { error } = await sb.from("pm_subscription")
    .update({ plan_code: planCode, billing_period: billingPeriod })
    .eq("id", 1);
  if (error) throw error;
}

// Aktuelle Anzahl Verwaltungseinheiten (Wohnung/Gewerbe zählen; PP/Keller nicht).
export async function getUnitCount(): Promise<number> {
  const { count } = await sb.from("pm_units")
    .select("id", { count: "exact", head: true })
    .in("unit_type", ["wohnung", "gewerbe"]);
  return Number(count ?? 0);
}

// Monatspreis für einen Plan bei n Einheiten (Jahresabo = 2 Monate gratis).
export function monthlyPrice(plan: Plan, units: number, period: "monthly" | "yearly" = "monthly"): number {
  const billable = plan.included_units != null ? Math.max(0, units) : units;
  const gross = plan.base_fee + plan.price_per_unit * billable;
  return period === "yearly" ? gross * 10 / 12 : gross; // 12 zahlen, 10 effektiv
}

export function hasFeature(plan: Plan | null | undefined, key: FeatureKey): boolean {
  if (!plan) return true; // ohne geladenen Plan nicht sperren (fail-open)
  return plan.features?.[key] === true;
}

// trial-Resttage
export function trialDaysLeft(sub: Subscription | null): number | null {
  if (!sub?.trial_ends_at || sub.status !== "trial") return null;
  const ms = new Date(sub.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}
