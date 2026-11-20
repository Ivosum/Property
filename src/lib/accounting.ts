// Datenzugriffsschicht für die Liegenschaftsbuchhaltung (doppelte Buchführung).
// Kapselt die Supabase-Calls mit eigenen Typen, da die auto-generierte
// types.ts die neuen Tabellen (pm_accounts, pm_journal_entries, pm_journal_lines)
// noch nicht kennt.

import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface Account {
  id: string;
  property_id: string;
  code: string;
  name: string;
  type: AccountType;
  is_system: boolean;
  sort_order: number;
}

export interface JournalLine {
  id?: string;
  entry_id?: string;
  account_id: string;
  debit: number;
  credit: number;
  line_text?: string | null;
  sort_order?: number;
}

export interface JournalEntry {
  id: string;
  property_id: string;
  entry_date: string;
  description: string;
  reference: string | null;
  document_id: string | null;
  source: string;
  source_id: string | null;
  status: "draft" | "posted";
  created_at: string;
}

export const accountTypeLabels: Record<AccountType, string> = {
  asset: "Aktiven",
  liability: "Passiven",
  equity: "Eigenkapital",
  income: "Ertrag",
  expense: "Aufwand",
};

export const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", minimumFractionDigits: 2 }).format(n);

// --- Kontenplan ---
export async function getAccounts(propertyId: string): Promise<Account[]> {
  const { data, error } = await sb
    .from("pm_accounts")
    .select("id, property_id, code, name, type, is_system, sort_order")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Account[];
}

// --- Kontenplan bearbeiten ---
export async function createAccount(params: {
  property_id: string; code: string; name: string; type: AccountType; sort_order?: number;
}): Promise<string> {
  const { data, error } = await sb.from("pm_accounts").insert({
    property_id: params.property_id, code: params.code.trim(), name: params.name.trim(),
    type: params.type, is_system: false, sort_order: params.sort_order ?? 500,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updateAccount(id: string, patch: { code?: string; name?: string; type?: AccountType; sort_order?: number }): Promise<void> {
  const clean: Record<string, unknown> = {};
  if (patch.code != null) clean.code = patch.code.trim();
  if (patch.name != null) clean.name = patch.name.trim();
  if (patch.type != null) clean.type = patch.type;
  if (patch.sort_order != null) clean.sort_order = patch.sort_order;
  const { error } = await sb.from("pm_accounts").update(clean).eq("id", id);
  if (error) throw error;
}

// Löscht ein Konto. Verweigert, wenn bereits Buchungszeilen darauf existieren.
export async function deleteAccount(id: string): Promise<void> {
  const { count } = await sb.from("pm_journal_lines").select("id", { count: "exact", head: true }).eq("account_id", id);
  if ((count ?? 0) > 0) throw new Error("Konto hat Buchungen und kann nicht gelöscht werden.");
  const { error } = await sb.from("pm_accounts").delete().eq("id", id);
  if (error) throw error;
}

// --- Journal mit Zeilen ---
export interface EntryWithLines extends JournalEntry {
  lines: (JournalLine & { account?: Account })[];
}

export async function getJournal(
  propertyId: string,
  opts?: { from?: string; to?: string }
): Promise<EntryWithLines[]> {
  let q = sb
    .from("pm_journal_entries")
    .select("id, property_id, entry_date, description, reference, document_id, source, source_id, status, created_at")
    .eq("property_id", propertyId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts?.from) q = q.gte("entry_date", opts.from);
  if (opts?.to) q = q.lte("entry_date", opts.to);
  const { data: entries, error } = await q;
  if (error) throw error;

  const list = (entries ?? []) as JournalEntry[];
  if (list.length === 0) return [];

  const ids = list.map((e) => e.id);
  const [{ data: lines }, accounts] = await Promise.all([
    sb.from("pm_journal_lines").select("id, entry_id, account_id, debit, credit, line_text, sort_order").in("entry_id", ids),
    getAccounts(propertyId),
  ]);
  const accById = new Map(accounts.map((a) => [a.id, a]));
  const byEntry = new Map<string, (JournalLine & { account?: Account })[]>();
  (lines ?? []).forEach((l: JournalLine) => {
    const arr = byEntry.get(l.entry_id!) ?? [];
    arr.push({ ...l, account: accById.get(l.account_id) });
    byEntry.set(l.entry_id!, arr);
  });
  return list.map((e) => ({
    ...e,
    lines: (byEntry.get(e.id) ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }));
}

// --- Buchung erstellen (atomar: Eintrag + Zeilen) ---
export async function createEntry(params: {
  property_id: string;
  entry_date: string;
  description: string;
  reference?: string | null;
  document_id?: string | null;
  source?: string;
  lines: JournalLine[];
}): Promise<string> {
  // Soll = Haben prüfen
  const totalDebit = params.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = params.lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new Error("Soll und Haben müssen ausgeglichen sein.");
  }

  const { data: authData } = await sb.auth.getUser();
  const { data: entry, error } = await sb
    .from("pm_journal_entries")
    .insert({
      property_id: params.property_id,
      entry_date: params.entry_date,
      description: params.description,
      reference: params.reference ?? null,
      document_id: params.document_id ?? null,
      source: params.source ?? "manual",
      status: "posted",
      created_by: authData?.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const rows = params.lines.map((l, i) => ({
    entry_id: entry.id,
    account_id: l.account_id,
    debit: l.debit || 0,
    credit: l.credit || 0,
    line_text: l.line_text ?? null,
    sort_order: i,
  }));
  const { error: lErr } = await sb.from("pm_journal_lines").insert(rows);
  if (lErr) {
    // Eintrag wieder entfernen, damit keine unvollständige Buchung bleibt
    await sb.from("pm_journal_entries").delete().eq("id", entry.id);
    throw lErr;
  }
  return entry.id as string;
}

export async function deleteEntry(entryId: string): Promise<void> {
  const { error } = await sb.from("pm_journal_entries").delete().eq("id", entryId);
  if (error) throw error;
}

// --- Saldi je Konto (für Bilanz/Erfolgsrechnung und Kennzahlen) ---
export interface AccountBalance {
  account: Account;
  debit: number;
  credit: number;
  balance: number; // Ertrag/Passiven: credit-debit positiv; Aufwand/Aktiven: debit-credit positiv
}

export function computeBalances(accounts: Account[], entries: EntryWithLines[]): AccountBalance[] {
  const agg = new Map<string, { debit: number; credit: number }>();
  entries.forEach((e) =>
    e.lines.forEach((l) => {
      const a = agg.get(l.account_id) ?? { debit: 0, credit: 0 };
      a.debit += Number(l.debit) || 0;
      a.credit += Number(l.credit) || 0;
      agg.set(l.account_id, a);
    })
  );
  return accounts.map((account) => {
    const a = agg.get(account.id) ?? { debit: 0, credit: 0 };
    const naturalCredit = account.type === "income" || account.type === "liability" || account.type === "equity";
    const balance = naturalCredit ? a.credit - a.debit : a.debit - a.credit;
    return { account, debit: a.debit, credit: a.credit, balance };
  });
}

export interface IncomeSummary {
  income: number;
  expense: number;
  result: number; // income - expense (Gewinn/Verlust)
}

export function computeIncomeStatement(balances: AccountBalance[]): IncomeSummary {
  const income = balances.filter((b) => b.account.type === "income").reduce((s, b) => s + b.balance, 0);
  const expense = balances.filter((b) => b.account.type === "expense").reduce((s, b) => s + b.balance, 0);
  return { income, expense, result: income - expense };
}
