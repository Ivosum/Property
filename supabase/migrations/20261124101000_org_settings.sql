-- Verwaltungs-Kontaktdaten fürs Mieterportal (eine Zeile pro Verwaltung/Owner).
CREATE TABLE IF NOT EXISTS public.pm_org_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_name TEXT NOT NULL DEFAULT 'Hausverwaltung',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_org_settings ENABLE ROW LEVEL SECURITY;

-- Verwaltung (PM-Rollen) darf lesen/schreiben
DROP POLICY IF EXISTS "PM can manage org settings" ON public.pm_org_settings;
CREATE POLICY "PM can manage org settings" ON public.pm_org_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.pm_user_roles r WHERE r.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.pm_user_roles r WHERE r.user_id = auth.uid())
  );

-- Mieter dürfen die Kontaktdaten lesen (sie brauchen sie im Portal)
DROP POLICY IF EXISTS "Tenants can read org settings" ON public.pm_org_settings;
CREATE POLICY "Tenants can read org settings" ON public.pm_org_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pm_tenants t WHERE t.user_id = auth.uid())
  );

-- Standard-Kontakt (MONEST GmbH) als einzige Zeile anlegen, falls noch keine da ist.
INSERT INTO public.pm_org_settings (org_name, contact_email, contact_phone, address)
SELECT 'MONEST GmbH', 'info@monest.ch', '+41 79 864 88 56', 'Wilenstrasse 222, 8832 Wilen b. Wollerau'
WHERE NOT EXISTS (SELECT 1 FROM public.pm_org_settings);
