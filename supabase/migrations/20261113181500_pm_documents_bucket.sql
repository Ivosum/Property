-- Storage-Bucket für Property-Management-Dokumente (z.B. automatisch erzeugte Mietverträge)
-- Folgt dem bestehenden PM-RLS-Muster (pm_user_roles).

INSERT INTO storage.buckets (id, name, public)
VALUES ('pm-documents', 'pm-documents', false)
ON CONFLICT (id) DO NOTHING;

-- PM-Team darf hochladen
DROP POLICY IF EXISTS "PM staff can upload pm documents" ON storage.objects;
CREATE POLICY "PM staff can upload pm documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pm-documents'
    AND EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

-- PM-Team darf sehen
DROP POLICY IF EXISTS "PM staff can view pm documents storage" ON storage.objects;
CREATE POLICY "PM staff can view pm documents storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pm-documents'
    AND EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

-- PM-Team darf löschen
DROP POLICY IF EXISTS "PM staff can delete pm documents storage" ON storage.objects;
CREATE POLICY "PM staff can delete pm documents storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pm-documents'
    AND EXISTS (SELECT 1 FROM public.pm_user_roles WHERE user_id = auth.uid())
  );

-- Mieter dürfen die zu ihnen gehörenden Dateien sehen
-- (Pfadkonvention: <tenant_id>/... als erster Ordner)
DROP POLICY IF EXISTS "Tenants can view own pm documents storage" ON storage.objects;
CREATE POLICY "Tenants can view own pm documents storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pm-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.pm_tenants WHERE user_id = auth.uid()
    )
  );
