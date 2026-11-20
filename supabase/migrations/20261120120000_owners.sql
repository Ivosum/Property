-- =====================================================================
-- Eigentümer-Stammdaten (wiederverwendbar über mehrere Liegenschaften)
-- Eigentümer einmal erfassen, bei neuen Liegenschaften nur noch auswählen.
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE public.owner_type AS ENUM ('private', 'company');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pm_owners (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type   public.owner_type NOT NULL DEFAULT 'private',
  name         TEXT NOT NULL,                 -- Firma oder Person
  contact_person TEXT,                        -- Ansprechpartner (bei Firma)
  email        TEXT,
  phone        TEXT,
  address      TEXT,
  postal_code  TEXT,
  city         TEXT,
  country      TEXT DEFAULT 'Schweiz',
  iban         TEXT,
  bank_name    TEXT,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pm_owners ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pm_owners_name ON public.pm_owners(name);

-- updated_at pflegen
DROP TRIGGER IF EXISTS update_pm_owners_updated_at ON public.pm_owners;
CREATE TRIGGER update_pm_owners_updated_at
  BEFORE UPDATE ON public.pm_owners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Verknüpfung Liegenschaft -> Eigentümer-Stammdatensatz
-- (owner_id auf auth.users bleibt für Besitz/Portal-Zugang unverändert)
ALTER TABLE public.pm_properties
  ADD COLUMN IF NOT EXISTS owner_ref_id UUID REFERENCES public.pm_owners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pm_properties_owner_ref ON public.pm_properties(owner_ref_id);

-- RLS: PM-Team (jede Rolle) darf Eigentümer lesen; Admin/Manager verwalten
DROP POLICY IF EXISTS "PM staff read owners" ON public.pm_owners;
CREATE POLICY "PM staff read owners" ON public.pm_owners
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM admins/managers manage owners" ON public.pm_owners;
CREATE POLICY "PM admins/managers manage owners" ON public.pm_owners
  FOR ALL USING (
    public.is_pm_admin(auth.uid()) OR public.has_pm_role(auth.uid(), 'pm_manager')
  ) WITH CHECK (
    public.is_pm_admin(auth.uid()) OR public.has_pm_role(auth.uid(), 'pm_manager')
  );

COMMENT ON TABLE public.pm_owners IS 'Eigentümer-Stammdaten, wiederverwendbar über Liegenschaften';
COMMENT ON COLUMN public.pm_properties.owner_ref_id IS 'Verknüpfung zum Eigentümer-Stammdatensatz (pm_owners)';
