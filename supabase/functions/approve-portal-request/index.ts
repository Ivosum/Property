// Edge Function: approve-portal-request  (verify_jwt = true)
// Verwaltung bestätigt oder lehnt eine Beitrittsanfrage ab.
// Bei Bestätigung wird der Auth-User (user_id) mit dem Mieter der Einheit
// verknüpft (bestehender Mieter des aktiven Vertrags, sonst neu angelegt).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Caller muss eingeloggte Verwaltung sein
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Nicht angemeldet." }, 401);
    const { data: roles } = await caller.from("pm_user_roles").select("role").eq("user_id", userData.user.id);
    if (!roles || roles.length === 0) return json({ error: "Keine Berechtigung." }, 403);

    const { request_id, action } = await req.json().catch(() => ({}));
    if (!request_id || !["approve", "reject"].includes(action)) {
      return json({ error: "request_id und action (approve|reject) erforderlich." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: reqRow, error: reqErr } = await admin
      .from("pm_portal_requests")
      .select("id, unit_id, user_id, first_name, last_name, email, phone, date_of_birth, current_address, status")
      .eq("id", request_id)
      .maybeSingle();
    if (reqErr || !reqRow) return json({ error: "Anfrage nicht gefunden." }, 404);
    if (reqRow.status !== "pending") return json({ error: "Diese Anfrage wurde bereits bearbeitet." }, 409);

    const decidedBase = { decided_at: new Date().toISOString(), decided_by: userData.user.id };

    if (action === "reject") {
      await admin.from("pm_portal_requests").update({ status: "rejected", ...decidedBase }).eq("id", request_id);
      return json({ ok: true, action: "reject" });
    }

    // approve: Mieter der Einheit finden (aktiver Vertrag) …
    let tenantId: string | null = null;
    const { data: contract } = await admin
      .from("pm_contracts")
      .select("tenant_id, status")
      .eq("unit_id", reqRow.unit_id)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contract?.tenant_id) {
      tenantId = contract.tenant_id;
      // user_id am bestehenden Mieter setzen; Geburtsdatum/Adresse nur ergänzen, wenn leer
      const patch: Record<string, unknown> = { user_id: reqRow.user_id, portal_invited_at: new Date().toISOString() };
      const { data: existingT } = await admin.from("pm_tenants")
        .select("date_of_birth, current_address").eq("id", tenantId).maybeSingle();
      if (reqRow.date_of_birth && !existingT?.date_of_birth) patch.date_of_birth = reqRow.date_of_birth;
      if (reqRow.current_address && !existingT?.current_address) patch.current_address = reqRow.current_address;
      await admin.from("pm_tenants").update(patch).eq("id", tenantId);
    } else {
      // Kein Mieter hinterlegt → aus Anfragedaten neu anlegen
      const { data: newTenant, error: tErr } = await admin.from("pm_tenants").insert({
        first_name: reqRow.first_name, last_name: reqRow.last_name,
        email: reqRow.email, phone: reqRow.phone,
        date_of_birth: reqRow.date_of_birth, current_address: reqRow.current_address,
        user_id: reqRow.user_id, portal_invited_at: new Date().toISOString(),
      }).select("id").single();
      if (tErr || !newTenant) return json({ error: "Mieter konnte nicht angelegt werden: " + (tErr?.message ?? "") }, 500);
      tenantId = newTenant.id;
    }

    await admin.from("pm_portal_requests")
      .update({ status: "approved", tenant_id: tenantId, ...decidedBase })
      .eq("id", request_id);

    return json({ ok: true, action: "approve", tenant_id: tenantId, linked_existing: !!contract?.tenant_id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }, 500);
  }
});
