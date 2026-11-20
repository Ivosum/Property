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

// ---------------------------------------------------------------------
// Eigentümer-Stammdaten (wiederverwendbar über Liegenschaften)
// ---------------------------------------------------------------------
export const OWNER_TYPES = [
  { value: "private", label: "Privatperson" },
  { value: "company", label: "Firma" },
];

export interface OwnerInput {
  owner_type: string;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  iban?: string | null;
  bank_name?: string | null;
  notes?: string | null;
}

export interface OwnerRow extends OwnerInput {
  id: string;
}

export async function getOwners(): Promise<OwnerRow[]> {
  const { data, error } = await sb
    .from("pm_owners")
    .select("id, owner_type, name, contact_person, email, phone, address, postal_code, city, iban, bank_name, notes")
    .order("name");
  if (error) throw error;
  return (data ?? []) as OwnerRow[];
}

export async function insertOwner(o: OwnerInput): Promise<string> {
  const created_by = await currentUserId();
  const { data, error } = await sb.from("pm_owners").insert({
    owner_type: o.owner_type || "private",
    name: o.name,
    contact_person: o.contact_person ?? null,
    email: o.email ?? null,
    phone: o.phone ?? null,
    address: o.address ?? null,
    postal_code: o.postal_code ?? null,
    city: o.city ?? null,
    country: "Schweiz",
    iban: o.iban ?? null,
    bank_name: o.bank_name ?? null,
    notes: o.notes ?? null,
    created_by,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updateOwner(id: string, o: OwnerInput): Promise<void> {
  const { error } = await sb.from("pm_owners").update({
    owner_type: o.owner_type || "private",
    name: o.name,
    contact_person: o.contact_person ?? null,
    email: o.email ?? null,
    phone: o.phone ?? null,
    address: o.address ?? null,
    postal_code: o.postal_code ?? null,
    city: o.city ?? null,
    iban: o.iban ?? null,
    bank_name: o.bank_name ?? null,
    notes: o.notes ?? null,
  }).eq("id", id);
  if (error) throw error;
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
  owner_ref_id?: string | null;
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
    owner_ref_id: p.owner_ref_id ?? null,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Liegenschaft + Einheiten in einem Schritt anlegen ("Mieterspiegel ohne Mieter").
 * Erst die Liegenschaft, dann alle Einheiten (Wohnungen, Parkplätze, Keller …).
 * Keller/Parkplätze können per `parentRef` (Zeilenindex einer Wohnung in derselben
 * Liste) an eine Wohnung gekoppelt werden.
 */
export async function insertPropertyWithUnits(
  p: PropertyInput,
  units: Array<UnitInput & { parentRef?: number | null }>,
): Promise<{ propertyId: string; unitCount: number }> {
  const propertyId = await insertProperty({ ...p, total_units: units.length || p.total_units || 0 });
  if (!units.length) return { propertyId, unitCount: 0 };

  // Phase 1: Wohnungen/Einheiten ohne Kopplung einfügen und IDs je Zeilenindex merken
  const idByIndex: (string | null)[] = new Array(units.length).fill(null);
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const id = await insertUnit({ ...u, property_id: propertyId, parent_unit_id: null });
    idByIndex[i] = id;
  }
  // Phase 2: Kopplungen nachtragen (Keller/Parkplatz -> Wohnung)
  for (let i = 0; i < units.length; i++) {
    const ref = units[i].parentRef;
    if (ref != null && ref >= 0 && idByIndex[ref]) {
      await sb.from("pm_units").update({ parent_unit_id: idByIndex[ref] }).eq("id", idByIndex[i]);
    }
  }
  return { propertyId, unitCount: units.length };
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

export async function setWhatsappGroupUrl(propertyId: string, url: string | null) {
  const { error } = await sb.from("pm_properties").update({ whatsapp_group_url: url }).eq("id", propertyId);
  if (error) throw error;
}

/**
 * Empfänger je Liegenschaft: aktive Mieter mit E-Mail und/oder Telefon,
 * gruppiert für E-Mail-Versand (mailto) und WhatsApp-Direktchat (wa.me).
 */
export async function getPropertyContacts() {
  const [{ data: props }, { data: units }, { data: contracts }, { data: tenants }] = await Promise.all([
    sb.from("pm_properties").select("id, name, city, whatsapp_group_url").order("name"),
    sb.from("pm_units").select("id, property_id"),
    sb.from("pm_contracts").select("unit_id, tenant_id, status"),
    sb.from("pm_tenants").select("id, first_name, last_name, email, phone"),
  ]);
  const unitProp = new Map((units ?? []).map((u: any) => [u.id, u.property_id]));
  const tenantById = new Map((tenants ?? []).map((t: any) => [t.id, t]));

  // aktive Mieter je Liegenschaft (dedupliziert)
  const byProp = new Map<string, Map<string, any>>();
  (contracts ?? []).forEach((c: any) => {
    if (c.status !== "active") return;
    const pid = unitProp.get(c.unit_id);
    const t = tenantById.get(c.tenant_id);
    if (!pid || !t) return;
    const m = byProp.get(pid) ?? new Map();
    m.set(t.id, t);
    byProp.set(pid, m);
  });

  return (props ?? []).map((p: any) => {
    const contacts = [...(byProp.get(p.id)?.values() ?? [])].map((t: any) => ({
      id: t.id,
      name: [t.first_name, t.last_name].filter(Boolean).join(" ") || "Mieter",
      email: t.email as string | null,
      phone: t.phone as string | null,
    }));
    return {
      id: p.id,
      name: p.name as string,
      city: p.city as string,
      whatsapp_group_url: (p.whatsapp_group_url ?? null) as string | null,
      contacts,
    };
  });
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

// Mehrere Einheiten einer Liegenschaft importieren (aus Excel/CSV).
export async function insertUnits(propertyId: string, rows: Array<Record<string, string | number | null>>) {
  const payload = rows.map((r) => ({
    property_id: propertyId,
    unit_number: String(r.unit_number ?? "").trim(),
    unit_type: typeof r.unit_type === "string" && r.unit_type ? r.unit_type : "wohnung",
    floor_label: r.floor_label ? String(r.floor_label).trim() : null,
    rooms: r.rooms != null && r.rooms !== "" ? Number(r.rooms) : null,
    living_area_sqm: r.living_area_sqm != null && r.living_area_sqm !== "" ? Number(r.living_area_sqm) : null,
    base_rent: r.base_rent != null && r.base_rent !== "" ? Number(r.base_rent) : 0,
    utilities_advance: r.utilities_advance != null && r.utilities_advance !== "" ? Number(r.utilities_advance) : 0,
    status: "vacant",
    notes: r.notes ? String(r.notes) : null,
  }));
  const { data, error } = await sb.from("pm_units").insert(payload).select("id");
  if (error) throw error;
  return (data ?? []).length as number;
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

export interface CoTenant {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  address?: string | null;
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
  co_tenants?: CoTenant[];
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
    co_tenants: (t.co_tenants ?? []).filter((c) => (c.first_name?.trim() || c.last_name?.trim())),
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

// Vertrag beenden (Mieterwechsel): Enddatum setzen, Status terminiert,
// Einheit wieder frei – sofern nicht noch ein anderer aktiver Vertrag darauf läuft.
export async function terminateContract(contractId: string, endDate: string) {
  const { data: con, error: cErr } = await sb
    .from("pm_contracts").select("id, unit_id").eq("id", contractId).single();
  if (cErr) throw cErr;

  const { error } = await sb.from("pm_contracts")
    .update({ end_date: endDate, status: "terminated", termination_date: endDate })
    .eq("id", contractId);
  if (error) throw error;

  // Einheit nur freigeben, wenn kein weiterer aktiver Vertrag darauf besteht
  const { data: others } = await sb.from("pm_contracts")
    .select("id").eq("unit_id", con.unit_id).eq("status", "active");
  if (!others || others.length === 0) {
    await sb.from("pm_units").update({ status: "vacant" }).eq("id", con.unit_id);
  }
}

export interface ContractObjectLine {
  unit_id: string;
  base_rent: number;
  utilities_advance: number;
}

/**
 * Erzeugt den Mietzins-Soll (monatliche pm_payments, Status "pending") für
 * einen Vertrag. Bei unbefristeten Verträgen werden `monthsAhead` Monate ab
 * Mietbeginn vorausgeplant, bei befristeten die tatsächliche Laufzeit
 * (max. 24 Monate). Betrag = Nettomiete + NK-Akonto (Bruttomietzins).
 * Idempotenz-Schutz: bestehende Zahlungen des Vertrags werden nicht doppelt
 * erzeugt (gleiche contract_id + due_date).
 */
export async function generateRentPayments(params: {
  contract_id: string;
  tenant_id: string;
  base_rent: number;
  utilities_advance: number;
  start_date: string;
  end_date?: string | null;
  monthsAhead?: number;
}): Promise<number> {
  const gross = (Number(params.base_rent) || 0) + (Number(params.utilities_advance) || 0);
  if (gross <= 0) return 0;

  const start = new Date(params.start_date + "T00:00:00");
  const monthsAhead = params.monthsAhead ?? 12;
  let months: number;
  if (params.end_date) {
    const end = new Date(params.end_date + "T00:00:00");
    months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    months = Math.min(Math.max(months, 1), 24);
  } else {
    months = monthsAhead;
  }

  // bereits vorhandene Fälligkeiten dieses Vertrags (keine Duplikate)
  const { data: existing } = await sb.from("pm_payments").select("due_date").eq("contract_id", params.contract_id);
  const have = new Set((existing ?? []).map((p: any) => String(p.due_date)));

  const rows: any[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const due = d.toISOString().slice(0, 10);
    if (have.has(due)) continue;
    rows.push({
      contract_id: params.contract_id,
      tenant_id: params.tenant_id,
      amount: gross,
      payment_type: "rent",
      due_date: due,
      status: "pending",
    });
  }
  if (rows.length === 0) return 0;
  const { error } = await sb.from("pm_payments").insert(rows);
  if (error) throw error;
  return rows.length;
}

// Zahlung als bezahlt markieren -> DB-Trigger verbucht automatisch
// (Bank an Mietertrag) in der Buchhaltung der Liegenschaft.
export async function markPaymentPaid(paymentId: string, paidDate?: string) {
  const { error } = await sb.from("pm_payments")
    .update({ status: "paid", paid_date: paidDate ?? new Date().toISOString().slice(0, 10) })
    .eq("id", paymentId);
  if (error) throw error;
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

  const { data, error } = await sb.from("pm_contracts").insert(rows).select("id, unit_id, base_rent, utilities_advance");
  if (error) throw error;

  const created = (data ?? []) as any[];

  if (status === "active") {
    const unitIds = params.objects.map((o) => o.unit_id);
    await sb.from("pm_units").update({ status: "occupied" }).in("id", unitIds);

    // Mietzins-Soll (monatliche Zahlungen) je Objekt generieren
    for (const c of created) {
      try {
        await generateRentPayments({
          contract_id: c.id,
          tenant_id: params.tenant_id,
          base_rent: Number(c.base_rent) || 0,
          utilities_advance: Number(c.utilities_advance) || 0,
          start_date: params.start_date,
          end_date: params.end_date ?? null,
        });
      } catch { /* Zahlungsplan ist best-effort, Vertrag bleibt bestehen */ }
    }
  }
  return created.map((r) => r.id as string);
}

// =====================================================================
// Bankanbindung je Liegenschaft (camt / EBICS)
// =====================================================================
export const BANK_ACCESS_STATUS: { value: string; label: string }[] = [
  { value: "none", label: "Kein Zugang" },
  { value: "requested", label: "Zugang beantragt" },
  { value: "active", label: "Aktiv" },
  { value: "revoked", label: "Widerrufen" },
];
export const BANK_ACCESS_LABEL: Record<string, string> =
  Object.fromEntries(BANK_ACCESS_STATUS.map((s) => [s.value, s.label]));

export interface BankConnectionInput {
  property_id: string;
  bank_name?: string | null;
  iban?: string | null;
  qr_iban?: string | null;
  bic?: string | null;
  account_holder?: string | null;
  access_method?: string;              // manual | ebics | api
  ebics_host_id?: string | null;
  ebics_user_id?: string | null;
  ebics_partner_id?: string | null;
  ebics_url?: string | null;
  status?: string;                     // bank_access_status
  notes?: string | null;
}

export async function getBankConnection(propertyId: string) {
  const { data } = await sb.from("pm_bank_connections").select("*").eq("property_id", propertyId).maybeSingle();
  return data ?? null;
}

export async function getBankConnections() {
  const { data } = await sb.from("pm_bank_connections").select("*");
  return (data ?? []) as any[];
}

// Upsert je Liegenschaft. Setzt requested_at/activated_at automatisch beim Statuswechsel.
export async function saveBankConnection(input: BankConnectionInput) {
  const existing = await getBankConnection(input.property_id);
  const now = new Date().toISOString();
  const patch: any = { ...input };
  if (input.status === "requested" && existing?.status !== "requested" && !existing?.requested_at) {
    patch.requested_at = now;
  }
  if (input.status === "active" && existing?.status !== "active") {
    patch.activated_at = now;
  }
  if (existing) {
    const { error } = await sb.from("pm_bank_connections").update(patch).eq("id", existing.id);
    if (error) throw error;
    return existing.id as string;
  }
  const { data, error } = await sb.from("pm_bank_connections").insert(patch).select("id").single();
  if (error) throw error;
  return data.id as string;
}

// =====================================================================
// Mahnwesen
// =====================================================================
export const REMINDER_STAGES: { stage: number; label: string; short: string }[] = [
  { stage: 1, label: "1. Zahlungserinnerung", short: "1. Erinnerung" },
  { stage: 2, label: "2. Zahlungserinnerung", short: "2. Erinnerung" },
  { stage: 3, label: "Mahnung (Art. 257d OR)", short: "Mahnung" },
  { stage: 4, label: "Betreibung einleiten", short: "Betreibung" },
];
export const REMINDER_STAGE_LABEL: Record<number, string> =
  Object.fromEntries(REMINDER_STAGES.map((s) => [s.stage, s.label]));

export async function getReminderSettings() {
  const { data } = await sb.from("pm_reminder_settings").select("*").eq("id", 1).maybeSingle();
  return data ?? {
    fee_stage_1: 0, fee_stage_2: 20, fee_stage_3: 40, fee_stage_4: 0,
    days_until_overdue: 5, days_between_stages: 10, grace_days_terminate: 30,
  };
}

export async function saveReminderSettings(patch: Record<string, number>) {
  const { error } = await sb.from("pm_reminder_settings")
    .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) throw error;
}

// Überfällige Zahlungen markieren (pending -> overdue). Liefert Anzahl.
export async function markOverduePayments(): Promise<number> {
  const { data, error } = await sb.rpc("pm_mark_overdue");
  if (error) throw error;
  return Number(data ?? 0);
}

// Nächste Mahnstufe auslösen: schreibt Protokollzeile + erhöht Stufe/Gebühr.
export async function addReminder(paymentId: string, stage: number, channel = "email") {
  const { data, error } = await sb.rpc("pm_add_reminder", {
    p_payment_id: paymentId, p_stage: stage, p_channel: channel,
  });
  if (error) throw error;
  return data as string; // reminder id
}

// Mahnungen zu einer Zahlung (Protokoll)
export async function getReminders(paymentId: string) {
  const { data } = await sb.from("pm_reminders").select("*").eq("payment_id", paymentId).order("stage");
  return (data ?? []) as any[];
}

// =====================================================================
// camt-Import: Kontoauszug abgleichen und offene Zahlungen verbuchen
// =====================================================================
import { parseCamt, normalizeRef, type CamtStatement } from "@/lib/camt";

export interface CamtMatchResult {
  statementId: string | null;
  total: number;       // Gutschriften im Auszug
  matched: number;     // automatisch zugeordnet + verbucht
  unmatched: number;
  details: {
    amount: number;
    date: string | null;
    reference: string | null;
    debtor: string | null;
    status: "matched" | "unmatched";
    paymentId?: string;
    tenant?: string;
  }[];
}

/**
 * Importiert einen camt.053/054-Auszug für eine Liegenschaft, gleicht die
 * Gutschriften gegen offene (pending/overdue) Zahlungen dieser Liegenschaft ab
 * und markiert Treffer als bezahlt (löst die Auto-Buchung aus).
 *
 * Match-Strategie:
 *   1) QR-/ESR-Referenz (exakt, nur Ziffern)
 *   2) Fallback: exakter Betrag unter den offenen Zahlungen der Liegenschaft
 *      (nur wenn eindeutig genau eine passt)
 */
export async function importCamtForProperty(propertyId: string, xmlText: string, fileName?: string): Promise<CamtMatchResult> {
  const stmt: CamtStatement = parseCamt(xmlText);
  const credits = stmt.entries.filter((e) => e.creditDebit === "CRDT");

  // offene Zahlungen dieser Liegenschaft laden (über Vertrag -> Einheit -> Liegenschaft)
  const [{ data: units }, { data: contracts }, { data: tenants }] = await Promise.all([
    sb.from("pm_units").select("id, property_id").eq("property_id", propertyId),
    sb.from("pm_contracts").select("id, unit_id"),
    sb.from("pm_tenants").select("id, first_name, last_name"),
  ]);
  const unitIds = new Set((units ?? []).map((u: any) => u.id));
  const contractIds = new Set((contracts ?? []).filter((c: any) => unitIds.has(c.unit_id)).map((c: any) => c.id));
  const tenantName = new Map((tenants ?? []).map((t: any) => [t.id, [t.first_name, t.last_name].filter(Boolean).join(" ") || "Unbenannt"]));

  const { data: openPays } = await sb.from("pm_payments")
    .select("id, tenant_id, contract_id, amount, reference, status")
    .in("status", ["pending", "overdue"]);
  const open = (openPays ?? []).filter((p: any) => contractIds.has(p.contract_id));

  // Index: Referenz -> Zahlung
  const byRef = new Map<string, any>();
  open.forEach((p: any) => { const r = normalizeRef(p.reference); if (r) byRef.set(r, p); });

  // Statement-Datensatz anlegen
  let statementId: string | null = null;
  try {
    const { data: s } = await sb.from("pm_bank_statements").insert({
      property_id: propertyId,
      file_name: fileName ?? null,
      format: stmt.format,
      period_from: stmt.periodFrom,
      period_to: stmt.periodTo,
      entries_total: credits.length,
      amount_total: credits.reduce((s: number, e) => s + e.amount, 0),
      raw_meta: { iban: stmt.iban, currency: stmt.currency },
    }).select("id").single();
    statementId = s?.id ?? null;
  } catch { /* best effort */ }

  const used = new Set<string>();
  const details: CamtMatchResult["details"] = [];
  let matched = 0;

  for (const e of credits) {
    let pay: any = null;
    const ref = normalizeRef(e.reference);
    if (ref && byRef.has(ref) && !used.has(byRef.get(ref).id)) {
      pay = byRef.get(ref);
    }
    // Fallback: eindeutiger Betrag
    if (!pay) {
      const cands = open.filter((p: any) => !used.has(p.id) && Math.abs(Number(p.amount) - e.amount) < 0.01);
      if (cands.length === 1) pay = cands[0];
    }

    if (pay) {
      used.add(pay.id);
      matched++;
      try {
        await markPaymentPaid(pay.id, e.bookingDate ?? undefined);
      } catch { /* Verbuchung best effort */ }
      // Bank-Entry protokollieren
      if (statementId) {
        try {
          await sb.from("pm_bank_entries").insert({
            statement_id: statementId, property_id: propertyId,
            booking_date: e.bookingDate, value_date: e.valueDate,
            amount: e.amount, currency: e.currency, reference: e.reference,
            debtor_name: e.debtorName, debtor_iban: e.debtorIban, remittance_info: e.remittanceInfo,
            matched_payment_id: pay.id, match_status: "matched",
          });
        } catch { /* ignore */ }
      }
      details.push({ amount: e.amount, date: e.bookingDate, reference: e.reference, debtor: e.debtorName, status: "matched", paymentId: pay.id, tenant: tenantName.get(pay.tenant_id) });
    } else {
      if (statementId) {
        try {
          await sb.from("pm_bank_entries").insert({
            statement_id: statementId, property_id: propertyId,
            booking_date: e.bookingDate, value_date: e.valueDate,
            amount: e.amount, currency: e.currency, reference: e.reference,
            debtor_name: e.debtorName, debtor_iban: e.debtorIban, remittance_info: e.remittanceInfo,
            match_status: "unmatched",
          });
        } catch { /* ignore */ }
      }
      details.push({ amount: e.amount, date: e.bookingDate, reference: e.reference, debtor: e.debtorName, status: "unmatched" });
    }
  }

  // Zähler + last_import am Statement/Connection aktualisieren
  if (statementId) {
    try { await sb.from("pm_bank_statements").update({ entries_matched: matched }).eq("id", statementId); } catch { /* ignore */ }
  }
  try {
    await sb.from("pm_bank_connections").update({ last_import_at: new Date().toISOString() }).eq("property_id", propertyId);
  } catch { /* ignore */ }

  return { statementId, total: credits.length, matched, unmatched: credits.length - matched, details };
}
