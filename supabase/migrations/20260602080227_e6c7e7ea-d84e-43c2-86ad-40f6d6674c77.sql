-- 1) customer_activity_log: remove self-insert allowance
DROP POLICY IF EXISTS "Admin and employees can insert activity" ON public.customer_activity_log;
CREATE POLICY "Admin and employees can insert activity"
  ON public.customer_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_employee(auth.uid()));

-- 2) pm_contracts: scope SELECT to assigned properties
DROP POLICY IF EXISTS "PM staff can view contracts" ON public.pm_contracts;
CREATE POLICY "PM staff can view assigned contracts"
  ON public.pm_contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_units u
      WHERE u.id = pm_contracts.unit_id
        AND public.has_property_access(auth.uid(), u.property_id)
    )
  );

-- 3) pm_payments: scope SELECT to assigned properties
DROP POLICY IF EXISTS "PM staff can view payments" ON public.pm_payments;
CREATE POLICY "PM staff can view assigned payments"
  ON public.pm_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.pm_contracts c
      JOIN public.pm_units u ON u.id = c.unit_id
      WHERE c.id = pm_payments.contract_id
        AND public.has_property_access(auth.uid(), u.property_id)
    )
  );

-- 4) pm_tenants: scope SELECT to tenants linked to assigned properties
DROP POLICY IF EXISTS "PM staff can view tenants" ON public.pm_tenants;
CREATE POLICY "PM staff can view assigned tenants"
  ON public.pm_tenants
  FOR SELECT
  USING (
    public.is_pm_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.pm_contracts c
      JOIN public.pm_units u ON u.id = c.unit_id
      WHERE c.tenant_id = pm_tenants.id
        AND public.has_property_access(auth.uid(), u.property_id)
    )
  );

-- 5) pm_utility_bill_items: scope SELECT to assigned properties
DROP POLICY IF EXISTS "PM staff can view utility bill items" ON public.pm_utility_bill_items;
CREATE POLICY "PM staff can view assigned utility bill items"
  ON public.pm_utility_bill_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.pm_utility_bills b
      WHERE b.id = pm_utility_bill_items.utility_bill_id
        AND public.has_property_access(auth.uid(), b.property_id)
    )
  );
