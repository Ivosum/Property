-- Off-Market: Makler-Leads, Makler-Code/Referral, Mini-Exposé-Share-Token.

-- ── 1) Makler-Code + feste Referral-Verknüpfung auf profiles ─────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS broker_ref_code TEXT UNIQUE,     -- eigener Code eines Maklers
  ADD COLUMN IF NOT EXISTS broker_referral_id UUID REFERENCES auth.users(id) ON DELETE SET NULL; -- fester Makler eines Käufers/Verkäufers

-- Kurzen, gut teilbaren Code erzeugen (8 Zeichen, Base32-ähnlich, ohne verwechselbare Zeichen)
CREATE OR REPLACE FUNCTION public.gen_broker_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    out := out || substr(chars, floor(random()*length(chars))::int + 1, 1);
  END LOOP;
  RETURN out;
END;
$$;

-- Bestehenden Maklern einen Code geben (falls noch keiner)
UPDATE public.profiles p
SET broker_ref_code = public.gen_broker_code()
WHERE p.broker_ref_code IS NULL
  AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'broker');

-- ── 2) Makler-Leads (eigene Kontaktliste, ohne Login) ────────────────────────
CREATE TABLE IF NOT EXISTS public.om_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'neu',          -- neu | kontaktiert | interessiert | konto
  converted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- wenn Lead zu Konto wurde
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.om_leads ENABLE ROW LEVEL SECURITY;

-- Makler verwaltet nur seine eigenen Leads; Admin sieht alle
DROP POLICY IF EXISTS "Broker manages own leads" ON public.om_leads;
CREATE POLICY "Broker manages own leads" ON public.om_leads
  FOR ALL USING (
    broker_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    broker_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

-- ── 3) Welche Immobilien ein Makler an einen Lead gesendet hat (Historie) ────
CREATE TABLE IF NOT EXISTS public.om_lead_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.om_leads(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id, property_id)
);
ALTER TABLE public.om_lead_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Broker manages own lead props" ON public.om_lead_properties;
CREATE POLICY "Broker manages own lead props" ON public.om_lead_properties
  FOR ALL USING (
    lead_id IN (SELECT id FROM public.om_leads WHERE broker_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    lead_id IN (SELECT id FROM public.om_leads WHERE broker_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- ── 4) Share-Token pro Immobilie für Mini-Exposé ─────────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE DEFAULT gen_random_uuid();
UPDATE public.properties SET share_token = gen_random_uuid() WHERE share_token IS NULL;

-- Öffentliches Mini-Exposé: NUR Eckdaten (keine sensiblen Felder, keine Adresse im Detail).
CREATE OR REPLACE FUNCTION public.public_property_by_token(_token UUID)
RETURNS TABLE (
  title TEXT,
  property_type TEXT,
  city TEXT,
  canton TEXT,
  price NUMERIC,
  currency TEXT,
  living_area_sqm NUMERIC,
  plot_area_sqm NUMERIC,
  rooms NUMERIC,
  featured_image_url TEXT,
  broker_ref_code TEXT,
  broker_name TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.title, p.property_type, p.city, p.canton, p.price, p.currency,
         p.living_area_sqm, p.plot_area_sqm, p.rooms, p.featured_image_url,
         bp.broker_ref_code,
         NULLIF(TRIM(COALESCE(bp.first_name,'') || ' ' || COALESCE(bp.last_name,'')), '')
  FROM public.properties p
  LEFT JOIN public.profiles bp ON bp.user_id = p.broker_id
  WHERE p.share_token = _token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.public_property_by_token(UUID) TO anon, authenticated;

-- ── 5) Makler-Code auflösen (für Registrierungs-Link ?ref=CODE) ──────────────
-- Zeigt der Registrierungsseite den Maklernamen an; setzt nichts.
CREATE OR REPLACE FUNCTION public.broker_by_ref_code(_code TEXT)
RETURNS TABLE (broker_id UUID, broker_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id,
         NULLIF(TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), '')
  FROM public.profiles p
  WHERE p.broker_ref_code = upper(_code)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.broker_by_ref_code(TEXT) TO anon, authenticated;
