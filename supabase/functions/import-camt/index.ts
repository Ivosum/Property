// Edge Function: import-camt
// Serverseitiger camt.053/054-Import für eine Liegenschaft. Robust auch bei
// grossen Auszügen: parst die XML, gleicht Miet-Gutschriften per QR-Referenz
// gegen offene Zahlungen ab (verbucht Treffer) und erzeugt für den Rest
// Buchungsvorschläge – inkl. KI-Klassifizierung (ANTHROPIC_API_KEY),
// mit Regel-/Heuristik-Fallback. Läuft als EIN serverseitiger Vorgang,
// damit der Browser nicht Dutzende Einzelaufrufe machen muss.
//
// Aufruf (POST, Bearer-Token eines PM-Nutzers):
//   { "property_id": "<uuid>", "xml": "<camt-xml>", "file_name": "..." }
// Antwort: { statementId, total, matched, suggested, details: [...] }

import { createClient } from "npm:@supabase/supabase-js@2";
import { DOMParser, type Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const normRef = (r?: string | null) => (r ?? "").replace(/\D+/g, "");
const norm = (s?: string | null) => (s ?? "").toLowerCase();

// --- camt-Parsing (localName-basiert) ---
function kids(el: Element, l: string): Element[] {
  return Array.from(el.children).filter((c) => (c as Element).localName === l) as Element[];
}
function firstDeep(el: Element, l: string): Element | null {
  const d = kids(el, l); if (d.length) return d[0];
  for (const c of Array.from(el.children)) { const f = firstDeep(c as Element, l); if (f) return f; }
  return null;
}
function allDeep(el: Element, l: string): Element[] {
  const out: Element[] = [];
  const w = (n: Element) => { for (const c of Array.from(n.children)) { const e = c as Element; if (e.localName === l) out.push(e); w(e); } };
  w(el); return out;
}
const txt = (e: Element | null) => (e?.textContent?.trim() || null);
function dateOf(el: Element | null): string | null {
  if (!el) return null;
  const dt = firstDeep(el, "Dt") ?? firstDeep(el, "DtTm");
  const raw = txt(dt) ?? txt(el); return raw ? raw.slice(0, 10) : null;
}

interface Entry {
  amount: number; currency: string; cd: "CRDT" | "DBIT";
  bookingDate: string | null; valueDate: string | null;
  reference: string | null; debtorName: string | null; debtorIban: string | null; remittance: string | null;
}

function parseCamt(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "text/html") as unknown as { documentElement: Element } | null;
  // deno-dom: XML via parseFromString("text/html") toleriert camt-Tags; fallback:
  const root = (new DOMParser().parseFromString(xml, "text/xml") as unknown as { documentElement: Element })?.documentElement
    ?? doc?.documentElement;
  if (!root) throw new Error("Ungültige XML");
  const container = firstDeep(root, "Stmt") ?? firstDeep(root, "Ntfctn") ?? root;
  const format = allDeep(root, "Stmt").length ? "camt.053" : allDeep(root, "Ntfctn").length ? "camt.054" : "camt";
  const acct = firstDeep(container, "Acct");
  const iban = acct ? txt(firstDeep(acct, "IBAN")) : null;
  const period = firstDeep(container, "FrToDt");
  const periodFrom = period ? dateOf(firstDeep(period, "FrDtTm") ?? firstDeep(period, "FrDt")) : null;
  const periodTo = period ? dateOf(firstDeep(period, "ToDtTm") ?? firstDeep(period, "ToDt")) : null;

  const entries: Entry[] = allDeep(container, "Ntry").map((n) => {
    const amtEl = firstDeep(n, "Amt");
    const refInf = firstDeep(n, "CdtrRefInf");
    let ref = refInf ? txt(firstDeep(refInf, "Ref")) : null;
    if (!ref) { const strd = firstDeep(n, "Strd"); if (strd) ref = txt(firstDeep(strd, "Ref")); }
    const dbtr = firstDeep(n, "Dbtr");
    const dbtrAcct = firstDeep(n, "DbtrAcct");
    return {
      amount: Number(txt(amtEl) ?? "0"),
      currency: amtEl?.getAttribute("Ccy") ?? "CHF",
      cd: (txt(firstDeep(n, "CdtDbtInd")) ?? "CRDT") as "CRDT" | "DBIT",
      bookingDate: dateOf(kids(n, "BookgDt")[0] ?? null),
      valueDate: dateOf(kids(n, "ValDt")[0] ?? null),
      reference: ref ? ref.replace(/\s+/g, "") : null,
      debtorName: dbtr ? txt(firstDeep(dbtr, "Nm")) : null,
      debtorIban: dbtrAcct ? txt(firstDeep(dbtrAcct, "IBAN")) : null,
      remittance: txt(firstDeep(n, "Ustrd")),
    };
  });
  return { iban, format, periodFrom, periodTo, entries };
}

// --- Heuristik (gleiche Stichwörter wie im Client) ---
const KEYWORDS: { code: string; dir: "in" | "out"; words: string[] }[] = [
  { code: "6000", dir: "in", words: ["miete", "mietzins", "nettomiete"] },
  { code: "6050", dir: "in", words: ["nebenkosten", "akonto"] },
  { code: "6420", dir: "out", words: ["heizöl", "heizoel", "gas", "erdgas", "fernwärme", "energie", "strom", "elektriz", "ewz", "ckw", "pellets", "brennstoff"] },
  { code: "6430", dir: "out", words: ["wasser", "abwasser", "wasserversorgung", "kläranlage"] },
  { code: "6440", dir: "out", words: ["hauswart", "reinigung", "gartenpflege", "schneeräumung", "entsorgung", "kehricht", "lift", "aufzug", "wartung"] },
  { code: "6500", dir: "out", words: ["versicherung", "haftpflicht", "gvz", "axa", "mobiliar", "zurich", "helvetia", "allianz", "baloise"] },
  { code: "6510", dir: "out", words: ["verwaltung", "bewirtschaftung", "honorar", "treuhand"] },
  { code: "6570", dir: "out", words: ["gebühr", "abgabe", "steuer", "kaminfeger", "serafe", "billag"] },
  { code: "6400", dir: "out", words: ["reparatur", "unterhalt", "sanitär", "elektriker", "maler", "handwerker", "spengler", "schreiner", "renovation"] },
];

function heuristic(dir: "in" | "out", hay: string): { code: string; word: string } | null {
  for (const k of KEYWORDS) {
    if (k.dir !== dir) continue;
    for (const w of k.words) if (hay.includes(w)) return { code: k.code, word: w };
  }
  return null;
}

async function aiClassify(apiKey: string, kontenliste: string, dir: "in" | "out", mv: any): Promise<{ code: string; confidence: number; reasoning: string } | null> {
  const richtung = dir === "in" ? "Gutschrift (Geldeingang)" : "Belastung (Geldausgang)";
  const prompt = `Du bist Buchhalter für eine Schweizer Liegenschaft. Ordne die Bankbewegung GENAU EINEM Konto zu.
Kontenplan (nur diese Codes erlaubt):
${kontenliste}
Bankbewegung:
- Art: ${richtung}
- Betrag: CHF ${mv.amount}
- Auftraggeber/Empfänger: ${mv.counterparty ?? "unbekannt"}
- Referenz: ${mv.reference ?? "-"}
- Verwendungszweck: ${mv.text ?? "-"}
Antworte NUR mit JSON: {"accountCode":"<code>","confidence":<0..1>,"reasoning":"<kurz deutsch>"}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-5-20250929", max_tokens: 250, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const m = (d?.content?.[0]?.text ?? "").match(/\{[\s\S]*\}/);
    if (!m) return null;
    const p = JSON.parse(m[0]);
    return { code: String(p.accountCode), confidence: Number(p.confidence ?? 0.6), reasoning: String(p.reasoning ?? "KI-Vorschlag") };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { property_id, xml, file_name } = await req.json().catch(() => ({}));
    if (!property_id || !xml) return json({ error: "property_id/xml fehlt" }, 400);

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    const stmt = parseCamt(xml);
    const credits = stmt.entries.filter((e) => e.cd === "CRDT");
    const debits = stmt.entries.filter((e) => e.cd === "DBIT");

    // Kontext laden
    const [{ data: units }, { data: contracts }, { data: tenants }, { data: accounts }] = await Promise.all([
      supabase.from("pm_units").select("id, property_id").eq("property_id", property_id),
      supabase.from("pm_contracts").select("id, unit_id"),
      supabase.from("pm_tenants").select("id, first_name, last_name"),
      supabase.from("pm_accounts").select("id, code, name, type").eq("property_id", property_id),
    ]);
    const unitIds = new Set((units ?? []).map((u: any) => u.id));
    const contractIds = new Set((contracts ?? []).filter((c: any) => unitIds.has(c.unit_id)).map((c: any) => c.id));
    const tenantName = new Map((tenants ?? []).map((t: any) => [t.id, [t.first_name, t.last_name].filter(Boolean).join(" ") || "Unbenannt"]));
    const accById = new Map((accounts ?? []).map((a: any) => [a.code, a.id]));
    const bankAcc = accById.get("1020");
    const kontenliste = (accounts ?? []).filter((a: any) => a.type === "income" || a.type === "expense")
      .map((a: any) => `${a.code} ${a.name} (${a.type === "income" ? "Ertrag" : "Aufwand"})`).join("\n");

    const { data: openPays } = await supabase.from("pm_payments")
      .select("id, tenant_id, contract_id, amount, reference, status, reminder_fees, paid_amount, due_date").in("status", ["pending", "overdue"]);
    const open = (openPays ?? []).filter((p: any) => contractIds.has(p.contract_id));
    const byRef = new Map<string, any>();
    const openByTenant = new Map<string, any[]>();
    open.forEach((p: any) => {
      const r = normRef(p.reference); if (r) byRef.set(r, p);
      const arr = openByTenant.get(p.tenant_id) ?? []; arr.push(p); openByTenant.set(p.tenant_id, arr);
    });
    openByTenant.forEach((arr) => arr.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
    const openAmount = (p: any) => (Number(p.amount) + Number(p.reminder_fees ?? 0)) - Number(p.paid_amount ?? 0);

    // gelernte Regeln
    const { data: rules } = await supabase.from("pm_booking_rules").select("*")
      .or(`property_id.eq.${property_id},property_id.is.null`).order("hit_count", { ascending: false });

    // Statement anlegen
    let statementId: string | null = null;
    try {
      const { data: s } = await supabase.from("pm_bank_statements").insert({
        property_id, file_name: file_name ?? null, format: stmt.format,
        period_from: stmt.periodFrom, period_to: stmt.periodTo,
        entries_total: stmt.entries.length,
        amount_total: credits.reduce((a, e) => a + e.amount, 0),
        raw_meta: { iban: stmt.iban },
      }).select("id").single();
      statementId = s?.id ?? null;
    } catch { /* best effort */ }

    const classify = async (dir: "in" | "out", e: Entry) => {
      const hay = `${norm(e.debtorName)} ${norm(e.remittance)} ${norm(e.reference)}`;
      // 1) Regeln
      for (const r of (rules ?? [])) {
        if (r.direction && r.direction !== dir) continue;
        const field = r.match_field === "counterparty" ? norm(e.debtorName) : r.match_field === "reference" ? norm(e.reference) : norm(e.remittance);
        if (r.pattern && field.includes(r.pattern)) {
          return { code: r.account_code, confidence: Math.min(0.99, 0.8 + 0.03 * (r.hit_count ?? 1)), source: "rule", reasoning: `Gelernte Regel „${r.pattern}" → ${r.account_code}` };
        }
      }
      // 2) Heuristik
      const h = heuristic(dir, hay);
      if (h) return { code: h.code, confidence: 0.7, source: "heuristic", reasoning: `Stichwort „${h.word}"` };
      // 3) KI
      if (apiKey && kontenliste) {
        const ai = await aiClassify(apiKey, kontenliste, dir, { amount: e.amount, counterparty: e.debtorName, reference: e.reference, text: e.remittance });
        if (ai && accById.has(ai.code)) return { code: ai.code, confidence: ai.confidence, source: "ai", reasoning: ai.reasoning };
      }
      return { code: dir === "in" ? "6090" : "6900", confidence: 0.3, source: "fallback", reasoning: "Keine eindeutige Zuordnung" };
    };

    const makeSuggestion = async (dir: "in" | "out", e: Entry, bankEntryId: string | null) => {
      const cls = await classify(dir, e);
      const gegen = accById.get(cls.code);
      const desc = [e.debtorName, e.remittance].filter(Boolean).join(" – ") || (dir === "in" ? "Zahlungseingang" : "Zahlungsausgang");
      await supabase.from("pm_booking_suggestions").insert({
        property_id, bank_entry_id: bankEntryId, entry_date: e.bookingDate ?? new Date().toISOString().slice(0, 10),
        description: desc, reference: e.reference, counterparty: e.debtorName, amount: Math.abs(e.amount), direction: dir,
        debit_account_id: dir === "in" ? bankAcc : gegen, credit_account_id: dir === "in" ? gegen : bankAcc,
        suggested_account_id: gegen, confidence: cls.confidence, source: cls.source, reasoning: cls.reasoning, status: "pending",
      });
    };

    const used = new Set<string>();
    const details: any[] = [];
    let matched = 0, suggested = 0;

    for (const e of credits) {
      let pay: any = null;
      const ref = normRef(e.reference);
      if (ref && byRef.has(ref) && !used.has(byRef.get(ref).id)) pay = byRef.get(ref);
      if (!pay) { const c = open.filter((p: any) => !used.has(p.id) && Math.abs(Number(p.amount) - e.amount) < 0.01); if (c.length === 1) pay = c[0]; }

      if (pay) {
        // Betrag auf offene Posten des Mieters anrechnen (älteste zuerst):
        // Teil-, exakte, Sammel- und Überzahlung.
        const queue = (openByTenant.get(pay.tenant_id) ?? []).filter((p: any) => !used.has(p.id) && openAmount(p) > 0.005);
        queue.sort((a, b) => (a.id === pay.id ? -1 : b.id === pay.id ? 1 : new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
        let rest = e.amount; const covered: string[] = [];
        for (const q of queue) {
          if (rest <= 0.005) break;
          const before = openAmount(q);
          const { data: back } = await supabase.rpc("pm_apply_payment", { p_payment_id: q.id, p_amount: rest, p_date: e.bookingDate ?? new Date().toISOString().slice(0, 10) });
          const newRest = Number(back ?? 0); const applied = rest - newRest;
          if (applied > 0.005) covered.push(q.id);
          if (applied >= before - 0.005) used.add(q.id);
          rest = newRest;
        }
        matched++;
        if (rest > 0.005) {
          await supabase.from("pm_credits").insert({ tenant_id: pay.tenant_id, property_id, amount: rest, source: "overpayment", note: "Überzahlung aus Kontoauszug" });
        }
        if (statementId) await supabase.from("pm_bank_entries").insert({
          statement_id: statementId, property_id, booking_date: e.bookingDate, value_date: e.valueDate,
          amount: e.amount, currency: e.currency, reference: e.reference, debtor_name: e.debtorName, debtor_iban: e.debtorIban,
          remittance_info: e.remittance, matched_payment_id: pay.id, match_status: "matched",
        });
        const note = covered.length > 1 ? ` (${covered.length} Mieten)` : rest > 0.005 ? " (Überzahlung → Guthaben)" : "";
        details.push({ amount: e.amount, debtor: (e.debtorName ?? "") + note, status: "matched", tenant: tenantName.get(pay.tenant_id) });
      } else {
        let beId: string | null = null;
        if (statementId) {
          const { data: be } = await supabase.from("pm_bank_entries").insert({
            statement_id: statementId, property_id, booking_date: e.bookingDate, value_date: e.valueDate,
            amount: e.amount, currency: e.currency, reference: e.reference, debtor_name: e.debtorName, debtor_iban: e.debtorIban,
            remittance_info: e.remittance, match_status: "unmatched",
          }).select("id").single();
          beId = be?.id ?? null;
        }
        await makeSuggestion("in", e, beId); suggested++;
        details.push({ amount: e.amount, debtor: e.debtorName, status: "suggested" });
      }
    }

    for (const e of debits) {
      let beId: string | null = null;
      if (statementId) {
        const { data: be } = await supabase.from("pm_bank_entries").insert({
          statement_id: statementId, property_id, booking_date: e.bookingDate, value_date: e.valueDate,
          amount: -Math.abs(e.amount), currency: e.currency, reference: e.reference, debtor_name: e.debtorName, debtor_iban: e.debtorIban,
          remittance_info: e.remittance, match_status: "unmatched",
        }).select("id").single();
        beId = be?.id ?? null;
      }
      await makeSuggestion("out", e, beId); suggested++;
      details.push({ amount: e.amount, debtor: e.debtorName, status: "suggested" });
    }

    if (statementId) await supabase.from("pm_bank_statements").update({ entries_matched: matched }).eq("id", statementId);
    await supabase.from("pm_bank_connections").update({ last_import_at: new Date().toISOString() }).eq("property_id", property_id);

    return json({ statementId, total: stmt.entries.length, matched, suggested, details });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Fehler" }, 500);
  }
});
