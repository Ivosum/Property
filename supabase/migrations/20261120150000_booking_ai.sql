-- =====================================================================
-- Automatische Buchungserkennung mit Bestätigungs-Workflow + Lernregeln
-- ---------------------------------------------------------------------
-- Ziel: Bankbewegungen (aus camt-Import) werden automatisch einem Konto
-- zugeordnet (erst gelernte Regeln, dann Heuristik/KI). Der Bewirtschafter
-- bestätigt den Vorschlag (-> echte Buchung in pm_journal_entries), passt
-- das Konto an (-> Buchung + Regel wird gelernt) oder lehnt ab.
--
-- pm_booking_suggestions : ein Buchungsvorschlag je Bankbewegung
-- pm_booking_rules        : gelernte Muster (Text/Auftraggeber -> Konto)
-- pm_confirm_booking()    : Vorschlag bestätigen -> Journalbuchung
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE public.suggestion_status AS ENUM ('pending','confirmed','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Buchungsvorschläge
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_booking_suggestions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    UUID NOT NULL REFERENCES public.pm_properties(id) ON DELETE CASCADE,
  bank_entry_id  UUID REFERENCES public.pm_bank_entries(id) ON DELETE CASCADE,
  entry_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  description    TEXT NOT NULL,
  reference      TEXT,
  counterparty   TEXT,                         -- Auftraggeber / Empfänger
  amount         NUMERIC(14,2) NOT NULL,       -- immer positiv
  direction      TEXT NOT NULL,                -- 'in' (Gutschrift) | 'out' (Belastung)
  -- Vorgeschlagene Gegenbuchung (Bank ist die eine Seite):
  debit_account_id  UUID REFERENCES public.pm_accounts(id) ON DELETE SET NULL,
  credit_account_id UUID REFERENCES public.pm_accounts(id) ON DELETE SET NULL,
  suggested_account_id UUID REFERENCES public.pm_accounts(id) ON DELETE SET NULL, -- das Gegenkonto (Nicht-Bank)
  confidence     NUMERIC(4,3) NOT NULL DEFAULT 0,   -- 0..1
  source         TEXT NOT NULL DEFAULT 'rule',       -- rule | heuristic | ai | manual
  reasoning      TEXT,                               -- KI-/Regel-Begründung
  status         public.suggestion_status NOT NULL DEFAULT 'pending',
  journal_entry_id UUID REFERENCES public.pm_journal_entries(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ,
  decided_by     UUID
);

CREATE INDEX IF NOT EXISTS idx_pm_booking_sug_property ON public.pm_booking_suggestions(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_booking_sug_status ON public.pm_booking_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_pm_booking_sug_bankentry ON public.pm_booking_suggestions(bank_entry_id);

-- ---------------------------------------------------------------------
-- Lernregeln: Muster -> Konto. Werden bei jeder manuellen Korrektur
-- gestärkt (hit_count), damit künftig automatisch zugeordnet wird.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_booking_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    UUID REFERENCES public.pm_properties(id) ON DELETE CASCADE, -- NULL = global über alle Liegenschaften
  match_field    TEXT NOT NULL DEFAULT 'counterparty', -- counterparty | reference | text
  pattern        TEXT NOT NULL,                 -- Kleinbuchstaben-Teilstring
  direction      TEXT,                          -- 'in' | 'out' | NULL (egal)
  account_code   TEXT NOT NULL,                 -- Zielkonto (Code, damit über Liegenschaften stabil)
  hit_count      INTEGER NOT NULL DEFAULT 1,
  last_used_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, match_field, pattern, direction)
);

CREATE INDEX IF NOT EXISTS idx_pm_booking_rules_prop ON public.pm_booking_rules(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_booking_rules_pattern ON public.pm_booking_rules(pattern);

-- ---------------------------------------------------------------------
-- Vorschlag bestätigen -> echte Buchung erzeugen.
--   Bank-Konto (1020) ist die Gegenseite:
--     direction 'in'  -> Soll Bank / Haben Gegenkonto
--     direction 'out' -> Soll Gegenkonto / Haben Bank
--   p_account_id: das vom Bewirtschafter bestätigte/korrigierte Gegenkonto.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pm_confirm_booking(p_suggestion_id UUID, p_account_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sug   RECORD;
  v_bank  UUID;
  v_entry UUID;
  v_uid   UUID := auth.uid();
BEGIN
  SELECT * INTO v_sug FROM public.pm_booking_suggestions WHERE id = p_suggestion_id;
  IF v_sug.id IS NULL THEN RAISE EXCEPTION 'Vorschlag nicht gefunden'; END IF;
  IF v_sug.status = 'confirmed' THEN RETURN v_sug.journal_entry_id; END IF;

  SELECT id INTO v_bank FROM public.pm_accounts WHERE property_id = v_sug.property_id AND code = '1020';
  IF v_bank IS NULL OR p_account_id IS NULL THEN RAISE EXCEPTION 'Konto fehlt'; END IF;

  INSERT INTO public.pm_journal_entries
    (property_id, entry_date, description, reference, source, source_id, status, created_by)
  VALUES
    (v_sug.property_id, v_sug.entry_date, v_sug.description, v_sug.reference,
     'bank', v_sug.bank_entry_id, 'posted', v_uid)
  RETURNING id INTO v_entry;

  IF v_sug.direction = 'in' THEN
    INSERT INTO public.pm_journal_lines (entry_id, account_id, debit, credit, line_text, sort_order) VALUES
      (v_entry, v_bank,        v_sug.amount, 0, 'Zahlungseingang', 0),
      (v_entry, p_account_id,  0, v_sug.amount, v_sug.description, 1);
  ELSE
    INSERT INTO public.pm_journal_lines (entry_id, account_id, debit, credit, line_text, sort_order) VALUES
      (v_entry, p_account_id,  v_sug.amount, 0, v_sug.description, 0),
      (v_entry, v_bank,        0, v_sug.amount, 'Zahlungsausgang', 1);
  END IF;

  UPDATE public.pm_booking_suggestions
     SET status = 'confirmed', journal_entry_id = v_entry,
         suggested_account_id = p_account_id,
         decided_at = now(), decided_by = v_uid
   WHERE id = p_suggestion_id;

  RETURN v_entry;
END;
$$;

-- ---------------------------------------------------------------------
-- Regel lernen/stärken (Code-basiert, damit über Liegenschaften gültig).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pm_learn_rule(
  p_property_id UUID, p_match_field TEXT, p_pattern TEXT, p_direction TEXT, p_account_code TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_pattern IS NULL OR length(trim(p_pattern)) < 3 THEN RETURN; END IF;
  INSERT INTO public.pm_booking_rules (property_id, match_field, pattern, direction, account_code, created_by)
  VALUES (p_property_id, p_match_field, lower(trim(p_pattern)), p_direction, p_account_code, auth.uid())
  ON CONFLICT (property_id, match_field, pattern, direction)
  DO UPDATE SET hit_count = public.pm_booking_rules.hit_count + 1,
                account_code = EXCLUDED.account_code,
                last_used_at = now();
END;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.pm_booking_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_booking_rules       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PM staff manage booking suggestions" ON public.pm_booking_suggestions;
CREATE POLICY "PM staff manage booking suggestions" ON public.pm_booking_suggestions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM staff manage booking rules" ON public.pm_booking_rules;
CREATE POLICY "PM staff manage booking rules" ON public.pm_booking_rules
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));
