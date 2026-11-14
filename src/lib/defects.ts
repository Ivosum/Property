// Mängel-Verknüpfung: erfassen, erledigen und – bei Reparaturkosten –
// direkt als Aufwand in der Buchhaltung der Liegenschaft verbuchen.
import { supabase } from "@/integrations/supabase/client";
import { getAccounts, createEntry } from "./accounting";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface DefectInput {
  unit_id: string;
  title: string;
  description: string;
  priority: string;      // low | normal | urgent
  reported_by_name?: string | null;
  tenant_id?: string | null;
}

export async function createDefect(d: DefectInput) {
  const { data, error } = await sb.from("pm_defects").insert({
    unit_id: d.unit_id,
    title: d.title,
    description: d.description,
    priority: d.priority,
    reported_by_name: d.reported_by_name ?? null,
    tenant_id: d.tenant_id ?? null,
    status: "open",
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updateDefectStatus(defectId: string, status: string) {
  const patch: any = { status };
  if (status === "resolved" || status === "closed") patch.resolved_at = new Date().toISOString();
  const { error } = await sb.from("pm_defects").update(patch).eq("id", defectId);
  if (error) throw error;
}

/**
 * Mangel als erledigt markieren und – falls Kosten angefallen sind – direkt
 * als Aufwand (Konto 6400 Unterhalt & Reparaturen) gegen Bank (1020) in der
 * Buchhaltung der zugehörigen Liegenschaft verbuchen. So entsteht keine
 * Doppelerfassung zwischen Mängel und Buchhaltung.
 */
export async function resolveDefectWithCost(params: {
  defectId: string;
  unitId: string;
  title: string;
  cost: number;
  resolutionNotes?: string | null;
  bookExpense: boolean;
}): Promise<{ booked: boolean }> {
  // Mangel aktualisieren
  const { error: uErr } = await sb.from("pm_defects").update({
    status: "resolved",
    resolved_at: new Date().toISOString(),
    cost: params.cost || null,
    resolution_notes: params.resolutionNotes ?? null,
  }).eq("id", params.defectId);
  if (uErr) throw uErr;

  if (!params.bookExpense || !params.cost || params.cost <= 0) return { booked: false };

  // Liegenschaft über die Einheit ermitteln
  const { data: unit, error: unitErr } = await sb.from("pm_units")
    .select("property_id").eq("id", params.unitId).single();
  if (unitErr || !unit) return { booked: false };

  const accounts = await getAccounts(unit.property_id);
  const expense = accounts.find((a) => a.code === "6400");   // Unterhalt & Reparaturen
  const bank = accounts.find((a) => a.code === "1020");      // Bank
  if (!expense || !bank) return { booked: false };

  await createEntry({
    property_id: unit.property_id,
    entry_date: new Date().toISOString().slice(0, 10),
    description: `Reparatur: ${params.title}`,
    source: "manual",
    lines: [
      { account_id: expense.id, debit: params.cost, credit: 0, line_text: params.resolutionNotes ?? "Mangelbehebung" },
      { account_id: bank.id, debit: 0, credit: params.cost, line_text: "Zahlung" },
    ],
  });
  return { booked: true };
}
