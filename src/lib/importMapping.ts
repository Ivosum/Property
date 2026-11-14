// Smart Excel/CSV import mapping for Property Network.
// Parses a workbook client-side (SheetJS) and maps arbitrary column
// headers to our known fields using fuzzy synonym matching — so a
// Bewirtschafter can drop in their own Liste and we recognise the
// columns automatically. The user can correct the mapping before import.

import * as XLSX from "xlsx";

export type FieldType = "text" | "number" | "boolean";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** lowercase header synonyms (de/en) used for auto-detection */
  synonyms: string[];
  /** short hint shown in the template / mapping UI */
  hint?: string;
}

/** Target schemas the importer understands. */
export const IMPORT_SCHEMAS: Record<"properties" | "tenants" | "units", FieldDef[]> = {
  properties: [
    { key: "name", label: "Name / Bezeichnung", type: "text", required: true,
      synonyms: ["name", "bezeichnung", "liegenschaft", "objekt", "titel", "property", "building"],
      hint: "z.B. Seestrasse 12" },
    { key: "address", label: "Adresse", type: "text", required: true,
      synonyms: ["adresse", "strasse", "street", "address", "strasse nr", "standort"],
      hint: "Strasse und Hausnummer" },
    { key: "postal_code", label: "PLZ", type: "text", required: true,
      synonyms: ["plz", "postleitzahl", "postal", "zip", "postal code", "postcode"] },
    { key: "city", label: "Ort", type: "text", required: true,
      synonyms: ["ort", "stadt", "city", "gemeinde", "town", "place"] },
    { key: "canton", label: "Kanton", type: "text", required: true,
      synonyms: ["kanton", "canton", "kt", "ks"], hint: "z.B. SZ, ZH" },
    { key: "property_type", label: "Objekttyp", type: "text",
      synonyms: ["objekttyp", "typ", "type", "property type", "art", "kategorie", "nutzung"],
      hint: "Mehrfamilienhaus, Geschäftshaus …" },
    { key: "year_built", label: "Baujahr", type: "number",
      synonyms: ["baujahr", "year built", "baujahr jahr", "jahr", "year", "erstellt"] },
    { key: "total_units", label: "Anzahl Einheiten", type: "number",
      synonyms: ["einheiten", "anzahl einheiten", "units", "total units", "wohnungen", "anzahl wohnungen", "mieteinheiten"] },
    { key: "notes", label: "Notizen", type: "text",
      synonyms: ["notizen", "bemerkung", "bemerkungen", "notes", "kommentar", "comment", "info"] },
  ],
  tenants: [
    { key: "first_name", label: "Vorname", type: "text", required: true,
      synonyms: ["vorname", "first name", "first", "firstname", "given name"] },
    { key: "last_name", label: "Nachname", type: "text", required: true,
      synonyms: ["nachname", "name", "last name", "last", "lastname", "familienname", "surname"] },
    { key: "email", label: "E-Mail", type: "text",
      synonyms: ["email", "e-mail", "mail", "e mail", "emailadresse", "e-mail adresse"] },
    { key: "phone", label: "Telefon", type: "text",
      synonyms: ["telefon", "phone", "tel", "handy", "mobile", "natel", "telefonnummer", "tel."] },
    { key: "date_of_birth", label: "Geburtsdatum", type: "text",
      synonyms: ["geburtsdatum", "geburtstag", "date of birth", "dob", "birthday", "geb", "geb."] },
    { key: "nationality", label: "Nationalität", type: "text",
      synonyms: ["nationalität", "nationalitaet", "nationality", "staatsangehörigkeit", "nation"] },
    { key: "employer", label: "Arbeitgeber", type: "text",
      synonyms: ["arbeitgeber", "employer", "firma", "company", "arbeitsstelle"] },
    { key: "monthly_income", label: "Monatseinkommen", type: "number",
      synonyms: ["einkommen", "monatseinkommen", "income", "monthly income", "lohn", "gehalt", "salary"] },
    { key: "notes", label: "Notizen", type: "text",
      synonyms: ["notizen", "bemerkung", "bemerkungen", "notes", "kommentar", "comment", "info"] },
  ],
  units: [
    { key: "unit_type", label: "Typ", type: "text",
      synonyms: ["typ", "type", "art", "objektart", "kategorie", "nutzung"],
      hint: "Wohnung, Keller, Garage, Aussenparkplatz, Lager, Gewerbe" },
    { key: "floor_label", label: "Stockwerk", type: "text",
      synonyms: ["stockwerk", "etage", "geschoss", "floor", "stock", "lage"],
      hint: "UG, EG, 1.OG …" },
    { key: "unit_number", label: "Bezeichnung / Nr.", type: "text", required: true,
      synonyms: ["bezeichnung", "nummer", "nr", "einheit", "wohnung", "unit", "objekt", "top", "name", "unit number"],
      hint: "z.B. TOP1, Keller 3, PP 5" },
    { key: "rooms", label: "Zimmer", type: "number",
      synonyms: ["zimmer", "zi", "rooms", "anzahl zimmer", "zimmeranzahl"] },
    { key: "living_area_sqm", label: "Fläche m²", type: "number",
      synonyms: ["fläche", "flaeche", "wohnfläche", "m2", "m²", "qm", "area", "sqm", "quadratmeter"] },
    { key: "base_rent", label: "Nettomiete", type: "number", required: true,
      synonyms: ["nettomiete", "miete", "rent", "base rent", "netto", "kaltmiete", "mietzins", "nettomietzins"] },
    { key: "utilities_advance", label: "NK-Akonto", type: "number",
      synonyms: ["nk", "nebenkosten", "akonto", "nk-akonto", "utilities", "nebenkosten akonto", "nk akonto"] },
    { key: "notes", label: "Notizen", type: "text",
      synonyms: ["notizen", "bemerkung", "bemerkungen", "notes", "kommentar", "comment", "info"] },
  ],
};

// Mappt freie Typ-Bezeichnungen aus einer Excel-Liste auf unsere Enum-Werte.
export function normalizeUnitType(raw: unknown): string {
  const s = String(raw ?? "").toLowerCase().trim()
    .replace(/[äà]/g, "a").replace(/[öô]/g, "o").replace(/[üû]/g, "u").replace(/ß/g, "ss");
  if (!s) return "wohnung";
  if (/(wohn|apartment|flat|whg|top)/.test(s)) return "wohnung";
  if (/(gewerbe|büro|buro|laden|commercial|office|shop)/.test(s)) return "gewerbe";
  if (/(keller|cellar|estrich|dachboden)/.test(s)) return "keller";
  if (/(garage|einstell|tiefgarage|box)/.test(s)) return "garage";
  if (/(aussen|aussenpark|parkplatz|parking|pp|stellplatz)/.test(s)) return "aussenparkplatz";
  if (/(lager|storage|abstell)/.test(s)) return "lager";
  return "sonstiges";
}

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[]; // keyed by original header
}

/** Read the first non-empty sheet of a workbook file into headers + row objects. */
export async function parseWorkbook(file: File): Promise<ParsedSheet> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Keine Tabelle in der Datei gefunden.");
  const ws = wb.Sheets[sheetName];
  // header:1 gives an array-of-arrays so we control header handling
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: "" });
  if (!aoa.length) throw new Error("Die Tabelle ist leer.");

  // find the header row: first row with >=2 non-empty text cells
  let headerIdx = 0;
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const nonEmpty = aoa[i].filter((c) => String(c ?? "").trim() !== "").length;
    if (nonEmpty >= 2) { headerIdx = i; break; }
  }
  const rawHeaders = (aoa[headerIdx] as unknown[]).map((h, i) => {
    const s = String(h ?? "").trim();
    return s || `Spalte ${i + 1}`;
  });

  const rows: Record<string, unknown>[] = [];
  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const arr = aoa[r] as unknown[];
    if (!arr || arr.every((c) => String(c ?? "").trim() === "")) continue;
    const obj: Record<string, unknown> = {};
    rawHeaders.forEach((h, i) => { obj[h] = arr[i] ?? ""; });
    rows.push(obj);
  }
  return { headers: rawHeaders, rows };
}

const norm = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[._/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[äà]/g, "a").replace(/[öô]/g, "o").replace(/[üû]/g, "u").replace(/ß/g, "ss");

/** Score 0..1 how well a header matches a field. */
function scoreHeader(header: string, field: FieldDef): number {
  const h = norm(header);
  if (!h) return 0;
  const candidates = [norm(field.key), norm(field.label), ...field.synonyms.map(norm)];
  let best = 0;
  for (const c of candidates) {
    if (!c) continue;
    if (h === c) return 1;
    if (h.includes(c) || c.includes(h)) best = Math.max(best, 0.8);
    // token overlap
    const ht = new Set(h.split(" "));
    const ct = new Set(c.split(" "));
    const overlap = [...ht].filter((t) => ct.has(t)).length;
    if (overlap) best = Math.max(best, 0.5 + 0.1 * overlap);
  }
  return best;
}

/** Auto-map headers -> field keys. Returns { fieldKey: headerName | null }. */
export function autoMap(headers: string[], fields: FieldDef[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  const usedHeaders = new Set<string>();
  // greedy: for each field, pick best unused header above threshold
  for (const field of fields) {
    let bestHeader: string | null = null;
    let bestScore = 0.45; // threshold
    for (const h of headers) {
      if (usedHeaders.has(h)) continue;
      const s = scoreHeader(h, field);
      if (s > bestScore) { bestScore = s; bestHeader = h; }
    }
    mapping[field.key] = bestHeader;
    if (bestHeader) usedHeaders.add(bestHeader);
  }
  return mapping;
}

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const s = String(v).replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
};

const toText = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toLocaleDateString("de-CH");
  const s = String(v).trim();
  return s === "" ? null : s;
};

export interface MappedRow {
  values: Record<string, string | number | null>;
  errors: string[];
}

/** Apply a mapping to parsed rows, coercing types and validating required fields. */
export function applyMapping(
  sheet: ParsedSheet,
  fields: FieldDef[],
  mapping: Record<string, string | null>,
): MappedRow[] {
  return sheet.rows.map((row) => {
    const values: Record<string, string | number | null> = {};
    const errors: string[] = [];
    for (const field of fields) {
      const header = mapping[field.key];
      const raw = header ? row[header] : undefined;
      let val: string | number | null = null;
      if (field.type === "number") val = toNumber(raw);
      else val = toText(raw);
      values[field.key] = val;
      if (field.required && (val === null || val === "")) {
        errors.push(`${field.label} fehlt`);
      }
    }
    return { values, errors };
  });
}

/** Build a template worksheet (headers + example rows) for download. */
export function downloadTemplate(schema: "properties" | "tenants" | "units") {
  const fields = IMPORT_SCHEMAS[schema];
  const headers = fields.map((f) => f.label);

  const examples: Record<string, Record<string, string>[]> = {
    properties: [{ "Name / Bezeichnung": "Seestrasse 12", "Adresse": "Seestrasse 12", "PLZ": "8640",
      "Ort": "Rapperswil", "Kanton": "SG", "Objekttyp": "Mehrfamilienhaus",
      "Baujahr": "1998", "Anzahl Einheiten": "6", "Notizen": "Sanierung 2020" }],
    tenants: [{ "Vorname": "Anna", "Nachname": "Muster", "E-Mail": "anna.muster@example.ch",
      "Telefon": "079 123 45 67", "Geburtsdatum": "15.04.1990", "Nationalität": "CH",
      "Arbeitgeber": "Muster AG", "Monatseinkommen": "7500", "Notizen": "" }],
    units: [
      { "Typ": "Wohnung", "Stockwerk": "EG", "Bezeichnung / Nr.": "TOP1", "Zimmer": "3.5",
        "Fläche m²": "85", "Nettomiete": "1800", "NK-Akonto": "250", "Notizen": "" },
      { "Typ": "Wohnung", "Stockwerk": "1.OG", "Bezeichnung / Nr.": "TOP2", "Zimmer": "4.5",
        "Fläche m²": "110", "Nettomiete": "2200", "NK-Akonto": "300", "Notizen": "" },
      { "Typ": "Keller", "Stockwerk": "UG", "Bezeichnung / Nr.": "Keller 1", "Zimmer": "",
        "Fläche m²": "", "Nettomiete": "50", "NK-Akonto": "0", "Notizen": "zu TOP1" },
      { "Typ": "Aussenparkplatz", "Stockwerk": "", "Bezeichnung / Nr.": "PP 5", "Zimmer": "",
        "Fläche m²": "", "Nettomiete": "90", "NK-Akonto": "0", "Notizen": "" },
    ],
  };
  const rows = examples[schema].map((ex) => headers.map((h) => ex[h] ?? ""));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  const sheetName = schema === "properties" ? "Liegenschaften" : schema === "tenants" ? "Mieter" : "Einheiten";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const fname = `Vorlage-${sheetName}.xlsx`;
  XLSX.writeFile(wb, fname);
}
