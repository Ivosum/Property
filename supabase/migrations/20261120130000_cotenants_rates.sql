-- =====================================================================
-- Mitmieter (Partner/Partnerin, WG) + aktuelle Referenzwerte für Mietvertrag
-- =====================================================================

-- Mitmieter als JSONB-Liste am Mieter (jeder Eintrag: Name, Geburtsdatum, Adresse)
ALTER TABLE public.pm_tenants
  ADD COLUMN IF NOT EXISTS co_tenants JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.pm_tenants.co_tenants IS 'Mitmieter/Partner: [{first_name,last_name,date_of_birth,address}]';

-- Referenzwerte (hypoth. Referenzzinssatz + Landesindex) zentral, als
-- Fallback für den Mietvertrag, falls der Live-Abruf nicht erreichbar ist.
CREATE TABLE IF NOT EXISTS public.pm_reference_rates (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  reference_rate NUMERIC(4,2) NOT NULL,   -- hypoth. Referenzzinssatz in %
  lik_index     NUMERIC(6,1) NOT NULL,    -- Landesindex der Konsumentenpreise (Punkte)
  lik_base      TEXT NOT NULL,            -- Basis, z.B. 'Dezember 2020'
  lik_stand     TEXT,                     -- Stand Monat/Jahr des Indexwerts
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.pm_reference_rates ENABLE ROW LEVEL SECURITY;

-- geprüfte aktuelle Startwerte (Fallback): Referenzzins 1.25 %, LIK Basis Dez 2020
INSERT INTO public.pm_reference_rates (id, reference_rate, lik_index, lik_base, lik_stand)
VALUES (1, 1.25, 108.0, 'Dezember 2020', 'Stand bei Erfassung')
ON CONFLICT (id) DO NOTHING;

-- Lesen: jedes PM-Teammitglied; Schreiben: Admin/Manager
DROP POLICY IF EXISTS "PM staff read rates" ON public.pm_reference_rates;
CREATE POLICY "PM staff read rates" ON public.pm_reference_rates
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM admins/managers update rates" ON public.pm_reference_rates;
CREATE POLICY "PM admins/managers update rates" ON public.pm_reference_rates
  FOR ALL USING (public.is_pm_admin(auth.uid()) OR public.has_pm_role(auth.uid(), 'pm_manager'))
  WITH CHECK (public.is_pm_admin(auth.uid()) OR public.has_pm_role(auth.uid(), 'pm_manager'));

COMMENT ON TABLE public.pm_reference_rates IS 'Aktuelle Referenzwerte für Mietvertrag (Fallback bei Live-Abruf)';
