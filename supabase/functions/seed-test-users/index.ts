import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestUser {
  email: string;
  password: string;
  role: "admin" | "buyer" | "seller" | "broker";
  pmRole?: "pm_admin" | "pm_manager" | "pm_employee";
  firstName: string;
  lastName: string;
}

const testUsers: TestUser[] = [
  // Off-Market Users (have off-market roles)
  { email: "admin@test.ch", password: "test1234", role: "admin", pmRole: "pm_admin", firstName: "Admin", lastName: "Test" },
  { email: "kaeufer@test.ch", password: "test1234", role: "buyer", firstName: "Max", lastName: "Käufer" },
  { email: "verkaeufer@test.ch", password: "test1234", role: "seller", firstName: "Anna", lastName: "Verkäufer" },
  { email: "makler@test.ch", password: "test1234", role: "broker", firstName: "Peter", lastName: "Makler" },
  // Property Management Users (PM-only, no off-market role for manager/employee)
  { email: "pm-admin@test.ch", password: "test1234", role: "admin", pmRole: "pm_admin", firstName: "Thomas", lastName: "Verwaltung" },
  { email: "pm-manager@test.ch", password: "test1234", role: "buyer", pmRole: "pm_manager", firstName: "Sandra", lastName: "Bewirtschafterin" },
  { email: "pm-employee@test.ch", password: "test1234", role: "buyer", pmRole: "pm_employee", firstName: "Michael", lastName: "Mitarbeiter" },
  // Tenant User (for tenant portal login)
  { email: "mieter@test.ch", password: "test1234", role: "buyer", firstName: "Hans", lastName: "Müller" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const user of testUsers) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === user.email);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        results.push({ email: user.email, success: true, error: "Already exists, updating roles" });
      } else {
        // Create user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: { first_name: user.firstName, last_name: user.lastName },
        });

        if (authError) {
          results.push({ email: user.email, success: false, error: authError.message });
          continue;
        }

        userId = authData.user!.id;

        // Create profile
        await supabaseAdmin.from("profiles").upsert({
          user_id: userId,
          first_name: user.firstName,
          last_name: user.lastName,
        });

        // Assign off-market role
        await supabaseAdmin.from("user_roles").upsert({
          user_id: userId,
          role: user.role,
        });
      }

      // Assign PM role if specified
      if (user.pmRole) {
        await supabaseAdmin.from("pm_user_roles").upsert(
          { user_id: userId, role: user.pmRole },
          { onConflict: "user_id,role" }
        );
      }

      results.push({ email: user.email, success: true });
    }

    // Create sample property management data
    const { data: pmAdmin } = await supabaseAdmin
      .from("pm_user_roles")
      .select("user_id")
      .eq("role", "pm_admin")
      .limit(1)
      .single();

    if (pmAdmin) {
      // Create sample properties
      const properties = [
        { owner_id: pmAdmin.user_id, name: "Bahnhofstrasse 12", address: "Bahnhofstrasse 12", city: "Zürich", postal_code: "8001", canton: "ZH", property_type: "Mehrfamilienhaus", year_built: 1985, total_units: 12 },
        { owner_id: pmAdmin.user_id, name: "Seestrasse 45", address: "Seestrasse 45", city: "Zürich", postal_code: "8002", canton: "ZH", property_type: "Mehrfamilienhaus", year_built: 1990, total_units: 8 },
        { owner_id: pmAdmin.user_id, name: "Hauptstrasse 8", address: "Hauptstrasse 8", city: "Winterthur", postal_code: "8400", canton: "ZH", property_type: "Geschäftshaus", year_built: 2000, total_units: 6 },
      ];

      for (const prop of properties) {
        const { data: existingProp } = await supabaseAdmin
          .from("pm_properties")
          .select("id")
          .eq("name", prop.name)
          .maybeSingle();

        if (!existingProp) {
          const { data: newProp } = await supabaseAdmin
            .from("pm_properties")
            .insert(prop)
            .select("id")
            .single();

          if (newProp) {
            // Create sample units for this property
            const units = [];
            for (let i = 0; i < 4; i++) {
              units.push({
                property_id: newProp.id,
                unit_number: `${i === 0 ? 'EG' : i + '.OG'} ${i % 2 === 0 ? 'links' : 'rechts'}`,
                floor: i,
                rooms: 3.5,
                living_area_sqm: 85 + (i * 5),
                base_rent: 1650 + (i * 100),
                utilities_advance: 200,
                status: i < 3 ? 'occupied' : 'vacant',
              });
            }
            await supabaseAdmin.from("pm_units").insert(units);
          }
        }
      }

      // Create sample tenant and link to user account
      const { data: tenantUser } = await supabaseAdmin.auth.admin.listUsers();
      const mieterUser = tenantUser?.users?.find((u) => u.email === "mieter@test.ch");

      const { data: existingTenant } = await supabaseAdmin
        .from("pm_tenants")
        .select("id")
        .eq("email", "mieter@test.ch")
        .maybeSingle();

      let tenantId: string;

      if (!existingTenant) {
        const { data: newTenant } = await supabaseAdmin.from("pm_tenants").insert({
          first_name: "Hans",
          last_name: "Müller",
          email: "mieter@test.ch",
          phone: "+41 79 123 45 67",
          user_id: mieterUser?.id || null,
          access_token: "demo-tenant-token-12345",
          token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).select("id").single();
        tenantId = newTenant?.id;
      } else {
        tenantId = existingTenant.id;
        // Update existing tenant with user_id if not set
        if (mieterUser) {
          await supabaseAdmin.from("pm_tenants").update({ user_id: mieterUser.id }).eq("id", existingTenant.id);
        }
      }

      // Create active contract for tenant if not exists
      if (tenantId) {
        const { data: firstUnit } = await supabaseAdmin
          .from("pm_units")
          .select("id")
          .eq("status", "occupied")
          .limit(1)
          .maybeSingle();

        if (firstUnit) {
          const { data: existingContract } = await supabaseAdmin
            .from("pm_contracts")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("status", "active")
            .maybeSingle();

          if (!existingContract) {
            await supabaseAdmin.from("pm_contracts").insert({
              tenant_id: tenantId,
              unit_id: firstUnit.id,
              base_rent: 1850,
              utilities_advance: 200,
              start_date: "2023-01-01",
              status: "active",
              deposit_amount: 5550,
              deposit_paid: true,
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
