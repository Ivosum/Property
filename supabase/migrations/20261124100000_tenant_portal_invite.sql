-- Mieter-Portalzugang: Einladungsstatus auf pm_tenants
ALTER TABLE public.pm_tenants
  ADD COLUMN IF NOT EXISTS portal_invited_at TIMESTAMPTZ;

-- Abgeleiteter Status für die Verwaltungs-Oberfläche:
--   'active'   -> Mieter hat ein Konto (user_id gesetzt) und sich schon eingeloggt
--   'invited'  -> eingeladen, Konto verknüpft, aber noch kein Login
--   'none'     -> noch kein Portalzugang
-- (Login-Zeitpunkt kommt aus auth.users.last_sign_in_at; wir spiegeln ihn
--  nicht, sondern berechnen den Status in der App aus user_id + invited_at.)

COMMENT ON COLUMN public.pm_tenants.portal_invited_at IS
  'Zeitpunkt der letzten Portal-Einladung (Mieterportal).';
