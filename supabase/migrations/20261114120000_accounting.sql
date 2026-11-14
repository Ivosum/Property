-- =====================================================================
-- Liegenschaftsbuchhaltung (doppelte Buchführung) je Liegenschaft
-- Kontenplan, Journal mit Soll/Haben-Zeilen, Belege, Auto-Mietbuchung.
-- Folgt dem bestehenden PM-RLS-Muster (pm_user_roles).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('asset','liability','equity','income','expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.journal_status AS ENUM ('draft','posted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Kontenplan je Liegenschaft
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES public.pm_properties(id) ON DELETE CASCADE,
  code         TEXT NOT NULL,                 -- z.B. "6000"
  name         TEXT NOT NULL,                 -- z.B. "Mietertrag"
  type         public.account_type NOT NULL,
  is_system    BOOLEAN NOT NULL DEFAULT false, -- aus Standard-Kontenplan erzeugt
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, code)
);

-- ---------------------------------------------------------------------
-- Buchungssatz (Journal-Eintrag)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_journal_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES public.pm_properties(id) ON DELETE CASCADE,
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  description   TEXT NOT NULL,
  reference     TEXT,                          -- Belegnummer / Referenz
  document_id   UUID REFERENCES public.pm_documents(id) ON DELETE SET NULL,
  source        TEXT NOT NULL DEFAULT 'manual', -- manual | rent | receipt
  source_id     UUID,                          -- z.B. pm_payments.id bei Auto-Miete
  status        public.journal_status NOT NULL DEFAULT 'posted',
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Buchungszeilen (Soll/Haben)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_journal_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID NOT NULL REFERENCES public.pm_journal_entries(id) ON DELETE CASCADE,
  account_id    UUID NOT NULL REFERENCES public.pm_accounts(id) ON DELETE RESTRICT,
  debit         NUMERIC(14,2) NOT NULL DEFAULT 0,   -- Soll
  credit        NUMERIC(14,2) NOT NULL DEFAULT 0,   -- Haben
  line_text     TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT debit_or_credit CHECK (debit >= 0 AND credit >= 0)
);

CREATE INDEX IF NOT EXISTS idx_pm_accounts_property ON public.pm_accounts(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_journal_entries_property ON public.pm_journal_entries(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_journal_entries_date ON public.pm_journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_pm_journal_lines_entry ON public.pm_journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_pm_journal_lines_account ON public.pm_journal_lines(account_id);

-- updated_at Trigger
DROP TRIGGER IF EXISTS update_pm_journal_entries_updated_at ON public.pm_journal_entries;
CREATE TRIGGER update_pm_journal_entries_updated_at
  BEFORE UPDATE ON public.pm_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- Standard-Kontenplan für eine Liegenschaft anlegen
-- (vereinfachter Schweizer Immobilien-Kontenrahmen)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pm_seed_accounts(p_property_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pm_accounts (property_id, code, name, type, is_system, sort_order) VALUES
    (p_property_id, '1000', 'Kasse',                      'asset',     true, 10),
    (p_property_id, '1020', 'Bank / Mietzinskonto',       'asset',     true, 20),
    (p_property_id, '1100', 'Forderungen Mieter',         'asset',     true, 30),
    (p_property_id, '2000', 'Kreditoren / Verbindlichkeiten','liability',true, 40),
    (p_property_id, '2300', 'Mietzinsdepots',             'liability', true, 50),
    (p_property_id, '2800', 'Eigenkapital / Eigentümer',  'equity',    true, 60),
    (p_property_id, '6000', 'Mietertrag',                 'income',    true, 70),
    (p_property_id, '6050', 'Nebenkostenertrag',          'income',    true, 80),
    (p_property_id, '6090', 'Übriger Ertrag',             'income',    true, 90),
    (p_property_id, '6400', 'Unterhalt & Reparaturen',    'expense',   true, 100),
    (p_property_id, '6420', 'Heizung / Energie',          'expense',   true, 110),
    (p_property_id, '6430', 'Wasser / Abwasser',          'expense',   true, 120),
    (p_property_id, '6440', 'Hauswartung / Reinigung',    'expense',   true, 130),
    (p_property_id, '6500', 'Versicherungen',             'expense',   true, 140),
    (p_property_id, '6510', 'Verwaltungshonorar',         'expense',   true, 150),
    (p_property_id, '6570', 'Gebühren / Abgaben',         'expense',   true, 160),
    (p_property_id, '6900', 'Übriger Aufwand',            'expense',   true, 170)
  ON CONFLICT (property_id, code) DO NOTHING;
END;
$$;

-- Bestehende Liegenschaften mit Kontenplan versorgen
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.pm_properties LOOP
    PERFORM public.pm_seed_accounts(r.id);
  END LOOP;
END $$;

-- Trigger: neue Liegenschaft bekommt automatisch einen Kontenplan
CREATE OR REPLACE FUNCTION public.pm_property_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.pm_seed_accounts(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_property_seed_accounts ON public.pm_properties;
CREATE TRIGGER trg_pm_property_seed_accounts
  AFTER INSERT ON public.pm_properties
  FOR EACH ROW EXECUTE FUNCTION public.pm_property_after_insert();

-- ---------------------------------------------------------------------
-- Auto-Buchung: bezahlte Miete -> Buchung (Bank an Mietertrag)
-- Läuft, wenn eine pm_payments-Zeile auf 'paid' wechselt.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pm_payment_to_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_unit_id     UUID;
  v_bank        UUID;
  v_income      UUID;
  v_entry       UUID;
BEGIN
  -- nur bei Übergang auf 'paid'
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;

  -- Liegenschaft über Vertrag -> Einheit ermitteln
  SELECT u.property_id, c.unit_id INTO v_property_id, v_unit_id
  FROM public.pm_contracts c
  JOIN public.pm_units u ON u.id = c.unit_id
  WHERE c.id = NEW.contract_id;

  IF v_property_id IS NULL THEN RETURN NEW; END IF;

  -- Doppelte Buchung vermeiden
  IF EXISTS (SELECT 1 FROM public.pm_journal_entries
             WHERE source = 'rent' AND source_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_bank   FROM public.pm_accounts WHERE property_id = v_property_id AND code = '1020';
  SELECT id INTO v_income FROM public.pm_accounts WHERE property_id = v_property_id AND code = '6000';
  IF v_bank IS NULL OR v_income IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.pm_journal_entries
    (property_id, entry_date, description, reference, source, source_id, status)
  VALUES
    (v_property_id, COALESCE(NEW.paid_date, CURRENT_DATE),
     'Mietzahlung', NEW.reference, 'rent', NEW.id, 'posted')
  RETURNING id INTO v_entry;

  INSERT INTO public.pm_journal_lines (entry_id, account_id, debit, credit, line_text, sort_order) VALUES
    (v_entry, v_bank,   NEW.amount, 0, 'Zahlungseingang', 0),
    (v_entry, v_income, 0, NEW.amount, 'Mietertrag',      1);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_payment_to_journal ON public.pm_payments;
CREATE TRIGGER trg_pm_payment_to_journal
  AFTER INSERT OR UPDATE OF status ON public.pm_payments
  FOR EACH ROW EXECUTE FUNCTION public.pm_payment_to_journal();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.pm_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_journal_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_journal_lines    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PM staff manage accounts" ON public.pm_accounts;
CREATE POLICY "PM staff manage accounts" ON public.pm_accounts
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM staff manage journal entries" ON public.pm_journal_entries;
CREATE POLICY "PM staff manage journal entries" ON public.pm_journal_entries
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM staff manage journal lines" ON public.pm_journal_lines;
CREATE POLICY "PM staff manage journal lines" ON public.pm_journal_lines
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

-- Eigentümer darf die Buchhaltung seiner Liegenschaft lesen
DROP POLICY IF EXISTS "Owner reads accounts" ON public.pm_accounts;
CREATE POLICY "Owner reads accounts" ON public.pm_accounts
  FOR SELECT USING (
    property_id IN (SELECT id FROM public.pm_properties WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner reads journal entries" ON public.pm_journal_entries;
CREATE POLICY "Owner reads journal entries" ON public.pm_journal_entries
  FOR SELECT USING (
    property_id IN (SELECT id FROM public.pm_properties WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner reads journal lines" ON public.pm_journal_lines;
CREATE POLICY "Owner reads journal lines" ON public.pm_journal_lines
  FOR SELECT USING (
    entry_id IN (
      SELECT e.id FROM public.pm_journal_entries e
      JOIN public.pm_properties p ON p.id = e.property_id
      WHERE p.owner_id = auth.uid()
    )
  );
