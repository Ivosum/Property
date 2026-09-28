-- Fix the overly permissive INSERT policy on customer_activity_log
DROP POLICY "System can insert activity" ON public.customer_activity_log;

-- Only admins, employees, and the customer themselves can log activity
CREATE POLICY "Admin and employees can insert activity"
ON public.customer_activity_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_employee(auth.uid()) OR customer_user_id = auth.uid());