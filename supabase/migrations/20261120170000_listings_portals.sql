-- =====================================================================
-- Inserierung: Objektdaten + Portal-Veröffentlichung (Homegate / Flatfox)
-- ---------------------------------------------------------------------
-- pm_listings erweitert um die Felder, die Portale (IDX/ImmoXML, Flatfox-API)
-- verlangen. pm_listing_channels bildet je Inserat die Veröffentlichung auf
-- einem Portal ab (Status, externe ID/URL, letzter Sync). pm_portal_credentials
-- hält die Zugangsdaten je Portal (nur PM-Personal, serverseitig genutzt).
-- Dazu ein Storage-Bucket für Inserat-Bilder.
-- =====================================================================

-- Objektdaten fürs Inserat (ergänzen, was camt/Portale brauchen)
ALTER TABLE public.pm_listings
  ADD COLUMN IF NOT EXISTS property_id   UUID REFERENCES public.pm_properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rooms         NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS living_area   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS floor_label   TEXT,
  ADD COLUMN IF NOT EXISTS utilities     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS object_type   TEXT DEFAULT 'wohnung',   -- wohnung | haus | gewerbe | parkplatz
  ADD COLUMN IF NOT EXISTS address_line  TEXT,
  ADD COLUMN IF NOT EXISTS postal_code   TEXT,
  ADD COLUMN IF NOT EXISTS city          TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS deposit       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS features      TEXT[];                    -- z.B. Balkon, Lift, Einbauküche

-- ---------------------------------------------------------------------
-- Veröffentlichungs-Kanäle je Inserat
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.channel_status AS ENUM ('not_published','queued','published','paused','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pm_listing_channels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES public.pm_listings(id) ON DELETE CASCADE,
  portal       TEXT NOT NULL,                 -- homegate | flatfox | immoscout
  status       public.channel_status NOT NULL DEFAULT 'not_published',
  external_id  TEXT,
  external_url TEXT,
  last_sync_at TIMESTAMPTZ,
  error_msg    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, portal)
);
CREATE INDEX IF NOT EXISTS idx_pm_listing_channels_listing ON public.pm_listing_channels(listing_id);

DROP TRIGGER IF EXISTS update_pm_listing_channels_updated_at ON public.pm_listing_channels;
CREATE TRIGGER update_pm_listing_channels_updated_at
  BEFORE UPDATE ON public.pm_listing_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- Portal-Zugangsdaten (eine Zeile je Portal). Nur PM-Personal.
-- Werte werden serverseitig (Edge Function) verwendet; nicht im Client anzeigen.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_portal_credentials (
  portal       TEXT PRIMARY KEY,              -- homegate | flatfox | immoscout
  api_key      TEXT,                          -- Flatfox API-Key
  provider_id  TEXT,                          -- Homegate/SMG Anbieter-ID
  publisher_id TEXT,                          -- IDX Publisher
  extra        JSONB,                         -- weitere Felder je Portal
  active       BOOLEAN NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Storage-Bucket für Inserat-Bilder (öffentlich lesbar für Portale)
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('pm-listings', 'pm-listings', true)
ON CONFLICT (id) DO NOTHING;

-- Bilder: PM-Personal darf hochladen/ändern, alle dürfen lesen (public bucket)
DROP POLICY IF EXISTS "PM staff upload listing images" ON storage.objects;
CREATE POLICY "PM staff upload listing images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pm-listings' AND EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM staff update listing images" ON storage.objects;
CREATE POLICY "PM staff update listing images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pm-listings' AND EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM staff delete listing images" ON storage.objects;
CREATE POLICY "PM staff delete listing images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pm-listings' AND EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public read listing images" ON storage.objects;
CREATE POLICY "Public read listing images" ON storage.objects
  FOR SELECT USING (bucket_id = 'pm-listings');

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.pm_listing_channels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_portal_credentials  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PM staff manage listing channels" ON public.pm_listing_channels;
CREATE POLICY "PM staff manage listing channels" ON public.pm_listing_channels
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM staff manage portal credentials" ON public.pm_portal_credentials;
CREATE POLICY "PM staff manage portal credentials" ON public.pm_portal_credentials
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

-- Portale als Zeilen anlegen (noch inaktiv)
INSERT INTO public.pm_portal_credentials (portal, active) VALUES
  ('flatfox', false), ('homegate', false)
ON CONFLICT (portal) DO NOTHING;
