// Edge Function: publish-flatfox
// Veröffentlicht ein Inserat über die Flatfox-API. Liest das Inserat aus der DB,
// baut das Flatfox-Objekt und sendet es mit dem hinterlegten API-Key.
// Ist kein aktiver Flatfox-Zugang hinterlegt, antwortet die Funktion mit
// { ok:false, message } – der Status wird im Client als "Zugang nötig" gezeigt.
//
// Aufruf (POST, Bearer eines PM-Nutzers): { "listing_id": "<uuid>" }
// Antwort: { ok, external_id?, external_url?, message? }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Flatfox-API-Basis (öffentlich dokumentiert). Kann per Secret überschrieben werden.
const FLATFOX_API = Deno.env.get("FLATFOX_API_URL") || "https://flatfox.ch/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { listing_id } = await req.json().catch(() => ({}));
    if (!listing_id) return json({ ok: false, message: "listing_id fehlt" }, 400);

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Zugang prüfen
    const { data: cred } = await supabase.from("pm_portal_credentials").select("api_key, active").eq("portal", "flatfox").maybeSingle();
    const apiKey = cred?.api_key || Deno.env.get("FLATFOX_API_KEY");
    if (!cred?.active || !apiKey) {
      return json({ ok: false, message: "Flatfox-Zugang nicht aktiv. Bitte API-Key in den Einstellungen hinterlegen und aktivieren." });
    }

    // Inserat laden
    const { data: l } = await supabase.from("pm_listings").select("*").eq("id", listing_id).maybeSingle();
    if (!l) return json({ ok: false, message: "Inserat nicht gefunden" }, 404);

    // Flatfox-Objekt bauen (vereinfachtes Mapping)
    const payload: Record<string, unknown> = {
      title: l.title,
      description: l.description ?? "",
      object_category: l.object_type === "haus" ? "HOUSE" : l.object_type === "gewerbe" ? "COMMERCIAL" : l.object_type === "parkplatz" ? "PARKING" : "APARTMENT",
      offer_type: "RENT",
      price_display: l.rent_display,
      price_unit: "MONTHLY",
      additional_costs: l.utilities ?? null,
      deposit: l.deposit ?? null,
      number_of_rooms: l.rooms ?? null,
      living_area: l.living_area ?? null,
      floor: l.floor_label ?? null,
      available_from: l.available_from ?? null,
      street: l.address_line ?? null,
      zipcode: l.postal_code ?? null,
      city: l.city ?? null,
      country: "CH",
      contact_email: l.contact_email ?? null,
      contact_phone: l.contact_phone ?? null,
      images: (l.images ?? []).map((url: string) => ({ url })),
      attributes: l.features ?? [],
    };

    const resp = await fetch(`${FLATFOX_API}/listing/`, {
      method: "POST",
      headers: { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return json({ ok: false, message: `Flatfox: ${body?.detail ?? resp.status}` });
    }
    const pk = body?.pk ?? body?.id;
    return json({ ok: true, external_id: String(pk ?? ""), external_url: body?.public_url ?? body?.url ?? (pk ? `https://flatfox.ch/de/listing/${pk}/` : null) });
  } catch (e) {
    return json({ ok: false, message: e instanceof Error ? e.message : "Fehler" }, 500);
  }
});
