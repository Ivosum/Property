// Client-seitiges Ausfüllen des offiziellen mietrechtspraxis-Mietvertrags-PDF
// nach der Vorlage des Nutzers. Füllt Parteien (inkl. Mitmieter), Mietsache
// (inkl. Nebenräume), Mietzeit, Mietzins 4.1/4.2 (mit Akonto-Positionen),
// Berechnungsgrundlagen 4.5 (Referenzzins/Landesindex – live, mit Fallback)
// und Kaution. Legt das PDF in pm-documents ab und gibt es als Blob zurück.

import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { getReferenceValues } from "./referenceRates";

const sb = supabase as any;

// Exakte Feldzuordnung (aus der Vorlage ermittelt)
const F = {
  // 1. Parteien
  vermieter1: "Textfeld 71", vermieter2: "Textfeld 72",
  vertretenDurch: "Textfeld 75",
  mieter1: "Textfeld 77", mieter2: "Textfeld 73", mieter3: "Textfeld 78",
  // 2. Mietsache
  zimmer: "Textfeld 80", objektAdresse: "Textfeld 79",
  garageNr: "Textfeld 90",
  // 3. Mietzeit
  mietbeginn: "Textfeld 115", erstmalsKuendbar: "Textfeld 116",
  kuendigungsfrist: "Textfeld 119", kuendigungstermine: "Textfeld 120",
  // 4.1 Netto-Mietzins
  nettoWohnung: "Textfeld 93", nettoGarage: "Textfeld 94",
  nettoExtra1Label: "Textfeld 121", nettoExtra1: "Textfeld 95",
  nettoExtra2Label: "Textfeld 122", nettoExtra2: "Textfeld 96",
  // 4.2 Nebenkosten (Beträge)
  nkHeizung: "Textfeld 97", nkWasser: "Textfeld 98", nkRadioTv: "Textfeld 99",
  nkHauswartung: "Textfeld 100",
  nkExtra1Label: "Textfeld 123", nkExtra1: "Textfeld 101",
  nkExtra2Label: "Textfeld 124", nkExtra2: "Textfeld 102",
  nkExtra3Label: "Textfeld 125", nkExtra3: "Textfeld 103",
  nkExtra4Label: "Textfeld 126", nkExtra4: "Textfeld 104",
  nkTotal: "Textfeld 105",
  // 4.5 Berechnungsgrundlagen
  referenzzins: "Textfeld 87", landesindex: "Textfeld 88",
  indexStand: "Textfeld 134", indexBasis: "Textfeld 135",
  // 5.1 Kaution
  kaution: "Textfeld 140",
} as const;

const CB = {
  // 2.2 Nebenräume
  keller: "Kontrollkästchen 36", garage: "Kontrollkästchen 37",
  // 3.2 Mietdauer
  unbestimmt: "Kontrollkästchen 35",
  // 4.2 akonto-Spalte (Heizung/Wasser/RadioTV/Hauswartung)
  akontoHeizung: "Kontrollkästchen 52", akontoWasser: "Kontrollkästchen 45",
  akontoRadioTv: "Kontrollkästchen 46", akontoHauswartung: "Kontrollkästchen 47",
  // 4.3 Abrechnung Stichtag 30. Juni
  stichtagJuni: "Kontrollkästchen 61",
  // 5.1 Kaution spätestens bei Mietantritt
  kautionMietantritt: "Kontrollkästchen 66",
} as const;

const chf = (n: number | null | undefined) =>
  n == null || n === 0 ? "" : new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const dateCH = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("de-CH") : "");

export interface FillResult { blob: Blob; fileName: string; stored: boolean; }

const FLAT = ["wohnung", "gewerbe"];
const PARKING = ["garage", "aussenparkplatz"];

export async function fillMietvertrag(contractId: string): Promise<FillResult> {
  // 1) Vertrag laden + Gruppe (gleiche contract_number) für Objekt-Aufteilung
  const { data: contract, error: cErr } = await sb
    .from("pm_contracts")
    .select("id, base_rent, utilities_advance, start_date, end_date, deposit_amount, tenant_id, unit_id, contract_number, notice_period_months")
    .eq("id", contractId).maybeSingle();
  if (cErr || !contract) throw new Error("Vertrag nicht gefunden");

  let group = [contract];
  if (contract.contract_number) {
    const { data: siblings } = await sb.from("pm_contracts")
      .select("id, base_rent, utilities_advance, unit_id, deposit_amount")
      .eq("contract_number", contract.contract_number);
    if (siblings && siblings.length) group = siblings;
  }

  const unitIds = Array.from(new Set(group.map((g: any) => g.unit_id)));
  const [{ data: tenant }, { data: units }, rates] = await Promise.all([
    sb.from("pm_tenants").select("first_name, last_name, email, phone, date_of_birth, co_tenants").eq("id", contract.tenant_id).maybeSingle(),
    sb.from("pm_units").select("id, unit_number, floor_label, rooms, living_area_sqm, unit_type, property_id").in("id", unitIds),
    getReferenceValues(),
  ]);

  const unitById = new Map((units ?? []).map((u: any) => [u.id, u]));
  const flatUnit = (units ?? []).find((u: any) => FLAT.includes(u.unit_type)) ?? (units ?? [])[0];
  const propertyId = flatUnit?.property_id;
  const { data: property } = propertyId
    ? await sb.from("pm_properties").select("name, address, postal_code, city, canton, owner_ref_id").eq("id", propertyId).maybeSingle()
    : { data: null };
  const { data: owner } = property?.owner_ref_id
    ? await sb.from("pm_owners").select("name, address, postal_code, city, contact_person").eq("id", property.owner_ref_id).maybeSingle()
    : { data: null };

  // 2) PDF-Vorlage laden
  const resp = await fetch("/mietvertrag-vorlage.pdf");
  if (!resp.ok) throw new Error("Vorlage konnte nicht geladen werden");
  const pdfDoc = await PDFDocument.load(new Uint8Array(await resp.arrayBuffer()), { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  const set = (field: string, value: string) => {
    if (!value) return;
    try { form.getTextField(field).setText(value); } catch { /* Feld fehlt */ }
  };
  const check = (field: string) => { try { form.getCheckBox(field).check(); } catch { /* egal */ } };

  // 3) Parteien
  if (owner) {
    set(F.vermieter1, [owner.name, owner.address, [owner.postal_code, owner.city].filter(Boolean).join(" ")].filter(Boolean).join(", "));
    if (owner.contact_person) set(F.vertretenDurch, owner.contact_person);
  }
  // Mieter + Mitmieter (je eine Zeile: Name, Geburtsdatum, Adresse, Kontakt)
  const tenantLine = [
    [tenant?.first_name, tenant?.last_name].filter(Boolean).join(" "),
    dateCH(tenant?.date_of_birth),
    tenant?.phone, tenant?.email,
  ].filter(Boolean).join(", ");
  set(F.mieter1, tenantLine);
  const cos: any[] = Array.isArray(tenant?.co_tenants) ? tenant!.co_tenants : [];
  if (cos[0]) set(F.mieter2, [[cos[0].first_name, cos[0].last_name].filter(Boolean).join(" "), cos[0].date_of_birth, cos[0].address].filter(Boolean).join(", "));
  if (cos[1]) set(F.mieter3, [[cos[1].first_name, cos[1].last_name].filter(Boolean).join(" "), cos[1].date_of_birth, cos[1].address].filter(Boolean).join(", "));

  // 4) Mietsache
  if (flatUnit?.rooms != null) set(F.zimmer, String(flatUnit.rooms));
  const objektAdresse = [
    property?.address,
    [property?.postal_code, property?.city].filter(Boolean).join(" "),
    flatUnit?.floor_label ? `${flatUnit.floor_label}` : null,
  ].filter(Boolean).join(", ");
  set(F.objektAdresse, objektAdresse || property?.name || "");

  // Nebenräume ankreuzen, Garage-Nr setzen
  const kellerU = (units ?? []).find((u: any) => u.unit_type === "keller");
  const garageU = (units ?? []).find((u: any) => PARKING.includes(u.unit_type));
  if (kellerU) check(CB.keller);
  if (garageU) { check(CB.garage); set(F.garageNr, garageU.unit_number || ""); }

  // 5) Mietzeit
  check(CB.unbestimmt);
  set(F.mietbeginn, dateCH(contract.start_date));
  set(F.kuendigungsfrist, contract.notice_period_months ? `${contract.notice_period_months} Monate` : "drei Monate");
  set(F.kuendigungstermine, "März / Sept.");

  // 6) Mietzins 4.1 (Netto) – Wohnung + Garage getrennt, weitere Objekte in Extra-Zeilen
  const rentOf = (uid: string) => Number(group.find((g: any) => g.unit_id === uid)?.base_rent ?? 0);
  if (flatUnit) set(F.nettoWohnung, chf(rentOf(flatUnit.id)));
  if (garageU) set(F.nettoGarage, chf(rentOf(garageU.id)));
  const extraUnits = (units ?? []).filter((u: any) => u.id !== flatUnit?.id && u.id !== garageU?.id);
  if (extraUnits[0]) { set(F.nettoExtra1Label, `${extraUnits[0].unit_number} (${extraUnits[0].unit_type})`); set(F.nettoExtra1, chf(rentOf(extraUnits[0].id))); }
  if (extraUnits[1]) { set(F.nettoExtra2Label, `${extraUnits[1].unit_number} (${extraUnits[1].unit_type})`); set(F.nettoExtra2, chf(rentOf(extraUnits[1].id))); }

  // 4.2 Nebenkosten: gesamtes NK-Akonto als eine Position (Heizung) + Total,
  // plus Akonto-Haken wie in der Vorlage üblich.
  const nkTotal = group.reduce((s: number, g: any) => s + (Number(g.utilities_advance) || 0), 0);
  if (nkTotal > 0) {
    set(F.nkHeizung, chf(nkTotal));
    check(CB.akontoHeizung);
    set(F.nkTotal, chf(nkTotal));
  }

  // 4.3 Stichtag 30. Juni (Standard in der Vorlage)
  check(CB.stichtagJuni);

  // 4.5 Berechnungsgrundlagen – live/Fallback
  set(F.referenzzins, rates.referenceRate.toFixed(2));
  set(F.landesindex, rates.likIndex.toFixed(1));
  set(F.indexStand, rates.likStand || rates.likBase);
  set(F.indexBasis, `${rates.referenceRate.toFixed(2)}% / ${rates.likIndex.toFixed(1)}`);

  // 5.1 Kaution
  if (contract.deposit_amount) { set(F.kaution, chf(contract.deposit_amount)); check(CB.kautionMietantritt); }

  // 7) Speichern (Felder bleiben editierbar)
  const outBytes = await pdfDoc.save();
  const blob = new Blob([outBytes], { type: "application/pdf" });
  const tenantName = [tenant?.first_name, tenant?.last_name].filter(Boolean).join(" ") || "Mietvertrag";
  const tenantSlug = tenantName.replace(/[^a-zA-Z0-9]+/g, "_");
  const fileName = `Mietvertrag_${tenantSlug}.pdf`;

  let stored = false;
  try {
    const { data: authData } = await sb.auth.getUser();
    const uid = authData?.user?.id ?? null;
    const folder = contract.tenant_id ?? "allgemein";
    const storagePath = `${folder}/Mietvertrag_${tenantSlug}_${Date.now()}.pdf`;
    const { error: upErr } = await sb.storage.from("pm-documents")
      .upload(storagePath, blob, { contentType: "application/pdf", upsert: false });
    if (!upErr) {
      const { error: insErr } = await sb.from("pm_documents").insert({
        name: fileName, document_type: "contract", file_url: storagePath, file_size: outBytes.byteLength,
        contract_id: contract.id, tenant_id: contract.tenant_id ?? null,
        unit_id: flatUnit?.id ?? contract.unit_id ?? null, property_id: propertyId ?? null, uploaded_by: uid,
      });
      stored = !insErr;
    }
  } catch { /* Download klappt auch ohne Ablage */ }

  return { blob, fileName, stored };
}
