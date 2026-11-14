-- WhatsApp-Gruppenlink je Liegenschaft (chat.whatsapp.com/...)
-- Ermöglicht in der Kommunikation den direkten Zugriff auf die Mieter-Gruppe.
ALTER TABLE public.pm_properties
  ADD COLUMN IF NOT EXISTS whatsapp_group_url TEXT;

COMMENT ON COLUMN public.pm_properties.whatsapp_group_url IS 'WhatsApp-Gruppen-Einladungslink (chat.whatsapp.com/...) für die Mieter dieser Liegenschaft';
