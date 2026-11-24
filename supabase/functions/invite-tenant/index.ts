// Edge Function: invite-tenant
// Legt für einen Mieter einen Portal-Zugang an (Supabase Auth-User),
// verknüpft pm_tenants.user_id und verschickt eine Einladungs-/Passwort-Mail.
// Nur aufrufbar von eingeloggten Verwaltungs-Nutzern (pm_user_roles).
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
    // Basis-URL fürs Portal-Redirect (Einladungslink). Fallback = Vercel-App.
    const SITE_URL = Deno.env.get("TENANT_PORTAL_URL") ?? Deno.env.get("SITE_URL") ?? "";

    // 1) Caller authentifizieren und Verwaltungs-Rolle prüfen
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Nicht angemeldet." }, 401);

    const { data: roles } = await caller
      .from("pm_user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (!roles || roles.length === 0) {
      return json({ error: "Keine Berechtigung – nur für die Verwaltung." }, 403);
    }

    // 2) Eingabe
    const { tenant_id, redirect_to } = await req.json().catch(() => ({}));
    if (!tenant_id) return json({ error: "tenant_id fehlt." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3) Mieter laden
    const { data: tenant, error: tErr } = await admin
      .from("pm_tenants")
      .select("id, first_name, last_name, email, user_id")
      .eq("id", tenant_id)
      .maybeSingle();
    if (tErr || !tenant) return json({ error: "Mieter nicht gefunden." }, 404);
    if (!tenant.email) return json({ error: "Für diesen Mieter ist keine E-Mail hinterlegt." }, 400);

    const email = String(tenant.email).trim().toLowerCase();
    const redirect = redirect_to || (SITE_URL ? `${SITE_URL.replace(/\/$/, "")}/tenant-portal` : undefined);

    // 4) Prüfen, ob schon ein Auth-User mit dieser E-Mail existiert
    //    (listUsers ist paginiert; wir suchen die erste passende Seite(n) ab)
    let existing: { id: string; email?: string } | undefined;
    for (let page = 1; page <= 20 && !existing; page++) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const users = list?.users ?? [];
      existing = users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (users.length < 200) break;
    }

    let userId: string;
    let mode: "created" | "linked_existing" | "reinvited";

    if (existing) {
      userId = existing.id;
      mode = tenant.user_id === userId ? "reinvited" : "linked_existing";
      // Neue Einladungs-/Reset-Mail verschicken, damit der Mieter ein Passwort setzen kann
      await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: redirect ? { redirectTo: redirect } : undefined,
      }).catch(() => {});
    } else {
      // Neuen Auth-User per Einladungsmail anlegen
      const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { first_name: tenant.first_name, last_name: tenant.last_name, is_tenant: true },
        redirectTo: redirect,
      });
      if (invErr || !invited?.user) {
        // Fallback: User ohne Mailversand anlegen (z.B. SMTP nicht konfiguriert)
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { first_name: tenant.first_name, last_name: tenant.last_name, is_tenant: true },
        });
        if (cErr || !created?.user) {
          return json({ error: "Konto konnte nicht erstellt werden: " + (invErr?.message || cErr?.message) }, 500);
        }
        userId = created.user.id;
        mode = "created";
      } else {
        userId = invited.user.id;
        mode = "created";
      }
    }

    // 5) pm_tenants.user_id verknüpfen
    const { error: linkErr } = await admin
      .from("pm_tenants")
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq("id", tenant.id);
    if (linkErr) return json({ error: "Verknüpfung fehlgeschlagen: " + linkErr.message }, 500);

    return json({ ok: true, mode, email, user_id: userId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }, 500);
  }
});
