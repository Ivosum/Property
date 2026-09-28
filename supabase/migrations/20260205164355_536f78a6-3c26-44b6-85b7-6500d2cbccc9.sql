-- Financing request types
CREATE TYPE public.financing_type AS ENUM ('mortgage', 'land', 'construction');
CREATE TYPE public.financing_status AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'completed');

-- Financing requests table
CREATE TABLE public.financing_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    request_number TEXT UNIQUE,
    financing_type financing_type NOT NULL,
    status financing_status NOT NULL DEFAULT 'draft',
    
    -- Common fields
    purchase_price NUMERIC,
    equity_amount NUMERIC,
    loan_amount NUMERIC,
    interest_rate NUMERIC,
    loan_term_years INTEGER,
    monthly_payment NUMERIC,
    annual_income NUMERIC,
    
    -- Property info
    property_address TEXT,
    property_city TEXT,
    property_canton TEXT,
    property_type TEXT,
    
    -- Calculation results (stored JSON for flexibility)
    calculation_data JSONB,
    
    -- Request details
    notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Financing documents table
CREATE TABLE public.financing_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    financing_request_id UUID NOT NULL REFERENCES public.financing_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Financing messages (chat) table
CREATE TABLE public.financing_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    financing_request_id UUID NOT NULL REFERENCES public.financing_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'staff', 'admin')),
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financing_messages ENABLE ROW LEVEL SECURITY;

-- Generate request number function
CREATE OR REPLACE FUNCTION public.generate_financing_request_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.request_number := 'FIN-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('financing_request_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE SEQUENCE IF NOT EXISTS financing_request_seq START 1;

CREATE TRIGGER set_financing_request_number
    BEFORE INSERT ON public.financing_requests
    FOR EACH ROW
    WHEN (NEW.request_number IS NULL)
    EXECUTE FUNCTION public.generate_financing_request_number();

-- Updated_at trigger
CREATE TRIGGER update_financing_requests_updated_at
    BEFORE UPDATE ON public.financing_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for financing_requests
CREATE POLICY "Users can view their own requests"
    ON public.financing_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
    ON public.financing_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft requests"
    ON public.financing_requests FOR UPDATE
    USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Admins and brokers can view all requests"
    ON public.financing_requests FOR SELECT
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'broker'));

CREATE POLICY "Admins and brokers can update requests"
    ON public.financing_requests FOR UPDATE
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'broker'));

-- RLS Policies for financing_documents
CREATE POLICY "Users can view their own documents"
    ON public.financing_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own documents"
    ON public.financing_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and brokers can view all documents"
    ON public.financing_documents FOR SELECT
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'broker'));

-- RLS Policies for financing_messages
CREATE POLICY "Users can view messages for their requests"
    ON public.financing_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.financing_requests fr
            WHERE fr.id = financing_request_id AND fr.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages for their requests"
    ON public.financing_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.financing_requests fr
            WHERE fr.id = financing_request_id AND fr.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view all messages"
    ON public.financing_messages FOR SELECT
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'broker'));

CREATE POLICY "Staff can send messages"
    ON public.financing_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'broker'))
    );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.financing_messages;