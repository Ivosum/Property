-- =====================================================================
-- Einheiten-Typen, Stockwerk-Label und optionale Kopplung an eine Wohnung
-- Erweitert pm_units, damit pro Liegenschaft Wohnungen (TOP1, EG, 1.OG…),
-- Keller, Garagen-/Aussenparkplätze und Gewerbe getrennt erfasst,
-- einem Mieter zugeordnet und in der Nebenkostenabrechnung korrekt
-- behandelt werden können.
-- =====================================================================

-- Typ einer Mieteinheit
DO $$ BEGIN
  CREATE TYPE public.unit_type AS ENUM (
    'wohnung', 'gewerbe', 'keller', 'garage', 'aussenparkplatz', 'lager', 'sonstiges'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pm_units
  ADD COLUMN IF NOT EXISTS unit_type public.unit_type NOT NULL DEFAULT 'wohnung';

-- Stockwerk-Bezeichnung (UG, EG, 1.OG, 2.OG …) – frei, da Schweizer Notation
ALTER TABLE public.pm_units
  ADD COLUMN IF NOT EXISTS floor_label TEXT;

-- optionale Kopplung: Keller/Parkplatz gehört zu einer Wohnung
ALTER TABLE public.pm_units
  ADD COLUMN IF NOT EXISTS parent_unit_id UUID
    REFERENCES public.pm_units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pm_units_parent ON public.pm_units(parent_unit_id);
CREATE INDEX IF NOT EXISTS idx_pm_units_type ON public.pm_units(unit_type);

-- Bestehende Einheiten sind Wohnungen (Default greift bereits) – nichts weiter nötig.

COMMENT ON COLUMN public.pm_units.unit_type IS 'Art der Einheit: wohnung/gewerbe/keller/garage/aussenparkplatz/lager/sonstiges';
COMMENT ON COLUMN public.pm_units.floor_label IS 'Stockwerk-Label wie UG, EG, 1.OG';
COMMENT ON COLUMN public.pm_units.parent_unit_id IS 'Optionale Zugehörigkeit zu einer Wohnung (z.B. Keller zu TOP1)';
