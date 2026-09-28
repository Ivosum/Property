-- Admin employee system for Off-Market platform
-- New role type for admin employees
CREATE TYPE public.admin_employee_role AS ENUM ('admin_manager', 'admin_employee');

-- Admin employees table (staff working for the admin)
CREATE TABLE public.admin_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    role admin_employee_role NOT NULL DEFAULT 'admin_employee',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    can_manage_users BOOLEAN DEFAULT false,
    can_verify_documents BOOLEAN DEFAULT true,
    can_view_financials BOOLEAN DEFAULT false,
    can_manage_properties BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer assignments (which employee handles which customer)
CREATE TABLE public.customer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id UUID NOT NULL,
    assigned_employee_id UUID REFERENCES public.admin_employees(id) ON DELETE SET NULL,
    assigned_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(customer_user_id)
);

-- Activity log to track what customers do (for CRM overview)
CREATE TABLE public.customer_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id UUID NOT NULL,
    activity_type TEXT NOT NULL, -- 'registration', 'document_upload', 'property_listed', 'interest_shown', etc.
    activity_description TEXT,
    related_entity_type TEXT, -- 'document', 'property', 'message', etc.
    related_entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_activity_log ENABLE ROW LEVEL SECURITY;

-- Function to check if user is admin or admin employee
CREATE OR REPLACE FUNCTION public.is_admin_or_employee(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
    ) OR EXISTS (
        SELECT 1 FROM public.admin_employees WHERE user_id = _user_id AND is_active = true
    )
$$;

-- Function to check if employee has specific permission
CREATE OR REPLACE FUNCTION public.employee_has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        CASE 
            -- Admin has all permissions
            WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN true
            WHEN _permission = 'manage_users' THEN (SELECT can_manage_users FROM public.admin_employees WHERE user_id = _user_id AND is_active = true)
            WHEN _permission = 'verify_documents' THEN (SELECT can_verify_documents FROM public.admin_employees WHERE user_id = _user_id AND is_active = true)
            WHEN _permission = 'view_financials' THEN (SELECT can_view_financials FROM public.admin_employees WHERE user_id = _user_id AND is_active = true)
            WHEN _permission = 'manage_properties' THEN (SELECT can_manage_properties FROM public.admin_employees WHERE user_id = _user_id AND is_active = true)
            ELSE false
        END
$$;

-- RLS Policies for admin_employees (only main admin can manage)
CREATE POLICY "Admins can view all employees"
ON public.admin_employees FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view themselves"
ON public.admin_employees FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only main admin can insert employees"
ON public.admin_employees FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only main admin can update employees"
ON public.admin_employees FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only main admin can delete employees"
ON public.admin_employees FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for customer_assignments
CREATE POLICY "Admins and employees can view assignments"
ON public.customer_assignments FOR SELECT
TO authenticated
USING (public.is_admin_or_employee(auth.uid()));

CREATE POLICY "Only admins can manage assignments"
ON public.customer_assignments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for activity log
CREATE POLICY "Admins and employees can view activity"
ON public.customer_activity_log FOR SELECT
TO authenticated
USING (public.is_admin_or_employee(auth.uid()));

CREATE POLICY "System can insert activity"
ON public.customer_activity_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_admin_employees_updated_at
BEFORE UPDATE ON public.admin_employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_assignments_updated_at
BEFORE UPDATE ON public.customer_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_customer_assignments_employee ON public.customer_assignments(assigned_employee_id);
CREATE INDEX idx_customer_activity_user ON public.customer_activity_log(customer_user_id);
CREATE INDEX idx_customer_activity_type ON public.customer_activity_log(activity_type);