-- =====================================================
-- OFF-MARKET IMMOBILIEN SYSTEM - DATABASE SCHEMA
-- =====================================================

-- 1. Create Enum Types
CREATE TYPE public.app_role AS ENUM ('admin', 'buyer', 'seller', 'broker');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'submitted', 'verified', 'rejected');
CREATE TYPE public.property_status AS ENUM ('draft', 'pending_review', 'active', 'sold', 'withdrawn');
CREATE TYPE public.document_type AS ENUM ('kyc_id', 'kyc_proof_of_address', 'financial_proof', 'property_deed', 'floor_plan', 'energy_certificate', 'other');

-- 2. User Roles Table (Critical for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    kyc_status kyc_status NOT NULL DEFAULT 'pending',
    kyc_submitted_at TIMESTAMP WITH TIME ZONE,
    kyc_verified_at TIMESTAMP WITH TIME ZONE,
    financial_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Properties Table
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    broker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    property_type TEXT NOT NULL, -- apartment, house, commercial, land
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    canton TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Schweiz',
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CHF',
    living_area_sqm NUMERIC,
    plot_area_sqm NUMERIC,
    rooms NUMERIC,
    bathrooms INTEGER,
    year_built INTEGER,
    status property_status NOT NULL DEFAULT 'draft',
    is_off_market BOOLEAN NOT NULL DEFAULT TRUE,
    featured_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 5. Property Images Table
CREATE TABLE public.property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- 6. Documents Table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 7. Property Interests (Buyer Interest in Properties)
CREATE TABLE public.property_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (property_id, buyer_id)
);

ALTER TABLE public.property_interests ENABLE ROW LEVEL SECURITY;

-- 8. Messages Table for Chat
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 9. Buyer Preferences (for AI Matching)
CREATE TABLE public.buyer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    min_price NUMERIC,
    max_price NUMERIC,
    property_types TEXT[], -- array of preferred types
    preferred_cantons TEXT[],
    preferred_cities TEXT[],
    min_rooms NUMERIC,
    max_rooms NUMERIC,
    min_living_area NUMERIC,
    max_living_area NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_preferences ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- User Roles Policies
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins and brokers can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'broker')
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Properties Policies
CREATE POLICY "Active properties visible to verified buyers"
    ON public.properties FOR SELECT
    USING (
        status = 'active' AND (
            public.has_role(auth.uid(), 'buyer') OR
            public.has_role(auth.uid(), 'broker') OR
            public.has_role(auth.uid(), 'admin')
        )
    );

CREATE POLICY "Owners can view their own properties"
    ON public.properties FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "Brokers can view assigned properties"
    ON public.properties FOR SELECT
    USING (broker_id = auth.uid());

CREATE POLICY "Sellers can create properties"
    ON public.properties FOR INSERT
    WITH CHECK (
        auth.uid() = owner_id AND 
        public.has_role(auth.uid(), 'seller')
    );

CREATE POLICY "Owners can update their properties"
    ON public.properties FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Admins can manage all properties"
    ON public.properties FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Property Images Policies
CREATE POLICY "Property images visible with property"
    ON public.property_images FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = property_id
            AND (
                p.status = 'active' OR
                p.owner_id = auth.uid() OR
                p.broker_id = auth.uid() OR
                public.has_role(auth.uid(), 'admin')
            )
        )
    );

CREATE POLICY "Owners can manage property images"
    ON public.property_images FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = property_id
            AND p.owner_id = auth.uid()
        )
    );

-- Documents Policies
CREATE POLICY "Users can view their own documents"
    ON public.documents FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all documents"
    ON public.documents FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload their own documents"
    ON public.documents FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage documents"
    ON public.documents FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Property Interests Policies
CREATE POLICY "Buyers can create interests"
    ON public.property_interests FOR INSERT
    WITH CHECK (
        buyer_id = auth.uid() AND 
        public.has_role(auth.uid(), 'buyer')
    );

CREATE POLICY "Buyers can view their interests"
    ON public.property_interests FOR SELECT
    USING (buyer_id = auth.uid());

CREATE POLICY "Property owners can view interests"
    ON public.property_interests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = property_id
            AND (p.owner_id = auth.uid() OR p.broker_id = auth.uid())
        )
    );

CREATE POLICY "Admins can manage all interests"
    ON public.property_interests FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Messages Policies
CREATE POLICY "Users can view their messages"
    ON public.messages FOR SELECT
    USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their received messages (mark as read)"
    ON public.messages FOR UPDATE
    USING (receiver_id = auth.uid());

-- Buyer Preferences Policies
CREATE POLICY "Users can manage their own preferences"
    ON public.buyer_preferences FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all preferences"
    ON public.buyer_preferences FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buyer_preferences_updated_at
    BEFORE UPDATE ON public.buyer_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();