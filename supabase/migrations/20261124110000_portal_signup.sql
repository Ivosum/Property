-- Mieter-Selbstanmeldung per QR-Code (pro Einheit) mit Verwaltungs-Bestätigung.

-- 1) Pro Einheit ein nicht-ratbarer Anmelde-Token
ALTER TABLE public.pm_units
  ADD COLUMN IF NOT EXISTS signup_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Bestehende Einheiten ohne Token nachziehen
UPDATE public.pm_units SET signup_token = gen_random_uuid() WHERE signup_token IS NULL;

-- 2) Beitrittsanfragen
CREATE TABLE IF NOT EXISTS public.pm_portal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.pm_units(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- angelegter Auth-User
  tenant_id UUID REFERENCES public.pm_tenants(id) ON DELETE SET NULL, -- nach Bestätigung
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.pm_portal_requests ENABLE ROW LEVEL SECURITY;

-- Verwaltung darf alle Anfragen sehen/bearbeiten
DROP POLICY IF EXISTS "PM manage portal requests" ON public.pm_portal_requests;
CREATE POLICY "PM manage portal requests" ON public.pm_portal_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.pm_user_roles r WHERE r.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.pm_user_roles r WHERE r.user_id = auth.uid())
  );

-- Der anmeldende Nutzer darf seine eigene Anfrage sehen (Statusabfrage im Portal)
DROP POLICY IF EXISTS "Requester reads own request" ON public.pm_portal_requests;
CREATE POLICY "Requester reads own request" ON public.pm_portal_requests
  FOR SELECT USING (user_id = auth.uid());

-- 3) Öffentliches Nachschlagen per Token: nur Liegenschaft + Wohnung, nichts Sensibles.
--    SECURITY DEFINER, damit die anonyme Anmeldeseite den Kontext anzeigen kann.
CREATE OR REPLACE FUNCTION public.portal_unit_by_token(_token UUID)
RETURNS TABLE (
  unit_id UUID,
  unit_number TEXT,
  floor_label TEXT,
  unit_type TEXT,
  property_name TEXT,
  property_address TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.unit_number, u.floor_label, u.unit_type::text,
         p.name, (p.address || ', ' || p.postal_code || ' ' || p.city)
  FROM public.pm_units u
  JOIN public.pm_properties p ON p.id = u.property_id
  WHERE u.signup_token = _token
  LIMIT 1;
$$;

-- Für anonyme (anon) und eingeloggte Nutzer aufrufbar
GRANT EXECUTE ON FUNCTION public.portal_unit_by_token(UUID) TO anon, authenticated;

-- Index für schnelle Status-Übersicht in der Verwaltung
CREATE INDEX IF NOT EXISTS idx_portal_requests_status ON public.pm_portal_requests (status, created_at DESC);
