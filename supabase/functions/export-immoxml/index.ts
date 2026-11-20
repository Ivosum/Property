// Edge Function: export-immoxml
// Erzeugt für ein Inserat einen ImmoXML-/IDX-konformen Feed (Schweizer Standard,
// den Homegate/ImmoScout24 importieren) und legt ihn öffentlich im Storage ab.
// Homegate holt den Feed periodisch ab bzw. er wird an den Import-Endpoint der
// SMG geliefert. Diese Funktion liefert die Feed-URL zurück, die beim Portal
// als Importquelle hinterlegt wird.
//
// Aufruf (POST, Bearer eines PM-Nutzers): { "listing_id": "<uuid>" }
// Antwort: { ok, external_url (Feed-URL), message? }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildImmoXml(l: any, providerId: string): string {
  const cat = l.object_type === "haus" ? "HOUSE" : l.object_type === "gewerbe" ? "COMMERCIAL" : l.object_type === "parkplatz" ? "GARAGE" : "APARTMENT";
  const pics = (l.images ?? []).map((url: string, i: number) =>
    `        <picture><picture_url>${esc(url)}</picture_url><title>Bild ${i + 1}</title></picture>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<immoxml>
  <provider>
    <provider_id>${esc(providerId)}</provider_id>
    <export_date>${new Date().toISOString()}</export_date>
  </provider>
  <properties>
    <property>
      <property_id>${esc(l.id)}</property_id>
      <category>${cat}</category>
      <offer_type>RENT</offer_type>
      <title>${esc(l.title)}</title>
      <description>${esc(l.description)}</description>
      <address>
        <street>${esc(l.address_line)}</street>
        <zip>${esc(l.postal_code)}</zip>
        <city>${esc(l.city)}</city>
        <country>CH</country>
      </address>
      <prices>
        <rent_net>${esc(l.rent_display)}</rent_net>
        <additional_costs>${esc(l.utilities ?? "")}</additional_costs>
        <deposit>${esc(l.deposit ?? "")}</deposit>
        <currency>CHF</currency>
      </prices>
      <characteristics>
        <number_of_rooms>${esc(l.rooms ?? "")}</number_of_rooms>
        <living_area>${esc(l.living_area ?? "")}</living_area>
        <floor>${esc(l.floor_label ?? "")}</floor>
        <available_from>${esc(l.available_from ?? "")}</available_from>
      </characteristics>
      <contact>
        <email>${esc(l.contact_email ?? "")}</email>
        <phone>${esc(l.contact_phone ?? "")}</phone>
      </contact>
      <pictures>
${pics}
      </pictures>
    </property>
  </properties>
</immoxml>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { listing_id } = await req.json().catch(() => ({}));
    if (!listing_id) return json({ ok: false, message: "listing_id fehlt" }, 400);

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: cred } = await supabase.from("pm_portal_credentials").select("provider_id, active").eq("portal", "homegate").maybeSingle();
    if (!cred?.active || !cred?.provider_id) {
      return json({ ok: false, message: "Homegate-Zugang nicht aktiv. Bitte Anbieter-ID in den Einstellungen hinterlegen und aktivieren." });
    }

    const { data: l } = await supabase.from("pm_listings").select("*").eq("id", listing_id).maybeSingle();
    if (!l) return json({ ok: false, message: "Inserat nicht gefunden" }, 404);

    const xml = buildImmoXml(l, cred.provider_id);
    const path = `feeds/${listing_id}.xml`;
    const { error: upErr } = await supabase.storage.from("pm-listings")
      .upload(path, new Blob([xml], { type: "application/xml" }), { contentType: "application/xml", upsert: true });
    if (upErr) return json({ ok: false, message: `Feed konnte nicht abgelegt werden: ${upErr.message}` });

    const { data: pub } = supabase.storage.from("pm-listings").getPublicUrl(path);
    return json({ ok: true, external_url: pub.publicUrl, message: "ImmoXML-Feed erstellt. Diese URL bei Homegate als Importquelle hinterlegen." });
  } catch (e) {
    return json({ ok: false, message: e instanceof Error ? e.message : "Fehler" }, 500);
  }
});
