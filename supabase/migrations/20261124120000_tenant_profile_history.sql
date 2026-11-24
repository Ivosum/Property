-- Erweitertes Mieterprofil + lückenlose Änderungshistorie (nie löschen, nur überschreiben).

-- 1) Neue Profilfelder auf pm_tenants
ALTER TABLE public.pm_tenants
  ADD COLUMN IF NOT EXISTS current_address      TEXT,
  ADD COLUMN IF NOT EXISTS marital_status       TEXT,          -- ledig|verheiratet|eingetragene_partnerschaft|geschieden|verwitwet|getrennt
  ADD COLUMN IF NOT EXISTS has_liability_insurance BOOLEAN,
  ADD COLUMN IF NOT EXISTS liability_company    TEXT,
  ADD COLUMN IF NOT EXISTS liability_policy_no   TEXT,
  ADD COLUMN IF NOT EXISTS garage_brand          TEXT,          -- Fahrzeug-Marke (für Garage/Parkplatz)
  ADD COLUMN IF NOT EXISTS garage_plate          TEXT,          -- Kontrollschild
  ADD COLUMN IF NOT EXISTS partner               JSONB,         -- {first_name,last_name,date_of_birth,marital_status,...}
  ADD COLUMN IF NOT EXISTS id_front_path         TEXT,          -- Storage-Pfad Ausweis Vorderseite
  ADD COLUMN IF NOT EXISTS id_back_path          TEXT,          -- Storage-Pfad Ausweis Rückseite
  ADD COLUMN IF NOT EXISTS partner_id_front_path TEXT,
  ADD COLUMN IF NOT EXISTS partner_id_back_path  TEXT;

-- 2) Änderungshistorie: jede Überschreibung eines Profilfelds wird hier festgehalten
CREATE TABLE IF NOT EXISTS public.pm_tenant_field_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  field TEXT NOT NULL,            -- Spaltenname
  old_value TEXT,                 -- alter Wert (als Text)
  new_value TEXT,                 -- neuer Wert (als Text)
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID                 -- auth.uid() falls vorhanden
);
CREATE INDEX IF NOT EXISTS idx_tenant_history ON public.pm_tenant_field_history (tenant_id, field, changed_at DESC);

ALTER TABLE public.pm_tenant_field_history ENABLE ROW LEVEL SECURITY;

-- Verwaltung sieht alle Historien
DROP POLICY IF EXISTS "PM reads tenant history" ON public.pm_tenant_field_history;
CREATE POLICY "PM reads tenant history" ON public.pm_tenant_field_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.pm_user_roles r WHERE r.user_id = auth.uid()));

-- Mieter sieht die Historie seiner eigenen Felder (für durchgestrichene Altwerte)
DROP POLICY IF EXISTS "Tenant reads own history" ON public.pm_tenant_field_history;
CREATE POLICY "Tenant reads own history" ON public.pm_tenant_field_history
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
  );

-- 3) Trigger: bei UPDATE von pm_tenants alte Werte der überwachten Felder wegschreiben
CREATE OR REPLACE FUNCTION public.pm_tenants_track_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f TEXT;
  fields TEXT[] := ARRAY[
    'first_name','last_name','email','phone','date_of_birth','current_address',
    'marital_status','has_liability_insurance','liability_company','liability_policy_no',
    'garage_brand','garage_plate','partner','nationality','employer'
  ];
  old_v TEXT;
  new_v TEXT;
BEGIN
  FOREACH f IN ARRAY fields LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', f, f)
      INTO old_v, new_v USING OLD, NEW;
    IF old_v IS DISTINCT FROM new_v THEN
      INSERT INTO public.pm_tenant_field_history (tenant_id, field, old_value, new_value, changed_by)
      VALUES (NEW.id, f, old_v, new_v, auth.uid());
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_tenants_history ON public.pm_tenants;
CREATE TRIGGER trg_pm_tenants_history
  AFTER UPDATE ON public.pm_tenants
  FOR EACH ROW EXECUTE FUNCTION public.pm_tenants_track_history();

-- 4) Privater Bucket für Ausweis-Fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-ids', 'tenant-ids', false)
ON CONFLICT (id) DO NOTHING;

-- Mieter darf seine eigenen ID-Dateien hochladen (Pfad beginnt mit seiner tenant-id)
DROP POLICY IF EXISTS "Tenant uploads own id" ON storage.objects;
CREATE POLICY "Tenant uploads own id" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tenant-ids'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.pm_tenants WHERE user_id = auth.uid()
    )
  );

-- Verwaltung darf alle ID-Dateien lesen
DROP POLICY IF EXISTS "PM reads tenant ids" ON storage.objects;
CREATE POLICY "PM reads tenant ids" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tenant-ids'
    AND EXISTS (SELECT 1 FROM public.pm_user_roles r WHERE r.user_id = auth.uid())
  );

-- 5) Mieter aktualisiert sein eigenes Profil über eine kontrollierte RPC.
--    Nimmt ein JSONB-Patch: nur enthaltene Schlüssel werden gesetzt (auch auf leer),
--    nur erlaubte Felder, nur die eigene Zeile. Der History-Trigger protokolliert alles.
CREATE OR REPLACE FUNCTION public.tenant_update_own_profile(_patch JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid UUID;
  allowed TEXT[] := ARRAY[
    'phone','current_address','marital_status','has_liability_insurance',
    'liability_company','liability_policy_no','garage_brand','garage_plate',
    'partner','id_front_path','id_back_path','partner_id_front_path',
    'partner_id_back_path','date_of_birth'
  ];
  k TEXT;
  setters TEXT := '';
BEGIN
  SELECT id INTO tid FROM public.pm_tenants WHERE user_id = auth.uid() LIMIT 1;
  IF tid IS NULL THEN RAISE EXCEPTION 'Kein Mieterprofil gefunden'; END IF;

  FOR k IN SELECT jsonb_object_keys(_patch) LOOP
    IF k = ANY(allowed) THEN
      IF setters <> '' THEN setters := setters || ', '; END IF;
      IF k = 'has_liability_insurance' THEN
        setters := setters || format('%I = ($1->>%L)::boolean', k, k);
      ELSIF k = 'date_of_birth' THEN
        setters := setters || format('%I = NULLIF($1->>%L, '''')::date', k, k);
      ELSIF k = 'partner' THEN
        setters := setters || format('%I = ($1->%L)', k, k);
      ELSE
        setters := setters || format('%I = NULLIF($1->>%L, '''')', k, k);
      END IF;
    END IF;
  END LOOP;

  IF setters = '' THEN RETURN; END IF;

  EXECUTE format('UPDATE public.pm_tenants SET %s, updated_at = now() WHERE id = %L', setters, tid)
    USING _patch;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_update_own_profile(JSONB) TO authenticated;
