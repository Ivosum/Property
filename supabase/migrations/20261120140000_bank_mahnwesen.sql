-- =====================================================================
-- Bankanbindung (camt / EBICS) je Liegenschaft  +  Mahnwesen
-- ---------------------------------------------------------------------
-- 1) pm_bank_connections: Bankzugang pro Liegenschaft. Der Zugang muss
--    bei der Bank beantragt und von ihr freigeschaltet werden (EBICS).
--    Solange der Status nicht 'active' ist, wird der Kontoauszug als
--    camt.053/054-Datei manuell importiert.
-- 2) pm_bank_statements: importierte Kontoauszüge (Datei oder EBICS).
-- 3) Mahnwesen: Zusatzfelder auf pm_payments + pm_reminders-Protokoll
--    (1./2. Zahlungserinnerung, Mahnung, Betreibung).
-- Folgt dem bestehenden PM-RLS-Muster (pm_user_roles / owner_id).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.bank_access_status AS ENUM ('none','requested','active','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.reminder_level AS ENUM ('reminder_1','reminder_2','notice','enforcement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 1) Bankzugang je Liegenschaft
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_bank_connections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    UUID NOT NULL REFERENCES public.pm_properties(id) ON DELETE CASCADE,
  bank_name      TEXT,                    -- z.B. "Zürcher Kantonalbank"
  iban           TEXT,                    -- Mietzinskonto IBAN
  qr_iban        TEXT,                    -- QR-IBAN für QR-Rechnung
  bic            TEXT,
  account_holder TEXT,                    -- Kontoinhaber (meist Eigentümer/Verwaltung)
  -- EBICS / Zugangsdaten für den automatischen Abruf
  access_method  TEXT NOT NULL DEFAULT 'manual',  -- manual | ebics | api
  ebics_host_id  TEXT,
  ebics_user_id  TEXT,
  ebics_partner_id TEXT,
  ebics_url      TEXT,
  status         public.bank_access_status NOT NULL DEFAULT 'none',
  requested_at   TIMESTAMPTZ,             -- wann bei der Bank beantragt
  activated_at   TIMESTAMPTZ,            -- wann von der Bank freigeschaltet
  last_import_at TIMESTAMPTZ,            -- letzter Kontoauszug-Import
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_bank_conn_property ON public.pm_bank_connections(property_id);

DROP TRIGGER IF EXISTS update_pm_bank_connections_updated_at ON public.pm_bank_connections;
CREATE TRIGGER update_pm_bank_connections_updated_at
  BEFORE UPDATE ON public.pm_bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2) Importierte Kontoauszüge (camt.053/054 bzw. EBICS-Abruf)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_bank_statements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    UUID NOT NULL REFERENCES public.pm_properties(id) ON DELETE CASCADE,
  connection_id  UUID REFERENCES public.pm_bank_connections(id) ON DELETE SET NULL,
  file_name      TEXT,
  format         TEXT,                    -- camt.053 | camt.054 | mt940
  period_from    DATE,
  period_to      DATE,
  entries_total  INTEGER NOT NULL DEFAULT 0,
  entries_matched INTEGER NOT NULL DEFAULT 0,
  amount_total   NUMERIC(14,2) NOT NULL DEFAULT 0,
  imported_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by    UUID,
  raw_meta       JSONB                    -- z.B. IBAN, Abschlusssaldo
);

CREATE INDEX IF NOT EXISTS idx_pm_bank_stmt_property ON public.pm_bank_statements(property_id);

-- Einzelne Zahlungseingänge aus dem Auszug (für Abgleich-Protokoll)
CREATE TABLE IF NOT EXISTS public.pm_bank_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id   UUID NOT NULL REFERENCES public.pm_bank_statements(id) ON DELETE CASCADE,
  property_id    UUID NOT NULL REFERENCES public.pm_properties(id) ON DELETE CASCADE,
  booking_date   DATE,
  value_date     DATE,
  amount         NUMERIC(14,2) NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'CHF',
  reference      TEXT,                    -- QR-Referenz / ESR
  debtor_name    TEXT,
  debtor_iban    TEXT,
  remittance_info TEXT,
  matched_payment_id UUID REFERENCES public.pm_payments(id) ON DELETE SET NULL,
  match_status   TEXT NOT NULL DEFAULT 'unmatched', -- unmatched | matched | ignored
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_bank_entries_stmt ON public.pm_bank_entries(statement_id);
CREATE INDEX IF NOT EXISTS idx_pm_bank_entries_ref ON public.pm_bank_entries(reference);

-- ---------------------------------------------------------------------
-- 3) Mahnwesen: Zusatzfelder auf pm_payments
-- ---------------------------------------------------------------------
ALTER TABLE public.pm_payments
  ADD COLUMN IF NOT EXISTS reminder_stage INTEGER NOT NULL DEFAULT 0, -- 0=keine,1=1.Erinnerung,2=2.Erinnerung,3=Mahnung,4=Betreibung
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_fees NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Mahnwesen-Protokoll (eine Zeile je versandter Erinnerung/Mahnung)
CREATE TABLE IF NOT EXISTS public.pm_reminders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id     UUID NOT NULL REFERENCES public.pm_payments(id) ON DELETE CASCADE,
  tenant_id      UUID REFERENCES public.pm_tenants(id) ON DELETE SET NULL,
  property_id    UUID REFERENCES public.pm_properties(id) ON DELETE SET NULL,
  stage          INTEGER NOT NULL,        -- 1..4
  level          public.reminder_level NOT NULL,
  fee            NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_due     NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date       DATE,                    -- neue Zahlungsfrist
  sent_channel   TEXT,                    -- email | post | portal
  document_id    UUID REFERENCES public.pm_documents(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID
);

CREATE INDEX IF NOT EXISTS idx_pm_reminders_payment ON public.pm_reminders(payment_id);
CREATE INDEX IF NOT EXISTS idx_pm_reminders_property ON public.pm_reminders(property_id);

-- Standard-Mahngebühren je Stufe (eine Zeile, id=1, anpassbar in Einstellungen)
CREATE TABLE IF NOT EXISTS public.pm_reminder_settings (
  id             INTEGER PRIMARY KEY DEFAULT 1,
  fee_stage_1    NUMERIC(10,2) NOT NULL DEFAULT 0,    -- 1. Zahlungserinnerung: meist gratis
  fee_stage_2    NUMERIC(10,2) NOT NULL DEFAULT 20,   -- 2. Zahlungserinnerung
  fee_stage_3    NUMERIC(10,2) NOT NULL DEFAULT 40,   -- Mahnung
  fee_stage_4    NUMERIC(10,2) NOT NULL DEFAULT 0,    -- Betreibung (Kosten extern)
  days_until_overdue  INTEGER NOT NULL DEFAULT 5,     -- Tage nach Fälligkeit bis überfällig
  days_between_stages INTEGER NOT NULL DEFAULT 10,    -- Frist zwischen den Stufen
  grace_days_terminate INTEGER NOT NULL DEFAULT 30,   -- Art. 257d OR: 30 Tage Frist
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_row CHECK (id = 1)
);

INSERT INTO public.pm_reminder_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- Überfällige Zahlungen markieren (manuell/geplant aufrufbar)
--   pending -> overdue, sobald due_date + Karenz überschritten.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pm_mark_overdue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grace INTEGER;
  v_count INTEGER;
BEGIN
  SELECT days_until_overdue INTO v_grace FROM public.pm_reminder_settings WHERE id = 1;
  v_grace := COALESCE(v_grace, 5);

  UPDATE public.pm_payments
     SET status = 'overdue', updated_at = now()
   WHERE status = 'pending'
     AND due_date + (v_grace || ' days')::interval < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------
-- Mahnstufe erhöhen + Protokollzeile schreiben.
--   Gibt die neue Stufe zurück. Erhöht reminder_stage auf p_stage,
--   setzt Gebühr aus den Einstellungen und legt pm_reminders an.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pm_add_reminder(p_payment_id UUID, p_stage INTEGER, p_channel TEXT DEFAULT 'email')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay      RECORD;
  v_prop     UUID;
  v_fee      NUMERIC(10,2);
  v_days     INTEGER;
  v_level    public.reminder_level;
  v_reminder UUID;
BEGIN
  SELECT p.*, c.unit_id INTO v_pay
  FROM public.pm_payments p
  LEFT JOIN public.pm_contracts c ON c.id = p.contract_id
  WHERE p.id = p_payment_id;
  IF v_pay.id IS NULL THEN RAISE EXCEPTION 'Zahlung nicht gefunden'; END IF;

  SELECT u.property_id INTO v_prop FROM public.pm_units u WHERE u.id = v_pay.unit_id;

  SELECT CASE p_stage
           WHEN 1 THEN fee_stage_1 WHEN 2 THEN fee_stage_2
           WHEN 3 THEN fee_stage_3 ELSE fee_stage_4 END,
         days_between_stages
    INTO v_fee, v_days
  FROM public.pm_reminder_settings WHERE id = 1;
  v_fee  := COALESCE(v_fee, 0);
  v_days := COALESCE(v_days, 10);

  v_level := CASE p_stage
    WHEN 1 THEN 'reminder_1'::public.reminder_level
    WHEN 2 THEN 'reminder_2'::public.reminder_level
    WHEN 3 THEN 'notice'::public.reminder_level
    ELSE 'enforcement'::public.reminder_level END;

  INSERT INTO public.pm_reminders
    (payment_id, tenant_id, property_id, stage, level, fee, amount_due, due_date, sent_channel)
  VALUES
    (p_payment_id, v_pay.tenant_id, v_prop, p_stage, v_level, v_fee,
     v_pay.amount + v_pay.reminder_fees + v_fee,
     (CURRENT_DATE + (v_days || ' days')::interval)::date, p_channel)
  RETURNING id INTO v_reminder;

  UPDATE public.pm_payments
     SET reminder_stage   = p_stage,
         last_reminder_at = now(),
         reminder_fees    = reminder_fees + v_fee,
         status           = CASE WHEN status = 'pending' THEN 'overdue' ELSE status END,
         updated_at       = now()
   WHERE id = p_payment_id;

  RETURN v_reminder;
END;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.pm_bank_connections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_bank_statements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_bank_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_reminders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_reminder_settings ENABLE ROW LEVEL SECURITY;

-- PM-Personal verwaltet alles
DROP POLICY IF EXISTS "PM staff manage bank connections" ON public.pm_bank_connections;
CREATE POLICY "PM staff manage bank connections" ON public.pm_bank_connections
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM staff manage bank statements" ON public.pm_bank_statements;
CREATE POLICY "PM staff manage bank statements" ON public.pm_bank_statements
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM staff manage bank entries" ON public.pm_bank_entries;
CREATE POLICY "PM staff manage bank entries" ON public.pm_bank_entries
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM staff manage reminders" ON public.pm_reminders;
CREATE POLICY "PM staff manage reminders" ON public.pm_reminders
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM staff manage reminder settings" ON public.pm_reminder_settings;
CREATE POLICY "PM staff manage reminder settings" ON public.pm_reminder_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

-- Eigentümer darf Bankzugang/Mahnwesen seiner Liegenschaft lesen
DROP POLICY IF EXISTS "Owner reads bank connections" ON public.pm_bank_connections;
CREATE POLICY "Owner reads bank connections" ON public.pm_bank_connections
  FOR SELECT USING (property_id IN (SELECT id FROM public.pm_properties WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owner reads reminders" ON public.pm_reminders;
CREATE POLICY "Owner reads reminders" ON public.pm_reminders
  FOR SELECT USING (property_id IN (SELECT id FROM public.pm_properties WHERE owner_id = auth.uid()));
