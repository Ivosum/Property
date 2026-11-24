-- Anmeldeformular: Geburtsdatum + aktuelle Adresse mit erfassen
ALTER TABLE public.pm_portal_requests
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS current_address TEXT;
