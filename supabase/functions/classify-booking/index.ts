// Edge Function: classify-booking
// Ordnet eine Bankbewegung einer Liegenschaft automatisch einem Buchungskonto
// zu. Nutzt das Anthropic-Modell mit dem Kontenplan der Liegenschaft als
// Kontext. Der API-Key liegt serverseitig (ANTHROPIC_API_KEY) – nie im Browser.
//
// Aufruf (POST, Bearer-Token eines PM-Nutzers):
//   { "property_id": "<uuid>", "movement": { direction, amount, counterparty, reference, text } }
// Antwort: { accountCode, confidence, reasoning }
//
// Fällt die KI aus (kein Key / Fehler), antwortet die Funktion mit einem
// neutralen Fallback, damit der Client immer einen Vorschlag erhält.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { property_id, movement } = await req.json().catch(() => ({}));
    if (!property_id || !movement) return json({ error: "property_id/movement fehlt" }, 400);

    const dir = movement.direction === "in" ? "in" : "out";
    const fallbackCode = dir === "in" ? "6090" : "6900";

    // Supabase-Client mit dem Token des Aufrufers (RLS gilt)
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Nur die relevanten Konten (Ertrag/Aufwand) als Auswahl anbieten
    const { data: accounts } = await supabase
      .from("pm_accounts")
      .select("code, name, type")
      .eq("property_id", property_id)
      .in("type", ["income", "expense"])
      .order("code");

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey || !accounts || accounts.length === 0) {
      return json({ accountCode: fallbackCode, confidence: 0.3, reasoning: "Fallback (keine KI verfügbar)" });
    }

    const kontenliste = accounts.map((a: any) => `${a.code} ${a.name} (${a.type === "income" ? "Ertrag" : "Aufwand"})`).join("\n");
    const richtung = dir === "in" ? "Gutschrift (Geldeingang)" : "Belastung (Geldausgang)";

    const prompt =
`Du bist Buchhalter für eine Schweizer Liegenschaft. Ordne die folgende Bankbewegung GENAU EINEM Konto aus dem Kontenplan zu.

Kontenplan (nur diese Codes sind erlaubt):
${kontenliste}

Bankbewegung:
- Art: ${richtung}
- Betrag: CHF ${movement.amount}
- Auftraggeber/Empfänger: ${movement.counterparty ?? "unbekannt"}
- Referenz: ${movement.reference ?? "-"}
- Verwendungszweck/Text: ${movement.text ?? "-"}

Regeln:
- Gutschriften von Mietern = Mietertrag (6000) bzw. Nebenkostenakonto (6050).
- Belastungen nach Art des Aufwands (Heizung/Energie, Wasser, Hauswartung/Reinigung, Versicherung, Verwaltung, Gebühren/Abgaben, Unterhalt & Reparaturen).
- Wenn unklar: 6090 (übriger Ertrag) bzw. 6900 (übriger Aufwand).

Antworte NUR mit JSON, ohne weiteren Text:
{"accountCode":"<code>","confidence":<0..1>,"reasoning":"<kurze Begründung auf Deutsch>"}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      return json({ accountCode: fallbackCode, confidence: 0.3, reasoning: "Fallback (KI-Fehler)" });
    }

    const data = await resp.json();
    const txt = data?.content?.[0]?.text ?? "";
    const match = txt.match(/\{[\s\S]*\}/);
    if (!match) return json({ accountCode: fallbackCode, confidence: 0.3, reasoning: "Fallback (keine Antwort)" });

    let parsed: any;
    try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
    const valid = parsed && accounts.some((a: any) => a.code === String(parsed.accountCode));
    if (!valid) return json({ accountCode: fallbackCode, confidence: 0.3, reasoning: "Fallback (ungültiger Code)" });

    return json({
      accountCode: String(parsed.accountCode),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.6))),
      reasoning: String(parsed.reasoning ?? "KI-Vorschlag"),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Fehler" }, 500);
  }
});
