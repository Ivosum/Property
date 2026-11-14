-- Mieterportal: Lesezugriff des Mieters auf seine eigenen Mietverhältnis-Daten.
-- Rekursionssicher über SECURITY DEFINER Hilfsfunktionen (umgehen RLS).

CREATE OR REPLACE FUNCTION public.current_tenant_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id FROM public.pm_tenants WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_unit_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT c.unit_id FROM public.pm_contracts c
  WHERE c.tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_property_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT u.property_id FROM public.pm_units u
  WHERE u.id IN (
    SELECT c.unit_id FROM public.pm_contracts c
    WHERE c.tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
  );
$$;

-- Mieter sieht eigenen Datensatz
DROP POLICY IF EXISTS "Tenants can view own data" ON public.pm_tenants;
CREATE POLICY "Tenants can view own data" ON public.pm_tenants
  FOR SELECT USING (user_id = auth.uid());

-- Vertrag / Einheit / Liegenschaft / Zahlungen / Dokumente des Mieters
DROP POLICY IF EXISTS "Tenant reads own contract" ON public.pm_contracts;
CREATE POLICY "Tenant reads own contract" ON public.pm_contracts
  FOR SELECT USING (tenant_id IN (SELECT public.current_tenant_ids()));

ALTER TABLE public.pm_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant reads own unit" ON public.pm_units;
CREATE POLICY "Tenant reads own unit" ON public.pm_units
  FOR SELECT USING (id IN (SELECT public.current_tenant_unit_ids()));

DROP POLICY IF EXISTS "Tenant reads own property" ON public.pm_properties;
CREATE POLICY "Tenant reads own property" ON public.pm_properties
  FOR SELECT USING (id IN (SELECT public.current_tenant_property_ids()));

DROP POLICY IF EXISTS "Tenant reads own payments" ON public.pm_payments;
CREATE POLICY "Tenant reads own payments" ON public.pm_payments
  FOR SELECT USING (tenant_id IN (SELECT public.current_tenant_ids()));

DROP POLICY IF EXISTS "Tenant reads own documents" ON public.pm_documents;
CREATE POLICY "Tenant reads own documents" ON public.pm_documents
  FOR SELECT USING (tenant_id IN (SELECT public.current_tenant_ids()));

DROP POLICY IF EXISTS "Tenant reads own utility item" ON public.pm_utility_bill_items;
CREATE POLICY "Tenant reads own utility item" ON public.pm_utility_bill_items
  FOR SELECT USING (tenant_id IN (SELECT public.current_tenant_ids()));
