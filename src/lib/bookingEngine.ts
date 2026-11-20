// Klassifizierungs-Engine für Bankbewegungen -> Buchungskonto.
// Reihenfolge: 1) gelernte Regeln (pm_booking_rules), 2) Heuristik auf
// Auftraggeber/Text, 3) (optional) KI über Edge-Function. Erzeugt einen
// Buchungsvorschlag (pm_booking_suggestions) mit Konto, Konfidenz, Begründung.
//
// Konten (Standard-Kontenplan je Liegenschaft, siehe accounting-Migration):
//   Erträge  : 6000 Mietertrag, 6050 Nebenkostenertrag, 6090 Übriger Ertrag
//   Aufwände : 6400 Unterhalt & Reparaturen, 6420 Heizung/Energie,
//              6430 Wasser/Abwasser, 6440 Hauswartung/Reinigung,
//              6500 Versicherungen, 6510 Verwaltungshonorar,
//              6570 Gebühren/Abgaben, 6900 Übriger Aufwand
//   Bilanz   : 1020 Bank, 1100 Forderungen Mieter, 2300 Mietzinsdepots

import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface BankMovement {
  direction: "in" | "out";
  amount: number;              // positiv
  counterparty?: string | null;
  reference?: string | null;
  text?: string | null;        // remittance / Verwendungszweck
}

export interface Classification {
  accountCode: string;
  confidence: number;          // 0..1
  source: "rule" | "heuristic" | "ai" | "fallback";
  reasoning: string;
  matchField?: "counterparty" | "reference" | "text";
  matchPattern?: string;       // für das spätere Lernen
}

// --- Heuristik-Stichwörter je Aufwand/Ertrag-Konto ---
const KEYWORDS: { code: string; dir: "in" | "out"; words: string[]; label: string }[] = [
  // Erträge (Gutschriften)
  { code: "6000", dir: "in", label: "Mietertrag", words: ["miete", "mietzins", "mietzinszahlung", "nettomiete"] },
  { code: "6050", dir: "in", label: "Nebenkostenertrag", words: ["nebenkosten", "akonto", "heiz- und nebenkosten", "nk-akonto"] },
  // Aufwände (Belastungen)
  { code: "6420", dir: "out", label: "Heizung/Energie", words: ["heizöl", "heizoel", "gas", "erdgas", "fernwärme", "elektrizität", "ewz", "ckw", "energie", "strom", "brennstoff", "pellets"] },
  { code: "6430", dir: "out", label: "Wasser/Abwasser", words: ["wasser", "abwasser", "wasserversorgung", "kläranlage", "wasserwerk"] },
  { code: "6440", dir: "out", label: "Hauswartung/Reinigung", words: ["hauswart", "hauswartung", "reinigung", "gartenpflege", "schneeräumung", "umgebung", "entsorgung", "kehricht", "liftwartung", "lift", "aufzug", "wartung"] },
  { code: "6500", dir: "out", label: "Versicherungen", words: ["versicherung", "gebäudeversicherung", "haftpflicht", "assekuranz", "gvz", "axa", "mobiliar", "zurich", "helvetia", "allianz", "baloise"] },
  { code: "6510", dir: "out", label: "Verwaltungshonorar", words: ["verwaltung", "bewirtschaftung", "honorar", "verwaltungshonorar", "treuhand"] },
  { code: "6570", dir: "out", label: "Gebühren/Abgaben", words: ["gebühr", "gebühren", "abgabe", "abgaben", "steuer", "liegenschaftssteuer", "grundsteuer", "kaminfeger", "feuerwehr", "serafe", "billag"] },
  { code: "6400", dir: "out", label: "Unterhalt & Reparaturen", words: ["reparatur", "unterhalt", "sanitär", "elektriker", "maler", "handwerker", "service", "installation", "heizungsservice", "spengler", "schreiner", "renovation", "instandstellung"] },
];

const norm = (s?: string | null) => (s ?? "").toLowerCase();

// Gelernte Regeln laden (Liegenschaft + global), stärkere zuerst.
async function loadRules(propertyId: string) {
  const { data } = await sb.from("pm_booking_rules")
    .select("*")
    .or(`property_id.eq.${propertyId},property_id.is.null`)
    .order("hit_count", { ascending: false });
  return (data ?? []) as any[];
}

function applyRules(rules: any[], mv: BankMovement): Classification | null {
  const fields: Record<string, string> = {
    counterparty: norm(mv.counterparty),
    reference: norm(mv.reference),
    text: norm(mv.text),
  };
  for (const r of rules) {
    if (r.direction && r.direction !== mv.direction) continue;
    const hay = fields[r.match_field] ?? "";
    if (r.pattern && hay.includes(r.pattern)) {
      return {
        accountCode: r.account_code,
        confidence: Math.min(0.99, 0.8 + 0.03 * Number(r.hit_count ?? 1)),
        source: "rule",
        reasoning: `Gelernte Regel: „${r.pattern}" → Konto ${r.account_code} (${r.hit_count}× bestätigt)`,
        matchField: r.match_field,
        matchPattern: r.pattern,
      };
    }
  }
  return null;
}

function applyHeuristic(mv: BankMovement): Classification | null {
  const hay = `${norm(mv.counterparty)} ${norm(mv.text)} ${norm(mv.reference)}`;
  let best: { code: string; word: string; label: string } | null = null;
  for (const k of KEYWORDS) {
    if (k.dir !== mv.direction) continue;
    for (const w of k.words) {
      if (hay.includes(w)) { best = { code: k.code, word: w, label: k.label }; break; }
    }
    if (best) break;
  }
  if (best) {
    return {
      accountCode: best.code,
      confidence: 0.7,
      source: "heuristic",
      reasoning: `Stichwort „${best.word}" deutet auf ${best.label} (${best.code})`,
      matchField: norm(mv.counterparty).includes(best.word) ? "counterparty" : "text",
      matchPattern: best.word,
    };
  }
  return null;
}

// Fallback-Konto, wenn nichts greift (Übriger Ertrag / Übriger Aufwand).
function fallback(mv: BankMovement): Classification {
  return {
    accountCode: mv.direction === "in" ? "6090" : "6900",
    confidence: 0.3,
    source: "fallback",
    reasoning: "Keine eindeutige Zuordnung – bitte Konto prüfen.",
  };
}

/**
 * Klassifiziert eine Bankbewegung. Versucht Regeln, dann Heuristik, dann
 * (optional) KI über die Edge-Function 'classify-booking'. Gibt immer ein
 * Ergebnis zurück (Fallback mit niedriger Konfidenz).
 */
export async function classifyMovement(
  propertyId: string,
  mv: BankMovement,
  useAi = true,
): Promise<Classification> {
  const rules = await loadRules(propertyId);
  const byRule = applyRules(rules, mv);
  if (byRule) return byRule;

  const byHeur = applyHeuristic(mv);
  if (byHeur && byHeur.confidence >= 0.7) return byHeur;

  if (useAi) {
    try {
      const { data, error } = await sb.functions.invoke("classify-booking", {
        body: { property_id: propertyId, movement: mv },
      });
      if (!error && data?.accountCode) {
        return {
          accountCode: String(data.accountCode),
          confidence: Math.max(0, Math.min(1, Number(data.confidence ?? 0.6))),
          source: "ai",
          reasoning: data.reasoning || "KI-Vorschlag",
          matchField: "text",
          matchPattern: (mv.counterparty || mv.text || "").toLowerCase().slice(0, 40),
        };
      }
    } catch { /* KI optional – Fallback greift */ }
  }

  return byHeur ?? fallback(mv);
}

// Konto-ID je Code für eine Liegenschaft.
export async function accountIdByCode(propertyId: string, code: string): Promise<string | null> {
  const { data } = await sb.from("pm_accounts").select("id").eq("property_id", propertyId).eq("code", code).maybeSingle();
  return data?.id ?? null;
}

/** Schreibt einen Buchungsvorschlag in pm_booking_suggestions. */
export async function createSuggestion(params: {
  propertyId: string;
  bankEntryId?: string | null;
  entryDate: string;
  description: string;
  reference?: string | null;
  counterparty?: string | null;
  amount: number;
  direction: "in" | "out";
  classification: Classification;
}): Promise<string | null> {
  const bankId = await accountIdByCode(params.propertyId, "1020");
  const gegen = await accountIdByCode(params.propertyId, params.classification.accountCode);
  const debit = params.direction === "in" ? bankId : gegen;
  const credit = params.direction === "in" ? gegen : bankId;

  const { data, error } = await sb.from("pm_booking_suggestions").insert({
    property_id: params.propertyId,
    bank_entry_id: params.bankEntryId ?? null,
    entry_date: params.entryDate,
    description: params.description,
    reference: params.reference ?? null,
    counterparty: params.counterparty ?? null,
    amount: params.amount,
    direction: params.direction,
    debit_account_id: debit,
    credit_account_id: credit,
    suggested_account_id: gegen,
    confidence: params.classification.confidence,
    source: params.classification.source,
    reasoning: params.classification.reasoning,
    status: "pending",
  }).select("id").single();
  if (error) return null;
  return data.id as string;
}

/** Vorschläge einer Liegenschaft (offen). */
export async function getSuggestions(propertyId: string, status = "pending") {
  const { data } = await sb.from("pm_booking_suggestions")
    .select("*")
    .eq("property_id", propertyId)
    .eq("status", status)
    .order("entry_date", { ascending: false });
  return (data ?? []) as any[];
}

/**
 * Bestätigt einen Vorschlag mit (ggf. korrigiertem) Gegenkonto.
 * Lernt bei Abweichung vom Vorschlag eine Regel.
 */
export async function confirmSuggestion(suggestionId: string, accountId: string, learn?: {
  propertyId: string; matchField: string; pattern: string; direction: string; accountCode: string;
}): Promise<string> {
  const { data, error } = await sb.rpc("pm_confirm_booking", {
    p_suggestion_id: suggestionId, p_account_id: accountId,
  });
  if (error) throw error;
  if (learn?.pattern) {
    try {
      await sb.rpc("pm_learn_rule", {
        p_property_id: learn.propertyId, p_match_field: learn.matchField,
        p_pattern: learn.pattern, p_direction: learn.direction, p_account_code: learn.accountCode,
      });
    } catch { /* Lernen best effort */ }
  }
  return data as string;
}

export async function rejectSuggestion(suggestionId: string): Promise<void> {
  await sb.from("pm_booking_suggestions")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("id", suggestionId);
}
