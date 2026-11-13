// Client-seitiges Ausfüllen des offiziellen mietrechtspraxis-Mietvertrags-PDF.
// Lädt die Vorlage (public/mietvertrag-vorlage.pdf), füllt die Formularfelder
// mit den Vertragsdaten aus der DB, legt das Ergebnis dauerhaft in Storage
// ('pm-documents') ab und erzeugt einen pm_documents-Eintrag. Gibt das PDF als
// Blob zurück, damit es zusätzlich heruntergeladen werden kann.

import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";

// Feldzuordnung: logischer Name -> PDF-Feldname (AcroForm des Originals)
const FIELDS = {
  vermieter: "Textfeld 71",
  vermieterZeile2: "Textfeld 72",
  vertretenDurch: "Textfeld 75",
  mieter: "Textfeld 77",
  mieterZeile2: "Textfeld 73",
  mieterZeile3: "Textfeld 78",
  zimmerAnzahl: "Textfeld 80",
  objektAdresse: "Textfeld 79",
  mietbeginn: "Textfeld 115",
  nettoWohnung: "Textfeld 93",
  nettoGarage: "Textfeld 94",
  nkHeizung: "Textfeld 97",
  nkWasser: "Textfeld 98",
  nkRadioTv: "Textfeld 99",
  nkHauswartung: "Textfeld 100",
  kaution: "Textfeld 87",
} as const;

const chf = (n: number | null | undefined) =>
  n == null ? "" : new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const dateCH = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("de-CH") : "";

export interface FillResult {
  blob: Blob;
  fileName: string;
  stored: boolean;
}

export async function fillMietvertrag(contractId: string): Promise<FillResult> {
  // 1) Vertrag + Mieter + Einheit + Liegenschaft laden
  const { data: contract, error: cErr } = await supabase
    .from("pm_contracts")
    .select("id, base_rent, utilities_advance, start_date, deposit_amount, tenant_id, unit_id")
    .eq("id", contractId)
    .maybeSingle();
  if (cErr || !contract) throw new Error("Vertrag nicht gefunden");

  const [{ data: tenant }, { data: unit }] = await Promise.all([
    supabase.from("pm_tenants").select("first_name, last_name, email, phone").eq("id", contract.tenant_id).maybeSingle(),
    supabase.from("pm_units").select("unit_number, floor, rooms, property_id").eq("id", contract.unit_id).maybeSingle(),
  ]);
  const { data: property } = unit
    ? await supabase.from("pm_properties").select("name, address, postal_code, city").eq("id", unit.property_id).maybeSingle()
    : { data: null };

  // 2) PDF-Vorlage laden
  const resp = await fetch("/mietvertrag-vorlage.pdf");
  if (!resp.ok) throw new Error("Vorlage konnte nicht geladen werden");
  const tplBytes = new Uint8Array(await resp.arrayBuffer());

  const pdfDoc = await PDFDocument.load(tplBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  const set = (key: keyof typeof FIELDS, value: string) => {
    if (!value) return;
    try {
      form.getTextField(FIELDS[key]).setText(value);
    } catch {
      // Feld nicht vorhanden -> überspringen
    }
  };

  // 3) Werte zusammenbauen und setzen
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
  const blob = new Blob([outBytes], { type: "application/pdf" });

  const tenantSlug = (tenantName || "mietvertrag").replace(/[^a-zA-Z0-9]+/g, "_");
  const fileName = `Mietvertrag_${tenantSlug}.pdf`;

  // 4) Dauerhaft ablegen (best effort – Download klappt auch ohne)
  let stored = false;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id ?? null;
    const folder = contract.tenant_id ?? "allgemein";
    const storagePath = `${folder}/Mietvertrag_${tenantSlug}_${Date.now()}.pdf`;

    const { error: upErr } = await supabase.storage
      .from("pm-documents")
      .upload(storagePath, blob, { contentType: "application/pdf", upsert: false });

    if (!upErr) {
      const { error: insErr } = await supabase.from("pm_documents").insert({
        name: fileName,
        document_type: "contract",
        file_url: storagePath,
        file_size: outBytes.byteLength,
        contract_id: contract.id,
        tenant_id: contract.tenant_id ?? null,
        unit_id: contract.unit_id ?? null,
        property_id: unit?.property_id ?? null,
        uploaded_by: uid,
      });
      stored = !insErr;
    }
  } catch {
    // Ablage fehlgeschlagen -> Download trotzdem möglich
  }

  return { blob, fileName, stored };
}
