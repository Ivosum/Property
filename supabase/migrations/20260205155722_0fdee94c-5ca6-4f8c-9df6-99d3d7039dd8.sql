-- =============================================
-- PROPERTY MANAGEMENT SYSTEM - DATABASE SCHEMA
-- =============================================

-- 1. ENUM TYPES
-- =============================================

-- Property Management Roles
CREATE TYPE public.pm_role AS ENUM ('pm_admin', 'pm_manager', 'pm_employee');

-- Contract Status
CREATE TYPE public.contract_status AS ENUM ('draft', 'active', 'terminated', 'expired');

-- Payment Status
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Defect Status
CREATE TYPE public.defect_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Defect Priority
CREATE TYPE public.defect_priority AS ENUM ('low', 'normal', 'urgent');

-- Unit Status
CREATE TYPE public.unit_status AS ENUM ('vacant', 'occupied', 'maintenance', 'reserved');

-- Listing Status
CREATE TYPE public.listing_status AS ENUM ('draft', 'active', 'paused', 'rented');

-- 2. PROPERTY MANAGEMENT USER ROLES
-- =============================================
CREATE TABLE public.pm_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role pm_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, role)
);

ALTER TABLE public.pm_user_roles ENABLE ROW LEVEL SECURITY;

-- 3. PROPERTIES (Buildings/Liegenschaften)
-- =============================================
CREATE TABLE public.pm_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    canton TEXT NOT NULL,
    country TEXT DEFAULT 'Schweiz' NOT NULL,
    property_type TEXT NOT NULL, -- 'Mehrfamilienhaus', 'Geschäftshaus', etc.
    year_built INTEGER,
    total_units INTEGER DEFAULT 0,
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_properties ENABLE ROW LEVEL SECURITY;

-- 4. PROPERTY ASSIGNMENTS (assign managers/employees to properties)
-- =============================================
CREATE TABLE public.pm_property_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.pm_properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role pm_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(property_id, user_id)
);

ALTER TABLE public.pm_property_assignments ENABLE ROW LEVEL SECURITY;

-- 5. UNITS (Mieteinheiten)
-- =============================================
CREATE TABLE public.pm_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.pm_properties(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL, -- e.g., "2.OG links", "EG", "3.OG rechts"
    floor INTEGER,
    rooms NUMERIC(3,1), -- e.g., 3.5
    living_area_sqm NUMERIC(10,2),
    balcony_area_sqm NUMERIC(10,2),
    has_parking BOOLEAN DEFAULT false,
    has_storage BOOLEAN DEFAULT false,
    base_rent NUMERIC(10,2) NOT NULL, -- Nettomiete
    utilities_advance NUMERIC(10,2) DEFAULT 0, -- Nebenkosten-Akonto
    status unit_status DEFAULT 'vacant' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_units ENABLE ROW LEVEL SECURITY;

-- 6. TENANTS (Mieter)
-- =============================================
CREATE TABLE public.pm_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- optional, for logged-in tenants
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    nationality TEXT,
    employer TEXT,
    monthly_income NUMERIC(10,2),
    access_token TEXT UNIQUE, -- for link-based portal access
    token_expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_tenants ENABLE ROW LEVEL SECURITY;

-- 7. CONTRACTS (Mietverträge)
-- =============================================
CREATE TABLE public.pm_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.pm_units(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
    contract_number TEXT,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = unbefristet
    notice_period_months INTEGER DEFAULT 3,
    base_rent NUMERIC(10,2) NOT NULL,
    utilities_advance NUMERIC(10,2) DEFAULT 0,
    deposit_amount NUMERIC(10,2),
    deposit_paid BOOLEAN DEFAULT false,
    status contract_status DEFAULT 'draft' NOT NULL,
    termination_date DATE,
    termination_reason TEXT,
    document_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_contracts ENABLE ROW LEVEL SECURITY;

-- 8. PAYMENTS (Zahlungen)
-- =============================================
CREATE TABLE public.pm_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.pm_contracts(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_type TEXT NOT NULL, -- 'rent', 'utilities', 'deposit', 'other'
    due_date DATE NOT NULL,
    paid_date DATE,
    status payment_status DEFAULT 'pending' NOT NULL,
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_payments ENABLE ROW LEVEL SECURITY;

-- 9. DEFECTS (Mängelmeldungen)
-- =============================================
CREATE TABLE public.pm_defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.pm_units(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.pm_tenants(id) ON DELETE SET NULL,
    reported_by_name TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority defect_priority DEFAULT 'normal' NOT NULL,
    status defect_status DEFAULT 'open' NOT NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    cost NUMERIC(10,2),
    images TEXT[], -- array of image URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_defects ENABLE ROW LEVEL SECURITY;

-- 10. DOCUMENTS (Dokumente)
-- =============================================
CREATE TABLE public.pm_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.pm_properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.pm_units(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.pm_contracts(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'contract', 'utility_bill', 'handover_protocol', 'correspondence', 'other'
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_documents ENABLE ROW LEVEL SECURITY;

-- 11. UTILITY BILLING (Nebenkostenabrechnungen)
-- =============================================
CREATE TABLE public.pm_utility_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.pm_properties(id) ON DELETE CASCADE,
    billing_year INTEGER NOT NULL,
    total_costs NUMERIC(12,2) NOT NULL,
    status TEXT DEFAULT 'draft' NOT NULL, -- 'draft', 'calculated', 'sent', 'completed'
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_utility_bills ENABLE ROW LEVEL SECURITY;

-- Individual tenant utility bill items
CREATE TABLE public.pm_utility_bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utility_bill_id UUID NOT NULL REFERENCES public.pm_utility_bills(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.pm_contracts(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
    total_advance_paid NUMERIC(10,2) DEFAULT 0,
    calculated_costs NUMERIC(10,2) NOT NULL,
    balance NUMERIC(10,2) NOT NULL, -- positive = tenant owes, negative = refund
    sent_at TIMESTAMP WITH TIME ZONE,
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_utility_bill_items ENABLE ROW LEVEL SECURITY;

-- 12. LISTINGS (Inserate)
-- =============================================
CREATE TABLE public.pm_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.pm_units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    rent_display NUMERIC(10,2) NOT NULL,
    available_from DATE,
    status listing_status DEFAULT 'draft' NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    views_count INTEGER DEFAULT 0,
    images TEXT[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_listings ENABLE ROW LEVEL SECURITY;

-- 13. LISTING APPLICATIONS (Bewerbungen)
-- =============================================
CREATE TABLE public.pm_listing_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.pm_listings(id) ON DELETE CASCADE,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    applicant_phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'new' NOT NULL, -- 'new', 'reviewing', 'accepted', 'rejected'
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_listing_applications ENABLE ROW LEVEL SECURITY;

-- 14. MESSAGES (Nachrichten)
-- =============================================
CREATE TABLE public.pm_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_tenant_id UUID REFERENCES public.pm_tenants(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recipient_tenant_id UUID REFERENCES public.pm_tenants(id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.pm_properties(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES public.pm_units(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pm_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Check if user has PM role
CREATE OR REPLACE FUNCTION public.has_pm_role(_user_id UUID, _role pm_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.pm_user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Check if user is PM admin
CREATE OR REPLACE FUNCTION public.is_pm_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.pm_user_roles
        WHERE user_id = _user_id
          AND role = 'pm_admin'
    )
$$;

-- Check if user has access to property (via assignment or admin)
CREATE OR REPLACE FUNCTION public.has_property_access(_user_id UUID, _property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.pm_user_roles WHERE user_id = _user_id AND role = 'pm_admin'
    ) OR EXISTS (
        SELECT 1 FROM public.pm_property_assignments 
        WHERE user_id = _user_id AND property_id = _property_id
    )
$$;

-- Generate access token for tenant portal
CREATE OR REPLACE FUNCTION public.generate_tenant_access_token(_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_token TEXT;
BEGIN
    new_token := encode(gen_random_bytes(32), 'hex');
    UPDATE public.pm_tenants 
    SET access_token = new_token,
        token_expires_at = now() + interval '30 days'
    WHERE id = _tenant_id;
    RETURN new_token;
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- PM User Roles
CREATE POLICY "Admins can manage PM roles" ON public.pm_user_roles
    FOR ALL USING (public.is_pm_admin(auth.uid()));

CREATE POLICY "Users can view their own PM roles" ON public.pm_user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Properties
CREATE POLICY "PM Admins can manage all properties" ON public.pm_properties
    FOR ALL USING (public.is_pm_admin(auth.uid()));

CREATE POLICY "Assigned users can view properties" ON public.pm_properties
    FOR SELECT USING (public.has_property_access(auth.uid(), id));

-- Property Assignments
CREATE POLICY "PM Admins can manage assignments" ON public.pm_property_assignments
    FOR ALL USING (public.is_pm_admin(auth.uid()));

CREATE POLICY "Users can view their assignments" ON public.pm_property_assignments
    FOR SELECT USING (auth.uid() = user_id);

-- Units
CREATE POLICY "Users with property access can view units" ON public.pm_units
    FOR SELECT USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "PM Admins can manage units" ON public.pm_units
    FOR ALL USING (public.is_pm_admin(auth.uid()));

CREATE POLICY "Assigned managers can manage units" ON public.pm_units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pm_property_assignments pa
            WHERE pa.property_id = pm_units.property_id
              AND pa.user_id = auth.uid()
              AND pa.role IN ('pm_admin', 'pm_manager')
        )
    );

-- Tenants (sensitive - restricted access)
CREATE POLICY "PM staff can view tenants" ON public.pm_tenants
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "PM Admins and managers can manage tenants" ON public.pm_tenants
    FOR ALL USING (
        public.is_pm_admin(auth.uid()) OR 
        public.has_pm_role(auth.uid(), 'pm_manager')
    );

-- Tenants can view their own data via user_id
CREATE POLICY "Tenants can view own data" ON public.pm_tenants
    FOR SELECT USING (auth.uid() = user_id);

-- Contracts
CREATE POLICY "PM staff can view contracts" ON public.pm_contracts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "PM Admins and managers can manage contracts" ON public.pm_contracts
    FOR ALL USING (
        public.is_pm_admin(auth.uid()) OR 
        public.has_pm_role(auth.uid(), 'pm_manager')
    );

-- Payments
CREATE POLICY "PM staff can view payments" ON public.pm_payments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "PM Admins and managers can manage payments" ON public.pm_payments
    FOR ALL USING (
        public.is_pm_admin(auth.uid()) OR 
        public.has_pm_role(auth.uid(), 'pm_manager')
    );

-- Defects
CREATE POLICY "PM staff can view defects" ON public.pm_defects
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "PM staff can manage defects" ON public.pm_defects
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

-- Allow tenants to create defects for their units
CREATE POLICY "Tenants can create defects" ON public.pm_defects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pm_contracts c
            JOIN public.pm_tenants t ON c.tenant_id = t.id
            WHERE c.unit_id = pm_defects.unit_id
              AND t.user_id = auth.uid()
              AND c.status = 'active'
        )
    );

-- Documents
CREATE POLICY "PM staff can view documents" ON public.pm_documents
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "PM staff can manage documents" ON public.pm_documents
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

-- Utility Bills
CREATE POLICY "PM staff can view utility bills" ON public.pm_utility_bills
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "PM Admins and managers can manage utility bills" ON public.pm_utility_bills
    FOR ALL USING (
        public.is_pm_admin(auth.uid()) OR 
        public.has_pm_role(auth.uid(), 'pm_manager')
    );

CREATE POLICY "PM staff can view utility bill items" ON public.pm_utility_bill_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "PM Admins and managers can manage utility bill items" ON public.pm_utility_bill_items
    FOR ALL USING (
        public.is_pm_admin(auth.uid()) OR 
        public.has_pm_role(auth.uid(), 'pm_manager')
    );

-- Listings
CREATE POLICY "PM staff can view listings" ON public.pm_listings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "PM staff can manage listings" ON public.pm_listings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

-- Active listings are public for viewing
CREATE POLICY "Public can view active listings" ON public.pm_listings
    FOR SELECT USING (status = 'active');

-- Listing Applications
CREATE POLICY "PM staff can view applications" ON public.pm_listing_applications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "PM staff can manage applications" ON public.pm_listing_applications
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

-- Anyone can submit applications to active listings
CREATE POLICY "Anyone can apply to active listings" ON public.pm_listing_applications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pm_listings l
            WHERE l.id = listing_id AND l.status = 'active'
        )
    );

-- Messages
CREATE POLICY "Users can view their messages" ON public.pm_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = recipient_id
    );

CREATE POLICY "Users can send messages" ON public.pm_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "PM staff can view all property messages" ON public.pm_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
    );

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

CREATE TRIGGER update_pm_properties_updated_at
    BEFORE UPDATE ON public.pm_properties
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pm_units_updated_at
    BEFORE UPDATE ON public.pm_units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pm_tenants_updated_at
    BEFORE UPDATE ON public.pm_tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pm_contracts_updated_at
    BEFORE UPDATE ON public.pm_contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pm_payments_updated_at
    BEFORE UPDATE ON public.pm_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pm_defects_updated_at
    BEFORE UPDATE ON public.pm_defects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pm_utility_bills_updated_at
    BEFORE UPDATE ON public.pm_utility_bills
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pm_listings_updated_at
    BEFORE UPDATE ON public.pm_listings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();