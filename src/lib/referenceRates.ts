// Aktuelle Referenzwerte für den Mietvertrag (Punkt 4.5):
//  - hypothekarischer Referenzzinssatz (BWO)
//  - Landesindex der Konsumentenpreise LIK (BFS), Basis Dezember 2020 = 100
//
// Strategie: beim Erstellen des Vertrags wird versucht, die Werte live von der
// offiziellen BFS-API zu holen. Gelingt das nicht (Offline, CORS, Quelle geändert),
// greift der zuletzt gespeicherte Wert aus pm_reference_rates. Der Vertrag bricht
// also nie – er zeigt immer einen Wert mit Stand-Datum.

import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface ReferenceValues {
  referenceRate: number;   // %
  likIndex: number;        // Punkte
  likBase: string;         // z.B. "Dezember 2020"
  likStand: string;        // Monat/Jahr des Indexwerts
  live: boolean;           // true = frisch aus dem Netz
}

// BFS PX-Web: Landesindex der Konsumentenpreise, Gesamtindex, Basis Dez 2020=100.
// Cube "px-x-0501010000_102" liefert den Monatsindex. Wir holen den letzten Wert.
const BFS_LIK_URL =
  "https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-0501010000_102/px-x-0501010000_102.px";

const MONTHS_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

async function fetchLikLive(): Promise<{ index: number; stand: string } | null> {
  try {
    // Metadaten holen, um die verfügbaren Monate zu kennen
    const metaResp = await fetch(BFS_LIK_URL, { method: "GET" });
    if (!metaResp.ok) return null;
    const meta = await metaResp.json();
    const timeVar = (meta.variables ?? []).find((v: any) => /monat|zeit|time/i.test(v.code) || /monat|zeit|time/i.test(v.text));
    const posVar = (meta.variables ?? []).find((v: any) => /position|index|total|artikel/i.test(v.code) || /total|gesamt/i.test(v.text));
    if (!timeVar) return null;
    const lastMonth = timeVar.values[timeVar.values.length - 1];

    // Query: Gesamtindex (erste/Gesamt-Position) für den letzten Monat
    const query: any[] = [
      { code: timeVar.code, selection: { filter: "item", values: [lastMonth] } },
    ];
    if (posVar) query.push({ code: posVar.code, selection: { filter: "item", values: [posVar.values[0]] } });

    const dataResp = await fetch(BFS_LIK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, response: { format: "json" } }),
    });
    if (!dataResp.ok) return null;
    const data = await dataResp.json();
    const val = Number(data?.data?.[0]?.values?.[0]);
    if (!isFinite(val)) return null;

    // Stand aus dem Monatscode ableiten (Format meist "YYYYMM" oder label)
    const label = (timeVar.valueTexts?.[timeVar.values.indexOf(lastMonth)] ?? lastMonth) as string;
    let stand = label;
    const m = String(lastMonth).match(/^(\d{4})(\d{2})$/);
    if (m) stand = `${MONTHS_DE[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
    return { index: Math.round(val * 10) / 10, stand };
  } catch {
    return null;
  }
}

async function getFallback(): Promise<ReferenceValues> {
  const { data } = await sb.from("pm_reference_rates").select("*").eq("id", 1).maybeSingle();
  return {
    referenceRate: Number(data?.reference_rate ?? 1.25),
    likIndex: Number(data?.lik_index ?? 108.0),
    likBase: data?.lik_base ?? "Dezember 2020",
    likStand: data?.lik_stand ?? "",
    live: false,
  };
}

/**
 * Liefert die für den Vertrag zu druckenden Werte. Versucht Live-Abruf,
 * fällt sonst auf die gespeicherten Werte zurück. Aktualisiert bei
 * erfolgreichem Live-Abruf auch die gespeicherten Werte (best effort).
 */
export async function getReferenceValues(): Promise<ReferenceValues> {
  const fallback = await getFallback();
  const lik = await fetchLikLive();
  if (!lik) return fallback;

  const result: ReferenceValues = {
    referenceRate: fallback.referenceRate, // Referenzzins bleibt aus Stammdaten (selten geändert)
    likIndex: lik.index,
    likBase: "Dezember 2020",
    likStand: lik.stand,
    live: true,
  };

  // gespeicherten LIK-Wert aktualisieren (damit der Fallback aktuell bleibt)
  try {
    await sb.from("pm_reference_rates").update({
      lik_index: result.likIndex,
      lik_base: result.likBase,
      lik_stand: result.likStand,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
  } catch { /* egal – nur Cache */ }

  return result;
}
