import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

// ── Makler-Leads (eigene Kontakte) ───────────────────────────────────────────
export interface OmLead {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  converted_user_id: string | null;
  created_at: string;
}

export async function getMyLeads(): Promise<OmLead[]> {
  const { data: auth } = await sb.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return [];
  const { data, error } = await sb
    .from("om_leads")
    .select("id, first_name, last_name, email, phone, notes, status, converted_user_id, created_at")
    .eq("broker_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OmLead[];
}

export async function createLead(input: {
  first_name: string; last_name?: string; email?: string; phone?: string; notes?: string;
}): Promise<string> {
  const { data: auth } = await sb.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error("Nicht angemeldet");
  const { data, error } = await sb.from("om_leads").insert({
    broker_id: uid,
    first_name: input.first_name.trim(),
    last_name: input.last_name?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    notes: input.notes?.trim() || null,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updateLead(id: string, patch: Partial<Pick<OmLead, "first_name" | "last_name" | "email" | "phone" | "notes" | "status">>): Promise<void> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
  clean.updated_at = new Date().toISOString();
  const { error } = await sb.from("om_leads").update(clean).eq("id", id);
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await sb.from("om_leads").delete().eq("id", id);
  if (error) throw error;
}

// ── Immobilien des Maklers (für Auswahl zum Senden) ──────────────────────────
export interface OmProperty {
  id: string;
  title: string;
  property_type: string;
  city: string;
  canton: string;
  price: number;
  currency: string;
  living_area_sqm: number | null;
  rooms: number | null;
  share_token: string | null;
  featured_image_url: string | null;
}

// Alle Immobilien, die dieser Makler betreut oder besitzt.
export async function getMyProperties(): Promise<OmProperty[]> {
  const { data: auth } = await sb.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return [];
  const { data, error } = await sb
    .from("properties")
    .select("id, title, property_type, city, canton, price, currency, living_area_sqm, rooms, share_token, featured_image_url, broker_id, owner_id")
    .or(`broker_id.eq.${uid},owner_id.eq.${uid}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OmProperty[];
}

// Merken, welche Immobilien an einen Lead gesendet wurden.
export async function recordLeadProperties(leadId: string, propertyIds: string[]): Promise<void> {
  if (propertyIds.length === 0) return;
  const rows = propertyIds.map((pid) => ({ lead_id: leadId, property_id: pid }));
  const { error } = await sb.from("om_lead_properties").upsert(rows, { onConflict: "lead_id,property_id", ignoreDuplicates: true });
  if (error) throw error;
}

// ── Makler-Code (eigener Referral-Code für Registrierungs-QR) ───────────────
export async function getMyBrokerCode(): Promise<string | null> {
  const { data: auth } = await sb.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return null;
  const { data, error } = await sb.from("profiles").select("broker_ref_code").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  return data?.broker_ref_code ?? null;
}

// Makler per Code auflösen (für Registrierungsseite ?ref=CODE).
export async function resolveBrokerByCode(code: string): Promise<{ broker_id: string; broker_name: string | null } | null> {
  const { data, error } = await sb.rpc("broker_by_ref_code", { _code: code });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row?.broker_id) return null;
  return row;
}

// Öffentliches Mini-Exposé per Token.
export async function getPublicProperty(token: string): Promise<any | null> {
  const { data, error } = await sb.rpc("public_property_by_token", { _token: token });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return row;
}

export const formatCHF = (n: number, currency = "CHF") =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency, maximumFractionDigits: 0 }).format(n || 0);

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartment: "Wohnung", house: "Haus", commercial: "Gewerbe", land: "Grundstück",
};
