-- broker_referral_id: für den Kunden nach dem ersten Setzen nicht mehr änderbar.
-- Nur ein Admin darf sie nachträglich korrigieren. Das erste Setzen (NULL -> Wert,
-- z.B. bei der Registrierung über einen Makler-QR) bleibt erlaubt.
CREATE OR REPLACE FUNCTION public.protect_broker_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.broker_referral_id IS DISTINCT FROM OLD.broker_referral_id THEN
    -- Admins dürfen immer ändern
    IF public.has_role(auth.uid(), 'admin') THEN
      RETURN NEW;
    END IF;
    -- Erstes Setzen (war NULL) ist erlaubt; jede weitere Änderung nicht.
    IF OLD.broker_referral_id IS NOT NULL THEN
      RAISE EXCEPTION 'Die Makler-Zuordnung kann nicht geändert werden.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_broker_referral ON public.profiles;
CREATE TRIGGER trg_protect_broker_referral
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_broker_referral();
