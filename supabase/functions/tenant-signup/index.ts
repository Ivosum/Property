// Edge Function: tenant-signup  (ÖFFENTLICH – verify_jwt = false)
// Mieter-Selbstanmeldung per QR-Token. Legt einen Auth-User mit gewähltem
// Passwort an und erstellt eine Beitrittsanfrage (pending). Die Verknüpfung
// mit dem Mieter/Vertrag macht erst die Verwaltung bei der Bestätigung.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "").trim();
    const first_name = String(body.first_name ?? "").trim();
    const last_name = String(body.last_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const message = body.message ? String(body.message).trim().slice(0, 500) : null;
    const password = String(body.password ?? "");

    if (!token) return json({ error: "Ungültiger Link (kein Token)." }, 400);
    if (!first_name || !last_name) return json({ error: "Bitte Vor- und Nachnamen angeben." }, 400);
    if (!isEmail(email)) return json({ error: "Bitte eine gültige E-Mail-Adresse angeben." }, 400);
    if (password.length < 8) return json({ error: "Das Passwort muss mindestens 8 Zeichen haben." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Einheit über Token auflösen
    const { data: unitRows, error: unitErr } = await admin.rpc("portal_unit_by_token", { _token: token });
    const unit = Array.isArray(unitRows) ? unitRows[0] : unitRows;
    if (unitErr || !unit?.unit_id) return json({ error: "Dieser Anmelde-Link ist ungültig oder abgelaufen." }, 404);

    // 2) Doppelte offene Anfrage für dieselbe Einheit+E-Mail vermeiden
    const { data: dupes } = await admin
      .from("pm_portal_requests")
      .select("id, status")
      .eq("unit_id", unit.unit_id)
      .eq("email", email)
      .eq("status", "pending");
    if (dupes && dupes.length > 0) {
      return json({ ok: true, duplicate: true, message: "Es besteht bereits eine offene Anfrage für diese Einheit und E-Mail." });
    }

    // 3) Auth-User anlegen (oder bestehenden finden)
    let userId: string | null = null;
    let existing: { id: string; email?: string } | undefined;
    for (let page = 1; page <= 20 && !existing; page++) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const users = list?.users ?? [];
      existing = users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (users.length < 200) break;
    }

    if (existing) {
      userId = existing.id;
      // Passwort NICHT überschreiben – bestehendes Konto behält sein Passwort.
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name, is_tenant: true },
      });
      if (cErr || !created?.user) {
        return json({ error: "Konto konnte nicht erstellt werden: " + (cErr?.message ?? "") }, 500);
      }
      userId = created.user.id;
    }

    // 4) Beitrittsanfrage anlegen (pending)
    const { error: reqErr } = await admin.from("pm_portal_requests").insert({
      unit_id: unit.unit_id,
      user_id: userId,
      first_name, last_name, email, phone, message,
      status: "pending",
    });
    if (reqErr) return json({ error: "Anfrage konnte nicht gespeichert werden: " + reqErr.message }, 500);

    return json({
      ok: true,
      existing_account: !!existing,
      property_name: unit.property_name,
      unit_label: [unit.floor_label, unit.unit_number].filter(Boolean).join(" "),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }, 500);
  }
});
