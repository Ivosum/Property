-- =====================================================================
-- Abo-Modell für die Verwaltung: Pläne + aktives Abo
-- ---------------------------------------------------------------------
-- Abrechnung: Grundgebühr pro Firma + Preis pro Verwaltungseinheit/Monat.
-- 3 Stufen (Starter/Pro/Enterprise) mit gestaffelten Funktionen.
-- pm_plans      : Katalog der Pläne (Preise, Limits, Feature-Flags)
-- pm_subscription: das aktuell gewählte Abo (eine Zeile; später je org_id)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.pm_plans (
  code           TEXT PRIMARY KEY,              -- starter | pro | enterprise
  name           TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  base_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,   -- Grundgebühr / Monat
  price_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,   -- pro Einheit / Monat
  included_units INTEGER,                            -- NULL = unbegrenzt
  max_users      INTEGER,                            -- NULL = unbegrenzt
  features       JSONB NOT NULL DEFAULT '{}',        -- Feature-Flags
  highlight      BOOLEAN NOT NULL DEFAULT false,     -- "beliebt"
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_subscription (
  id             INTEGER PRIMARY KEY DEFAULT 1,
  plan_code      TEXT NOT NULL DEFAULT 'starter' REFERENCES public.pm_plans(code),
  billing_period TEXT NOT NULL DEFAULT 'monthly',    -- monthly | yearly
  status         TEXT NOT NULL DEFAULT 'trial',       -- trial | active | past_due | canceled
  trial_ends_at  TIMESTAMPTZ,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_sub CHECK (id = 1)
);

-- ---------------------------------------------------------------------
-- Pläne + Feature-Matrix
-- ---------------------------------------------------------------------
INSERT INTO public.pm_plans (code, name, sort_order, base_fee, price_per_unit, included_units, max_users, highlight, features) VALUES
  ('starter', 'Starter', 10, 0, 1.50, 25, 1, false, '{
      "properties": true, "tenants": true, "contracts": true, "finances": true,
      "documents": true, "contract_pdf": true,
      "accounting": false, "dunning": false, "utility_billing": false,
      "listings": false, "bank_sync": false, "ai_booking": false,
      "open_items": false, "api": false, "support": "email"
  }'),
  ('pro', 'Pro', 20, 49, 1.20, 250, 10, true, '{
      "properties": true, "tenants": true, "contracts": true, "finances": true,
      "documents": true, "contract_pdf": true,
      "accounting": true, "dunning": true, "utility_billing": true,
      "listings": true, "bank_sync": false, "ai_booking": false,
      "open_items": true, "api": false, "support": "priority"
  }'),
  ('enterprise', 'Enterprise', 30, 149, 0.90, NULL, NULL, false, '{
      "properties": true, "tenants": true, "contracts": true, "finances": true,
      "documents": true, "contract_pdf": true,
      "accounting": true, "dunning": true, "utility_billing": true,
      "listings": true, "bank_sync": true, "ai_booking": true,
      "open_items": true, "api": true, "support": "personal"
  }')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, base_fee = EXCLUDED.base_fee,
  price_per_unit = EXCLUDED.price_per_unit, included_units = EXCLUDED.included_units,
  max_users = EXCLUDED.max_users, highlight = EXCLUDED.highlight, features = EXCLUDED.features;

-- Abo initialisieren (Trial auf Pro für 30 Tage, damit alles testbar ist)
INSERT INTO public.pm_subscription (id, plan_code, status, trial_ends_at)
VALUES (1, 'pro', 'trial', now() + interval '30 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- RLS: Pläne sind öffentlich lesbar (für die Preis-Seite),
-- das Abo lesen alle Eingeloggten, ändern nur PM-Personal.
-- ---------------------------------------------------------------------
ALTER TABLE public.pm_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_subscription ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plans are public" ON public.pm_plans;
CREATE POLICY "Plans are public" ON public.pm_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Subscription readable" ON public.pm_subscription;
CREATE POLICY "Subscription readable" ON public.pm_subscription
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "PM staff manage subscription" ON public.pm_subscription;
CREATE POLICY "PM staff manage subscription" ON public.pm_subscription
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_pm_subscription_updated_at ON public.pm_subscription;
CREATE TRIGGER update_pm_subscription_updated_at
  BEFORE UPDATE ON public.pm_subscription
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
