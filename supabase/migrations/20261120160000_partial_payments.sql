-- =====================================================================
-- Teil-/Über-/Sammelzahlungen im Zahlungsabgleich
-- ---------------------------------------------------------------------
-- paid_amount: bereits eingegangener Betrag je Zahlung (für Teilzahlungen).
--   status bleibt 'pending'/'overdue' solange paid_amount < amount,
--   wird 'paid' sobald der Betrag gedeckt ist.
-- pm_credits: Guthaben eines Mieters aus Überzahlungen, zur Verrechnung.
-- =====================================================================

ALTER TABLE public.pm_payments
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Mieter-Guthaben (Überzahlungen)
CREATE TABLE IF NOT EXISTS public.pm_credits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
  property_id   UUID REFERENCES public.pm_properties(id) ON DELETE SET NULL,
  amount        NUMERIC(14,2) NOT NULL,        -- positives Guthaben
  source        TEXT NOT NULL DEFAULT 'overpayment',
  bank_entry_id UUID REFERENCES public.pm_bank_entries(id) ON DELETE SET NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_credits_tenant ON public.pm_credits(tenant_id);

-- ---------------------------------------------------------------------
-- Zahlungseingang auf eine Zahlung anrechnen. Erhöht paid_amount,
-- setzt status auf 'paid' sobald gedeckt. Gibt den noch nicht
-- angerechneten Rest (Überzahlung) zurück.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pm_apply_payment(p_payment_id UUID, p_amount NUMERIC, p_date DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay    RECORD;
  v_open   NUMERIC;
  v_use    NUMERIC;
  v_rest   NUMERIC;
BEGIN
  SELECT * INTO v_pay FROM public.pm_payments WHERE id = p_payment_id;
  IF v_pay.id IS NULL THEN RETURN p_amount; END IF;

  v_open := (v_pay.amount + COALESCE(v_pay.reminder_fees,0)) - COALESCE(v_pay.paid_amount,0);
  IF v_open <= 0 THEN RETURN p_amount; END IF;

  v_use  := LEAST(p_amount, v_open);
  v_rest := p_amount - v_use;

  UPDATE public.pm_payments
     SET paid_amount = COALESCE(paid_amount,0) + v_use,
         status = CASE WHEN COALESCE(paid_amount,0) + v_use >= (amount + COALESCE(reminder_fees,0)) THEN 'paid'::payment_status ELSE status END,
         paid_date = CASE WHEN COALESCE(paid_amount,0) + v_use >= (amount + COALESCE(reminder_fees,0)) THEN p_date ELSE paid_date END,
         updated_at = now()
   WHERE id = p_payment_id;

  RETURN v_rest;
END;
$$;

ALTER TABLE public.pm_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "PM staff manage credits" ON public.pm_credits;
CREATE POLICY "PM staff manage credits" ON public.pm_credits
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));
