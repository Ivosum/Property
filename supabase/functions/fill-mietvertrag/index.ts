// Edge Function: fill-mietvertrag
// Füllt das mietrechtspraxis-Mietvertragsformular (Original-PDF) automatisch
// mit den Daten eines Vertrags aus der Datenbank und gibt das fertige PDF zurück.
//
// Aufruf (POST, mit Bearer-Token des eingeloggten PM-Nutzers):
//   { "contract_id": "<uuid>" }
// Antwort: application/pdf (Binär)

import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { MIETVERTRAG_FIELDS } from "./field-map.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TEMPLATE_BUCKET = "templates";
const TEMPLATE_PATH = "mietvertrag-vorlage.pdf";

const chf = (n: number | null | undefined) =>
  n == null ? "" : new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const dateCH = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("de-CH") : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contract_id } = await req.json().catch(() => ({}));
    if (!contract_id) {
      return json({ error: "contract_id fehlt" }, 400);
    }

    // Auth prüfen: der aufrufende Nutzer muss eingeloggt sein
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return json({ error: "Nicht autorisiert" }, 401);
    }

    // Service-Role für Datenzugriff (RLS-unabhängig, Auth ist oben geprüft)
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Prüfen, dass der Nutzer überhaupt ein PM-Teammitglied ist
    const { data: role } = await admin
      .from("pm_user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!role) {
      return json({ error: "Keine Berechtigung (kein PM-Konto)" }, 403);
    }

    // Vertrag + Mieter + Einheit + Liegenschaft laden
    const { data: contract, error: cErr } = await admin
      .from("pm_contracts")
      .select("id, base_rent, utilities_advance, start_date, deposit_amount, tenant_id, unit_id")
      .eq("id", contract_id)
      .maybeSingle();
    if (cErr || !contract) return json({ error: "Vertrag nicht gefunden" }, 404);

    const [{ data: tenant }, { data: unit }] = await Promise.all([
      admin.from("pm_tenants").select("first_name, last_name, email, phone").eq("id", contract.tenant_id).maybeSingle(),
      admin.from("pm_units").select("unit_number, floor, rooms, property_id").eq("id", contract.unit_id).maybeSingle(),
    ]);
    const { data: property } = unit
      ? await admin.from("pm_properties").select("name, address, postal_code, city").eq("id", unit.property_id).maybeSingle()
      : { data: null };

    // PDF-Vorlage laden
    const { data: tpl, error: tErr } = await admin.storage.from(TEMPLATE_BUCKET).download(TEMPLATE_PATH);
    if (tErr || !tpl) {
      return json({ error: "Vorlage nicht gefunden. Bitte 'mietvertrag-vorlage.pdf' im Bucket 'templates' hinterlegen." }, 500);
    }
    const tplBytes = new Uint8Array(await tpl.arrayBuffer());

    const pdfDoc = await PDFDocument.load(tplBytes);
    const form = pdfDoc.getForm();

    const set = (key: keyof typeof MIETVERTRAG_FIELDS, value: string) => {
      if (!value) return;
      try {
        form.getTextField(MIETVERTRAG_FIELDS[key]).setText(value);
      } catch (_e) {
        // Feld nicht vorhanden -> überspringen
      }
    };

    // Werte aufbauen
    const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}`.trim() : "";
    const tenantLine = [tenantName, tenant?.phone, tenant?.email].filter(Boolean).join(", ");
    const objektAdresse = [
      property?.address,
      [property?.postal_code, property?.city].filter(Boolean).join(" "),
      unit?.floor != null ? `${unit.floor}. OG` : null,
    ].filter(Boolean).join(", ");

    set("mieter", tenantLine);
    set("zimmerAnzahl", unit?.rooms != null ? String(unit.rooms) : "");
    set("objektAdresse", objektAdresse || property?.name || "");
    set("mietbeginn", dateCH(contract.start_date));
    set("nettoWohnung", chf(contract.base_rent));
    set("nkHeizung", chf(contract.utilities_advance));
    set("kaution", chf(contract.deposit_amount));

    // Formularfelder behalten (nicht flatten), damit manuelle Nachbearbeitung möglich bleibt
    const outBytes = await pdfDoc.save();

    const tenantSlug = (tenantName || "mietvertrag").replace(/[^a-zA-Z0-9]+/g, "_");
    const fileName = `Mietvertrag_${tenantSlug}.pdf`;

    // ---------------------------------------------------------------
    // PDF dauerhaft ablegen: Storage-Bucket 'pm-documents' + pm_documents-Eintrag
    // Pfad beginnt mit der tenant_id, damit der Mieter seine eigene Datei sehen darf.
    // Fehler hier dürfen den Download nicht verhindern -> best effort.
    // ---------------------------------------------------------------
    try {
      const folder = contract.tenant_id ?? "allgemein";
      const storagePath = `${folder}/Mietvertrag_${tenantSlug}_${Date.now()}.pdf`;

      const { error: upErr } = await admin.storage
        .from("pm-documents")
        .upload(storagePath, outBytes, { contentType: "application/pdf", upsert: false });

      if (!upErr) {
        await admin.from("pm_documents").insert({
          name: fileName,
          document_type: "contract",
          file_url: storagePath, // Storage-Pfad; signierte URL wird beim Abruf erzeugt
          file_size: outBytes.byteLength,
          contract_id: contract.id,
          tenant_id: contract.tenant_id ?? null,
          unit_id: contract.unit_id ?? null,
          property_id: unit?.property_id ?? null,
          uploaded_by: userData.user.id,
        });
      }
    } catch (_e) {
      // Ablage fehlgeschlagen -> Download trotzdem zurückgeben
    }

    return new Response(outBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
