-- Hauswart / Abwart pro Liegenschaft (wird im Mieterportal als Kontakt angezeigt).
-- Das Lesen durch Mieter ist bereits durch die bestehende Policy
-- "Tenant reads own property" abgedeckt.
ALTER TABLE public.pm_properties
  ADD COLUMN IF NOT EXISTS caretaker_name  TEXT,
  ADD COLUMN IF NOT EXISTS caretaker_phone TEXT,
  ADD COLUMN IF NOT EXISTS caretaker_email TEXT;
