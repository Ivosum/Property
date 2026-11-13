-- Wohnungsabnahme-Protokolle (Ein-/Auszug) mit Mängelpositionen und Fotos
-- Folgt dem bestehenden PM-RLS-Muster (pm_user_roles / has_pm_role).

-- =====================================================================
-- Enums
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.handover_type AS ENUM ('move_in', 'move_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.handover_status AS ENUM ('draft', 'completed', 'signed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.handover_condition AS ENUM ('good', 'minor_defect', 'defect', 'missing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- Tabellen
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.pm_handover_protocols (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         UUID NOT NULL REFERENCES public.pm_units(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES public.pm_tenants(id) ON DELETE SET NULL,
  contract_id     UUID REFERENCES public.pm_contracts(id) ON DELETE SET NULL,
  type            public.handover_type NOT NULL DEFAULT 'move_in',
  status          public.handover_status NOT NULL DEFAULT 'draft',
  handover_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  present_persons TEXT,
  meter_electricity TEXT,
  meter_water       TEXT,
  meter_gas         TEXT,
  keys_count      INTEGER,
  notes           TEXT,
  tenant_signature     TEXT,  -- Data-URL der Unterschrift
  landlord_signature   TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_handover_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id   UUID NOT NULL REFERENCES public.pm_handover_protocols(id) ON DELETE CASCADE,
  room          TEXT NOT NULL,
  element       TEXT NOT NULL,
  condition     public.handover_condition NOT NULL DEFAULT 'good',
  description   TEXT,
  cost_bearer   TEXT,            -- z.B. "Mieter", "Vermieter", "geteilt"
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_handover_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id   UUID NOT NULL REFERENCES public.pm_handover_protocols(id) ON DELETE CASCADE,
  item_id       UUID REFERENCES public.pm_handover_items(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,   -- Pfad im Bucket 'handover-photos'
  caption       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_handover_items_protocol ON public.pm_handover_items(protocol_id);
CREATE INDEX IF NOT EXISTS idx_handover_photos_protocol ON public.pm_handover_photos(protocol_id);
CREATE INDEX IF NOT EXISTS idx_handover_protocols_unit ON public.pm_handover_protocols(unit_id);

-- =====================================================================
-- updated_at Trigger
-- =====================================================================
DROP TRIGGER IF EXISTS update_pm_handover_protocols_updated_at ON public.pm_handover_protocols;
CREATE TRIGGER update_pm_handover_protocols_updated_at
  BEFORE UPDATE ON public.pm_handover_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE public.pm_handover_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_handover_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_handover_photos    ENABLE ROW LEVEL SECURITY;

-- Protokolle: jedes PM-Teammitglied darf sehen und verwalten
CREATE POLICY "PM staff can view handover protocols" ON public.pm_handover_protocols
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "PM staff can manage handover protocols" ON public.pm_handover_protocols
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

-- Mieter dürfen ihre eigenen Protokolle lesen
CREATE POLICY "Tenants can view own handover protocols" ON public.pm_handover_protocols
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
  );

-- Positionen: Zugriff gekoppelt an das Protokoll
CREATE POLICY "PM staff can view handover items" ON public.pm_handover_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "PM staff can manage handover items" ON public.pm_handover_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenants can view own handover items" ON public.pm_handover_items
  FOR SELECT USING (
    protocol_id IN (
      SELECT id FROM public.pm_handover_protocols
      WHERE tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
    )
  );

-- Fotos: Zugriff gekoppelt an das Protokoll
CREATE POLICY "PM staff can view handover photos" ON public.pm_handover_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "PM staff can manage handover photos" ON public.pm_handover_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenants can view own handover photos" ON public.pm_handover_photos
  FOR SELECT USING (
    protocol_id IN (
      SELECT id FROM public.pm_handover_protocols
      WHERE tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
    )
  );

-- =====================================================================
-- Storage-Bucket für Abnahme-Fotos
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('handover-photos', 'handover-photos', false)
ON CONFLICT (id) DO NOTHING;

-- PM-Team darf Fotos hochladen / sehen / löschen
CREATE POLICY "PM staff can upload handover photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'handover-photos'
    AND EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "PM staff can view handover photos storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'handover-photos'
    AND EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "PM staff can delete handover photos storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'handover-photos'
    AND EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

-- =====================================================================
-- Storage-Bucket für Vertrags-Vorlagen (Mietvertrag-PDF)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "PM staff can read templates"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'templates'
    AND EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );
