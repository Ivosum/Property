-- Nebenkostenabrechnung erweitern: Periode, Verteilschlüssel, Flächenanteile,
-- Kostenaufstellung je Position. Alles additiv und nullable.

ALTER TABLE public.pm_utility_bills
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end   DATE,
  ADD COLUMN IF NOT EXISTS distribution TEXT NOT NULL DEFAULT 'area', -- 'area' | 'per_unit'
  ADD COLUMN IF NOT EXISTS cost_breakdown JSONB,  -- [{code,name,amount}]
  ADD COLUMN IF NOT EXISTS total_area_sqm NUMERIC(12,2);

ALTER TABLE public.pm_utility_bill_items
  ADD COLUMN IF NOT EXISTS unit_id      UUID REFERENCES public.pm_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_sqm     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS share_pct    NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS months       INTEGER;

-- RLS sicherstellen (falls die Tabellen noch keine PM-Policy haben)
ALTER TABLE public.pm_utility_bills      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_utility_bill_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PM staff manage utility bills" ON public.pm_utility_bills;
CREATE POLICY "PM staff manage utility bills" ON public.pm_utility_bills
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "PM staff manage utility bill items" ON public.pm_utility_bill_items;
CREATE POLICY "PM staff manage utility bill items" ON public.pm_utility_bill_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid()));

-- Mieter darf seine eigene Abrechnungsposition lesen
DROP POLICY IF EXISTS "Tenant reads own utility item" ON public.pm_utility_bill_items;
CREATE POLICY "Tenant reads own utility item" ON public.pm_utility_bill_items
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
  );
