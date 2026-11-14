// Shared write helpers + constants for the property-management module.
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export const CANTONS = [
  "AG","AI","AR","BE","BL","BS","FR","GE","GL","GR","JU","LU","NE","NW","OW",
  "SG","SH","SO","SZ","TG","TI","UR","VD","VS","ZG","ZH",
];

export const PROPERTY_TYPES = [
  "Mehrfamilienhaus","Einfamilienhaus","Geschäftshaus","Gewerbe","Mischnutzung",
  "Stockwerkeigentum","Parkhaus","Lager","Sonstiges",
];

export const UNIT_STATUS = [
  { value: "vacant", label: "Frei" },
  { value: "occupied", label: "Vermietet" },
  { value: "maintenance", label: "Unterhalt" },
  { value: "reserved", label: "Reserviert" },
];

// Einheiten-Typen. `nkRelevant` = trägt Nebenkosten nach Fläche (Wohn-/Gewerbefläche).
export const UNIT_TYPES: { value: string; label: string; nkRelevant: boolean }[] = [
  { value: "wohnung", label: "Wohnung", nkRelevant: true },
  { value: "gewerbe", label: "Gewerbe", nkRelevant: true },
  { value: "keller", label: "Keller", nkRelevant: false },
  { value: "garage", label: "Garage / Einstellplatz", nkRelevant: false },
  { value: "aussenparkplatz", label: "Aussenparkplatz", nkRelevant: false },
  { value: "lager", label: "Lager / Estrich", nkRelevant: false },
  { value: "sonstiges", label: "Sonstiges", nkRelevant: false },
];

export const UNIT_TYPE_LABEL: Record<string, string> =
  Object.fromEntries(UNIT_TYPES.map((t) => [t.value, t.label]));
export const NK_RELEVANT_TYPES = UNIT_TYPES.filter((t) => t.nkRelevant).map((t) => t.value);

// Übliche Stockwerk-Bezeichnungen (Schweiz)
export const FLOOR_LABELS = ["UG", "EG", "1.OG", "2.OG", "3.OG", "4.OG", "5.OG", "6.OG", "DG", "Attika"];

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export interface PropertyInput {
  name: string;
  address: string;
  postal_code: string;
  city: string;
  canton: string;
  property_type?: string | null;
  year_built?: number | null;
  total_units?: number | null;
  notes?: string | null;
}

export async function insertProperty(p: PropertyInput) {
  const owner_id = await currentUserId();
  const { data, error } = await sb.from("pm_properties").insert({
    name: p.name,
    address: p.address,
    postal_code: p.postal_code,
    city: p.city,
    canton: p.canton,
    country: "Schweiz",
    property_type: p.property_type || "Mehrfamilienhaus",
    year_built: p.year_built ?? null,
    total_units: p.total_units ?? 0,
    notes: p.notes ?? null,
    owner_id,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function insertProperties(rows: PropertyInput[]) {
  const owner_id = await currentUserId();
  const payload = rows.map((p) => ({
    name: p.name,
    address: p.address,
    postal_code: p.postal_code,
    city: p.city,
    canton: p.canton,
    country: "Schweiz",
    property_type: p.property_type || "Mehrfamilienhaus",
    year_built: p.year_built ?? null,
    total_units: p.total_units ?? 0,
    notes: p.notes ?? null,
    owner_id,
  }));
  const { data, error } = await sb.from("pm_properties").insert(payload).select("id");
  if (error) throw error;
  return (data ?? []).length as number;
}

export interface UnitInput {
  property_id: string;
  unit_number: string;
  unit_type?: string;
  floor_label?: string | null;
  floor?: number | null;
  rooms?: number | null;
  living_area_sqm?: number | null;
  base_rent: number;
  utilities_advance?: number | null;
  parent_unit_id?: string | null;
  has_parking?: boolean;
  has_storage?: boolean;
  status?: string;
  notes?: string | null;
}

export async function insertUnit(u: UnitInput) {
  const { data, error } = await sb.from("pm_units").insert({
    property_id: u.property_id,
    unit_number: u.unit_number,
    unit_type: u.unit_type ?? "wohnung",
    floor_label: u.floor_label ?? null,
    floor: u.floor ?? null,
    rooms: u.rooms ?? null,
    living_area_sqm: u.living_area_sqm ?? null,
    base_rent: u.base_rent,
    utilities_advance: u.utilities_advance ?? 0,
    parent_unit_id: u.parent_unit_id ?? null,
    has_parking: u.has_parking ?? false,
    has_storage: u.has_storage ?? false,
    status: u.status ?? "vacant",
    notes: u.notes ?? null,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export interface UnitRow {
  id: string;
  property_id: string;
  unit_number: string;
  unit_type: string;
  floor_label: string | null;
  floor: number | null;
  rooms: number | null;
  living_area_sqm: number | null;
  base_rent: number;
  utilities_advance: number;
  parent_unit_id: string | null;
  status: string;
}

export async function getUnits(propertyId: string): Promise<UnitRow[]> {
  const { data, error } = await sb
    .from("pm_units")
    .select("id, property_id, unit_number, unit_type, floor_label, floor, rooms, living_area_sqm, base_rent, utilities_advance, parent_unit_id, status")
    .eq("property_id", propertyId);
  if (error) throw error;
  return (data ?? []) as UnitRow[];
}

export interface TenantInput {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  employer?: string | null;
  monthly_income?: number | null;
  notes?: string | null;
}

function cleanTenant(t: TenantInput) {
  // date_of_birth may arrive as a de-CH string; store only if ISO-parseable, else null
  let dob: string | null = null;
  if (t.date_of_birth) {
    const s = String(t.date_of_birth).trim();
    const m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
    if (m) {
      const [, d, mo, y] = m;
      const yr = y.length === 2 ? `19${y}` : y;
      dob = `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      dob = s.slice(0, 10);
    }
  }
  return {
    first_name: t.first_name,
    last_name: t.last_name,
    email: t.email ?? null,
    phone: t.phone ?? null,
    date_of_birth: dob,
    nationality: t.nationality ?? null,
    employer: t.employer ?? null,
    monthly_income: t.monthly_income ?? null,
    notes: t.notes ?? null,
  };
}

export async function insertTenant(t: TenantInput) {
  const { data, error } = await sb.from("pm_tenants").insert(cleanTenant(t)).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function insertTenants(rows: TenantInput[]) {
  const { data, error } = await sb.from("pm_tenants").insert(rows.map(cleanTenant)).select("id");
  if (error) throw error;
  return (data ?? []).length as number;
}

export interface ContractInput {
  unit_id: string;
  tenant_id: string;
  contract_number?: string | null;
  start_date: string;
  end_date?: string | null;
  base_rent: number;
  utilities_advance?: number | null;
  deposit_amount?: number | null;
  notice_period_months?: number | null;
  status?: string;
  notes?: string | null;
}

export async function insertContract(c: ContractInput) {
  const { data, error } = await sb.from("pm_contracts").insert({
    unit_id: c.unit_id,
    tenant_id: c.tenant_id,
    contract_number: c.contract_number ?? null,
    start_date: c.start_date,
    end_date: c.end_date ?? null,
    base_rent: c.base_rent,
    utilities_advance: c.utilities_advance ?? 0,
    deposit_amount: c.deposit_amount ?? null,
    notice_period_months: c.notice_period_months ?? 3,
    status: c.status ?? "active",
    notes: c.notes ?? null,
  }).select("id").single();
  if (error) throw error;

  // mark the unit occupied when the contract is active
  if ((c.status ?? "active") === "active") {
    await sb.from("pm_units").update({ status: "occupied" }).eq("id", c.unit_id);
  }
  return data.id as string;
}

export interface ContractObjectLine {
  unit_id: string;
  base_rent: number;
  utilities_advance: number;
}

/**
 * Vertrag über MEHRERE Objekte (z.B. Wohnung + Keller + Parkplatz) für denselben
 * Mieter: erzeugt je Objekt einen pm_contracts-Datensatz mit gemeinsamer
 * contract_number, damit "welche Objekte gehören zu diesem Mieter" vollständig
 * abgebildet ist und die Nebenkosten je Objekt korrekt greifen.
 * Kaution nur auf der ersten (Haupt-)Zeile.
 */
export async function insertContractGroup(params: {
  tenant_id: string;
  objects: ContractObjectLine[];
  start_date: string;
  end_date?: string | null;
  deposit_amount?: number | null;
  notice_period_months?: number | null;
  status?: string;
  notes?: string | null;
  contract_number?: string | null;
}): Promise<string[]> {
  const status = params.status ?? "active";
  const groupNo = params.contract_number || `MV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

  const rows = params.objects.map((o, idx) => ({
    unit_id: o.unit_id,
    tenant_id: params.tenant_id,
    contract_number: groupNo,
    start_date: params.start_date,
    end_date: params.end_date ?? null,
    base_rent: o.base_rent,
    utilities_advance: o.utilities_advance ?? 0,
    deposit_amount: idx === 0 ? (params.deposit_amount ?? null) : null,
    notice_period_months: params.notice_period_months ?? 3,
    status,
    notes: params.notes ?? null,
  }));

  const { data, error } = await sb.from("pm_contracts").insert(rows).select("id");
  if (error) throw error;

  if (status === "active") {
    const unitIds = params.objects.map((o) => o.unit_id);
    await sb.from("pm_units").update({ status: "occupied" }).in("id", unitIds);
  }
  return (data ?? []).map((r: any) => r.id as string);
}
