-- Create storage bucket for financing documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('financing-documents', 'financing-documents', false);

-- Allow authenticated users to upload their own financing documents
CREATE POLICY "Users can upload their own financing documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'financing-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own documents
CREATE POLICY "Users can view their own financing documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'financing-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins and brokers to view all financing documents
CREATE POLICY "Admins can view all financing documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'financing-documents' 
  AND (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'broker'::app_role)
  )
);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their own financing documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'financing-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);